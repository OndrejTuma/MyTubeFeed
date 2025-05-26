'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';

interface Video {
  id: string;
  title: string;
  thumbnailUrl: string;
  publishedAt: string;
  channelTitle: string;
  channelId: string;
}

interface Channel {
  id: string;
  title: string;
  thumbnailUrl: string;
}

interface VideoFeedProps {
  channels: Channel[];
}

export default function VideoFeed({ channels }: VideoFeedProps) {
  const { data: session } = useSession();
  const [videos, setVideos] = useState<Video[]>([]);
  const [activeChannel, setActiveChannel] = useState<string | null>(channels[0]?.id || null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [prevPageToken, setPrevPageToken] = useState<string | null>(null);
  const [isUsingCache, setIsUsingCache] = useState(false);

  const fetchVideos = async (pageToken?: string) => {
    if (!activeChannel) return;
    
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append('channelId', activeChannel);
      if (pageToken) {
        params.append('pageToken', pageToken);
      }
      const response = await fetch(`/api/videos?${params.toString()}`);
      const data = await response.json();
      
      // Always set the videos and cache state, regardless of response status
      setVideos(data.videos || []);
      setNextPageToken(data.nextPageToken);
      setPrevPageToken(data.prevPageToken);
      setIsUsingCache(data.isCached || false);

      // Only throw error if we don't have any videos and we're not using cache
      if (!response.ok && !data.isCached) {
        throw new Error(data.error || 'Failed to fetch videos');
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
      // Don't clear videos if we're using cache
      if (!isUsingCache) {
        setVideos([]);
        setNextPageToken(null);
        setPrevPageToken(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session && activeChannel) {
      fetchVideos();
    }
  }, [session, activeChannel]);

  useEffect(() => {
    const handleChannelChange = () => {
      if (activeChannel) {
        fetchVideos();
      }
    };

    window.addEventListener('channelChange', handleChannelChange);
    return () => window.removeEventListener('channelChange', handleChannelChange);
  }, [activeChannel]);

  return (
    <div className="space-y-6">
      {isUsingCache && (
        <div className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 p-4 rounded-lg">
          Showing cached videos due to YouTube API quota limit. New videos will be available when the quota resets.
        </div>
      )}
      
      {videos.length === 0 && !isLoading && !isUsingCache && (
        <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-4 rounded-lg">
          Unable to fetch videos. Please try again later.
        </div>
      )}

      <div className="flex space-x-2 overflow-x-auto pb-2">
        {channels.map(channel => (
          <button
            key={channel.id}
            onClick={() => setActiveChannel(channel.id)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap flex items-center space-x-2 ${
              activeChannel === channel.id
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            <Image
              src={channel.thumbnailUrl}
              alt={channel.title}
              width={24}
              height={24}
              className="rounded-full"
            />
            <span>{channel.title}</span>
          </button>
        ))}
      </div>

      {selectedVideo && (
        <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
          <button
            onClick={() => setSelectedVideo(null)}
            className="absolute top-2 right-2 z-10 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <iframe
            src={`https://www.youtube.com/embed/${selectedVideo.id}?autoplay=1`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            </div>
          ))
        ) : (
          videos.map(video => (
            <div
              key={video.id}
              className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedVideo(video)}
            >
              <div className="relative aspect-video">
                <Image
                  src={video.thumbnailUrl}
                  alt={video.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-1 line-clamp-2">
                  {video.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {video.channelTitle} • {formatDistanceToNow(new Date(video.publishedAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {(nextPageToken || prevPageToken) && (
        <div className="flex justify-center space-x-4 mt-6">
          <button
            onClick={() => fetchVideos(prevPageToken || undefined)}
            disabled={!prevPageToken}
            className={`px-4 py-2 rounded-lg ${
              prevPageToken
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400'
            }`}
          >
            Previous
          </button>
          <button
            onClick={() => fetchVideos(nextPageToken || undefined)}
            disabled={!nextPageToken}
            className={`px-4 py-2 rounded-lg ${
              nextPageToken
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400'
            }`}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
} 