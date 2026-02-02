import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Rewrite /mingle.md to /mingle
  if (request.nextUrl.pathname === '/mingle.md') {
    return NextResponse.rewrite(new URL('/mingle', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: '/mingle.md',
}
