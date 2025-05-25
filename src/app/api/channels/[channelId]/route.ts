import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import clientPromise from '@/lib/mongodb';
import { authOptions } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  context: { params: { channelId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const db = client.db();
    const result = await db.collection('channels').deleteOne({
      id: context.params.channelId,
      userId: session.user.id,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting channel:', error);
    return NextResponse.json(
      { error: 'Failed to delete channel' },
      { status: 500 }
    );
  }
} 