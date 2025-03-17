import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host')
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
  const isApiAuthRoute = request.nextUrl.pathname === '/api/auth/login'

  // Handle domain-specific routing
  if (hostname === 'jessegeorge.greenvites.online') {
    if (request.nextUrl.pathname === '/') {
      return NextResponse.redirect(new URL('/jessegeorge', request.url))
    }
  }

  // Handle admin route protection
  if (isAdminRoute && !isApiAuthRoute) {
    const authToken = request.cookies.get('auth_token')
    
    if (!authToken && request.nextUrl.pathname !== '/admin') {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  return NextResponse.next()
}
