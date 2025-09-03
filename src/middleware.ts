import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const { pathname } = req.nextUrl
    if (pathname.startsWith('/auth/')) {
      return NextResponse.next()
    }
    if (!token) {
      const url = new URL('/auth/signin', req.url)
      url.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(url)
    }
    if (pathname.startsWith('/users')) {
      const hasUsersPermission = token.permissions?.some(
        (p: { name: string }) => p.name === 'users:read'
      )
      if (!hasUsersPermission) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }
    if (pathname.startsWith('/settings')) {
      if (pathname.startsWith('/settings/system') || 
           pathname.startsWith('/settings/backup')) {
        const isAdmin = token.roles?.some((r: { level: number }) => r.level >= 80)
        if (!isAdmin) {
          return NextResponse.redirect(new URL('/dashboard', req.url))
        }
      }
    }
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        if (pathname.startsWith('/auth/')) {
          return true
        }
        return !!token
      },
    },
  }
)
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}