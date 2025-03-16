import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  return NextResponse.redirect(new URL('/jessegeorge', request.url))
//   if (hostname === 'jessegeorge.greenvites.online') {
//     // Redirect root to the event page (optional)
//     if (request.nextUrl.pathname === '/') {
//       return NextResponse.redirect(new URL('/jessegeorge', request.url))
//     }
//   }

  return NextResponse.next()
}
