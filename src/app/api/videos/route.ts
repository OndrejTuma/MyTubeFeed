import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import clientPromise from '@/lib/mongodb';
import { google } from 'googleapis';
import { authOptions } from '@/lib/auth';

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
  headers: {
    'Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
  },
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db();
    const channels = await db
      .collection('channels')
      .find({ userId: session.user.id })
      .toArray();

    if (channels.length === 0) {
      return NextResponse.json([]);
    }

    const channelIds = channels.map((channel) => channel.id);
    const videos = [];

    // Fetch videos for each channel
    for (const channelId of channelIds) {
      const response = await youtube.search.list({
        part: ['snippet'],
        channelId,
        maxResults: 10,
        order: 'date',
        type: ['video'],
      });

      const channelVideos = response.data.items?.map((item) => ({
        id: item.id?.videoId,
        title: item.snippet?.title,
        thumbnailUrl: item.snippet?.thumbnails?.high?.url,
        channelTitle: item.snippet?.channelTitle,
        channelId: item.snippet?.channelId,
        publishedAt: item.snippet?.publishedAt,
      })) || [];

      videos.push(...channelVideos);
    }

    // Sort videos by published date
    videos.sort((a, b) => 
      new Date(b.publishedAt!).getTime() - new Date(a.publishedAt!).getTime()
    );

    return NextResponse.json(videos);
  } catch (error) {
    console.error('Error fetching videos:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 