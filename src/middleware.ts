import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const RATE_LIMIT = 100; // requests per hour
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

const ipRequests = new Map<string, { count: number; resetTime: number }>();

export function middleware(request: NextRequest) {
  const ip = request.ip ?? 'anonymous';
  const now = Date.now();
  
  const requestData = ipRequests.get(ip) ?? { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
  
  if (now > requestData.resetTime) {
    requestData.count = 0;
    requestData.resetTime = now + RATE_LIMIT_WINDOW;
  }
  
  requestData.count++;
  ipRequests.set(ip, requestData);
  
  if (requestData.count > RATE_LIMIT) {
    return new NextResponse('Too Many Requests', { status: 429 });
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/api/videos',
}; 