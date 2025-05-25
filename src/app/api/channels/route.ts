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

async function resolveChannelId(url: string): Promise<string | null> {
  try {
    const urlObj = new URL(url);
    
    // Handle different URL formats
    if (urlObj.pathname.startsWith('/channel/')) {
      return urlObj.pathname.split('/')[2];
    }
    
    // Handle custom URLs (@username or /c/username)
    if (urlObj.pathname.startsWith('/c/') || urlObj.pathname.startsWith('/@')) {
      const handle = urlObj.pathname.slice(1); // Remove leading slash
      console.log('Resolving handle:', handle);
      
      // First try to get channel by handle
      const response = await youtube.search.list({
        part: ['snippet'],
        q: handle,
        type: ['channel'],
        maxResults: 1
      });

      if (response.data.items?.[0]?.snippet?.channelId) {
        return response.data.items[0].snippet.channelId;
      }
      
      return null;
    }
    
    // Handle youtu.be URLs
    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.slice(1);
    }
    
    // Handle youtube.com/watch URLs
    if (urlObj.pathname === '/watch') {
      const videoId = urlObj.searchParams.get('v');
      if (videoId) {
        // Get channel ID from video
        const videoResponse = await youtube.videos.list({
          part: ['snippet'],
          id: [videoId]
        });
        
        return videoResponse.data.items?.[0]?.snippet?.channelId || null;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error resolving channel ID:', error);
    return null;
  }
}

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

    return NextResponse.json(channels);
  } catch (error) {
    console.error('Error fetching channels:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(request: Request) {
  console.log('POST request received to /api/channels');
  
  try {
    const session = await getServerSession(authOptions);
    console.log('Session:', session);
    
    if (!session?.user) {
      console.log('No session or user found');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    console.log('Request body:', body);
    
    const { channelUrl } = body;
    if (!channelUrl) {
      console.log('No channelUrl provided');
      return new NextResponse('Channel URL is required', { status: 400 });
    }

    // Extract channel ID from URL
    const channelId = await resolveChannelId(channelUrl);
    if (!channelId) {
      console.log('Invalid channel URL:', channelUrl);
      return new NextResponse('Invalid channel URL format', { status: 400 });
    }

    console.log('Fetching channel details for ID:', channelId);
    
    // Fetch channel details from YouTube API
    const response = await youtube.channels.list({
      part: ['snippet'],
      id: [channelId],
    });

    console.log('YouTube API response:', response.data);

    const channelData = response.data.items?.[0];
    if (!channelData) {
      console.log('Channel not found in YouTube API response');
      return new NextResponse('Channel not found', { status: 404 });
    }

    const channel = {
      id: channelData.id,
      title: channelData.snippet?.title,
      thumbnailUrl: channelData.snippet?.thumbnails?.default?.url,
      userId: session.user.id,
    };

    console.log('Saving channel to database:', channel);

    const client = await clientPromise;
    const db = client.db();
    await db.collection('channels').insertOne(channel);

    return NextResponse.json(channel);
  } catch (error) {
    console.error('Error adding channel:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 