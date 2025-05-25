'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { FaPlus, FaTrash } from 'react-icons/fa';
import Image from 'next/image'

interface Channel {
  id: string;
  title: string;
  thumbnailUrl: string;
}

export default function ChannelManager() {
  const { data: session } = useSession();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [newChannelUrl, setNewChannelUrl] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const response = await fetch('/api/channels');
        const data = await response.json();
        setChannels(data);
      } catch (error) {
        console.error('Error fetching channels:', error);
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchChannels();
    }
  }, [session]);

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelUrl) return;

    try {
      const response = await fetch('/api/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ channelUrl: newChannelUrl }),
      });

      if (response.ok) {
        const newChannel = await response.json();
        setChannels([...channels, newChannel]);
        setNewChannelUrl('');
        window.dispatchEvent(new Event('channelChange'));
      }
    } catch (error) {
      console.error('Error adding channel:', error);
    }
  };

  const handleRemoveChannel = async (channelId: string) => {
    try {
      const response = await fetch(`/api/channels/${channelId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setChannels(channels.filter(channel => channel.id !== channelId));
        window.dispatchEvent(new Event('channelChange'));
      }
    } catch (error) {
      console.error('Error removing channel:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-4 sm:p-6">
      <h2 className="text-xl font-bold mb-4 dark:text-gray-100">Your Channels</h2>
      
      <form onSubmit={handleAddChannel} className="mb-6">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newChannelUrl}
            onChange={(e) => setNewChannelUrl(e.target.value)}
            placeholder="Enter YouTube channel URL"
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
          />
          <button
            type="submit"
            className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-blue-600 dark:hover:bg-blue-700 cursor-pointer flex items-center justify-center min-w-[42px]"
          >
            <FaPlus />
          </button>
        </div>
      </form>

      <div className="space-y-4">
        {channels.map((channel) => (
          <div key={channel.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3 min-w-0">
              <Image
                src={channel.thumbnailUrl}
                alt={channel.title}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full flex-shrink-0"
              />
              <span className="font-medium dark:text-gray-100 truncate">{channel.title}</span>
            </div>
            <button
              onClick={() => handleRemoveChannel(channel.id)}
              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full cursor-pointer flex-shrink-0 ml-2"
            >
              <FaTrash />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
} 