import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import VideoFeed from '@/components/VideoFeed';
import ChannelManager from '@/components/ChannelManager';
import clientPromise from '@/lib/mongodb';

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/api/auth/signin');
  }

  const client = await clientPromise;
  const db = client.db();
  const channels = (await db
    .collection('channels')
    .find({ userId: session.user.id })
    .toArray())
    .map(doc => ({
      id: doc.id,
      title: doc.title,
      thumbnailUrl: doc.thumbnailUrl
    }));

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <VideoFeed channels={channels} />
          </div>
          <div className="lg:col-span-1">
            <ChannelManager />
          </div>
        </div>
      </div>
    </main>
  );
}
