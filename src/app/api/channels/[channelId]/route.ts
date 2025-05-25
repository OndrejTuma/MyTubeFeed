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
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db();
    const result = await db.collection('channels').deleteOne({
      id: context.params.channelId,
      userId: session.user.id,
    });

    if (result.deletedCount === 0) {
      return new NextResponse('Channel not found', { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting channel:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 