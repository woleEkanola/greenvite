import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
  pages: {
    signIn: '/login',
  },
})

// This middleware runs before any request is processed
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Add headers to increase timeouts and prevent caching
  response.headers.set('Connection', 'keep-alive');
  response.headers.set('Keep-Alive', 'timeout=60');
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  
  return response;
}

// Only run the middleware for API routes
export const config = {
  matcher: ['/admin/dashboard/:path*', '/api/:path*']
}
