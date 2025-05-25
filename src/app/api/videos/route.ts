import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import clientPromise from '@/lib/mongodb';
import { google } from 'googleapis';
import { authOptions } from '@/lib/auth';

const CACHE_DURATION = 1000 * 60 * 60; // 1 hour in milliseconds

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
  headers: {
    'Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
  },
});

interface Video {
  id: string;
  title: string;
  thumbnailUrl: string;
  publishedAt: string;
  channelTitle: string;
  channelId: string;
}

interface YouTubeError {
  code?: number;
  message?: string;
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const pageToken = searchParams.get('pageToken') || '';
    const channelId = searchParams.get('channelId');

    const client = await clientPromise;
    const db = client.db();
    const channels = await db
      .collection('channels')
      .find({ userId: session.user.id })
      .toArray();

    const channelIds = channelId ? [channelId] : channels.map(channel => channel.id);
    const videos: Video[] = [];

    try {
      // Try to fetch from YouTube API first
      const response = await youtube.search.list({
        part: ['snippet'],
        channelId: channelIds.join(','),
        order: 'date',
        type: ['video'],
        maxResults: 50,
        pageToken: pageToken || undefined,
      });

      const channelVideos = response.data.items
        ?.map(item => ({
          id: item.id?.videoId,
          title: item.snippet?.title,
          thumbnailUrl: item.snippet?.thumbnails?.high?.url,
          publishedAt: item.snippet?.publishedAt,
          channelTitle: item.snippet?.channelTitle,
          channelId: item.snippet?.channelId,
        }))
        .filter((video): video is Video => 
          !!video.id && 
          !!video.title && 
          !!video.thumbnailUrl && 
          !!video.publishedAt && 
          !!video.channelTitle && 
          !!video.channelId
        ) || [];

      // Cache the videos
      await db.collection('cached_videos').updateMany(
        { channelId: { $in: channelIds } },
        { $set: { 
          videos: channelVideos,
          lastUpdated: new Date(),
          pageToken,
          nextPageToken: response.data.nextPageToken,
          prevPageToken: response.data.prevPageToken
        }},
        { upsert: true }
      );

      videos.push(...channelVideos);

      return NextResponse.json({
        videos,
        nextPageToken: response.data.nextPageToken || null,
        prevPageToken: response.data.prevPageToken || null,
      });
    } catch (error: unknown) {
      // Check if it's a quota exceeded error
      const isQuotaExceeded = error instanceof Error && 
        (error.message.includes('quota') || 
         error.message.includes('quotaExceeded') ||
         (error as any)?.errors?.[0]?.reason === 'quotaExceeded');

      if (isQuotaExceeded) {
        console.log('YouTube API quota exceeded, falling back to cached videos');
        
        const cachedData = await db.collection('cached_videos').findOne({
          channelId: { $in: channelIds },
          lastUpdated: { $gte: new Date(Date.now() - CACHE_DURATION) }
        });

        return NextResponse.json({
          videos: cachedData?.videos ?? [],
          nextPageToken: cachedData?.nextPageToken ?? null,
          prevPageToken: cachedData?.prevPageToken ?? null,
          isCached: true
        });
      }

      // For other errors or if no cache is available
      console.error('Error fetching videos:', error);
      return NextResponse.json(
        { error: 'Error fetching videos' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in videos API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 