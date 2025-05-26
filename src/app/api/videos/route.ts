import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import clientPromise from '@/lib/mongodb';
import { google } from 'googleapis';
import { authOptions } from '@/lib/auth';

const CACHE_DURATION = parseInt(process.env.VIDEO_CACHE_DURATION || '3600000'); // Default to 1 hour (3600000 ms)
const VIDEOS_PER_PAGE = parseInt(process.env.VIDEOS_PER_PAGE || '12');

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
  errors?: Array<{
    domain?: string;
    reason?: string;
    message?: string;
  }>;
  message?: string;
}

function isQuotaExceededError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('quota') || error.message.includes('quotaExceeded');
  }
  
  const youtubeError = error as YouTubeError;
  return youtubeError?.errors?.[0]?.reason === 'quotaExceeded';
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

    if (!channelId) {
      return NextResponse.json(
        { error: 'Channel ID is required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();
    const channel = await db
      .collection('channels')
      .findOne({ userId: session.user.id, id: channelId });

    if (!channel) {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      );
    }

    // First, try to get videos from cache
    const cachedData = await db.collection('cached_videos').findOne({
      channelId,
      pageToken: pageToken || null,
      lastUpdated: { $gte: new Date(Date.now() - CACHE_DURATION) }
    });

    // If we have valid cached data, return it
    if (cachedData) {
      return NextResponse.json({
        videos: cachedData.videos.slice(0, VIDEOS_PER_PAGE),
        nextPageToken: cachedData.nextPageToken,
        prevPageToken: cachedData.prevPageToken,
        isCached: true
      });
    }

    // If no valid cache exists, fetch from YouTube API
    try {
      const response = await youtube.search.list({
        part: ['snippet'],
        channelId,
        order: 'date',
        type: ['video'],
        maxResults: VIDEOS_PER_PAGE,
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

      // Cache the videos with the current page token
      await db.collection('cached_videos').updateOne(
        { 
          channelId,
          pageToken: pageToken || null
        },
        { $set: { 
          videos: channelVideos,
          lastUpdated: new Date(),
          nextPageToken: response.data.nextPageToken,
          prevPageToken: response.data.prevPageToken
        }},
        { upsert: true }
      );

      return NextResponse.json({
        videos: channelVideos,
        nextPageToken: response.data.nextPageToken || null,
        prevPageToken: response.data.prevPageToken || null,
        isCached: false
      });
    } catch (error: unknown) {
      if (isQuotaExceededError(error)) {
        console.log('YouTube API quota exceeded, trying to get any cached data');
        
        // Try to get any cached data for this channel, even if it's expired
        const anyCachedData = await db.collection('cached_videos').findOne({
          channelId,
          pageToken: pageToken || null
        });

        if (anyCachedData) {
          return NextResponse.json({
            videos: anyCachedData.videos.slice(0, VIDEOS_PER_PAGE),
            nextPageToken: anyCachedData.nextPageToken,
            prevPageToken: anyCachedData.prevPageToken,
            isCached: true,
            isExpired: true
          });
        }
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