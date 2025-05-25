import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import VideoFeed from '@/components/VideoFeed';
import ChannelManager from '@/components/ChannelManager';

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/api/auth/signin');
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <VideoFeed />
          </div>
          <div className="lg:col-span-1">
            <ChannelManager />
          </div>
        </div>
      </div>
    </main>
  );
}
