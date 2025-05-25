import { google } from 'googleapis';
import clientPromise from './mongodb';

export const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
  headers: {
    'Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
  },
});

export async function logQuotaUsage(operation: string) {
  const client = await clientPromise;
  const db = client.db();
  
  await db.collection('api_usage').insertOne({
    operation,
    timestamp: new Date(),
    quotaCost: 1, // Adjust based on actual quota cost of operation
  });
} 