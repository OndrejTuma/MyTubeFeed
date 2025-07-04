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
    console.log('Processing URL:', url);
    
    // Handle different URL formats
    if (urlObj.pathname.startsWith('/channel/')) {
      const channelId = urlObj.pathname.split('/')[2];
      console.log('Found channel ID in path:', channelId);
      return channelId;
    }
    
    // Handle custom URLs (@username or /c/username)
    if (urlObj.pathname.startsWith('/c/') || urlObj.pathname.startsWith('/@')) {
      const handle = urlObj.pathname.slice(1); // Remove leading slash
      console.log('Processing handle:', handle);
      
      // Try to get channel directly by handle
      const response = await youtube.channels.list({
        part: ['snippet'],
        forHandle: handle.startsWith('@') ? handle.slice(1) : handle
      });

      console.log('Channel lookup response:', response.data);

      if (response.data.items && response.data.items.length > 0) {
        const channelId = response.data.items[0].id;
        if (channelId) {
          console.log('Found channel ID:', channelId);
          return channelId;
        }
      }
      
      console.log('No channel found for handle:', handle);
      return null;
    }
    
    // Handle youtu.be URLs
    if (urlObj.hostname === 'youtu.be') {
      const videoId = urlObj.pathname.slice(1);
      console.log('Processing youtu.be video ID:', videoId);
      
      // Get channel ID from video
      const videoResponse = await youtube.videos.list({
        part: ['snippet'],
        id: [videoId]
      });
      
      const channelId = videoResponse.data.items?.[0]?.snippet?.channelId;
      console.log('Found channel ID from video:', channelId);
      return channelId || null;
    }
    
    // Handle youtube.com/watch URLs
    if (urlObj.pathname === '/watch') {
      const videoId = urlObj.searchParams.get('v');
      if (videoId) {
        console.log('Processing watch video ID:', videoId);
        
        // Get channel ID from video
        const videoResponse = await youtube.videos.list({
          part: ['snippet'],
          id: [videoId]
        });
        
        const channelId = videoResponse.data.items?.[0]?.snippet?.channelId;
        console.log('Found channel ID from video:', channelId);
        return channelId || null;
      }
    }
    
    console.log('No matching URL format found');
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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
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
    return NextResponse.json(
      { error: 'Failed to fetch channels' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  console.log('POST request received to /api/channels');
  
  try {
    const session = await getServerSession(authOptions);
    console.log('Session:', session);
    
    if (!session?.user) {
      console.log('No session or user found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log('Request body:', body);
    
    const { channelUrl } = body;
    if (!channelUrl) {
      console.log('No channelUrl provided');
      return NextResponse.json(
        { error: 'Channel URL is required' },
        { status: 400 }
      );
    }

    // Extract channel ID from URL
    const channelId = await resolveChannelId(channelUrl);
    if (!channelId) {
      console.log('Invalid channel URL:', channelUrl);
      return NextResponse.json(
        { error: 'Invalid channel URL format' },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      );
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
    return NextResponse.json(
      { error: 'Failed to add channel' },
      { status: 500 }
    );
  }
} 