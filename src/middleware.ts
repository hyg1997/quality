import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

// Middleware para proteger rutas
export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const { pathname } = req.nextUrl

    // Permitir acceso a páginas de autenticación
    if (pathname.startsWith('/auth/')) {
      return NextResponse.next()
    }

    // Si no hay token, redirigir a login
    if (!token) {
      const url = new URL('/auth/signin', req.url)
      url.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(url)
    }

    // Verificar permisos específicos para rutas protegidas
    if (pathname.startsWith('/users')) {
      const hasUsersPermission = token.permissions?.some(
        (p: { name: string }) => p.name === 'users:read'
      )
      
      if (!hasUsersPermission) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    if (pathname.startsWith('/settings')) {
      // Solo admins pueden acceder a configuración del sistema
      if (pathname.startsWith('/settings/system') || 
          pathname.startsWith('/settings/audit') ||
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
        
        // Permitir acceso a páginas públicas
        if (pathname.startsWith('/auth/')) {
          return true
        }
        
        // Requerir token para rutas protegidas
        return !!token
      },
    },
  }
)

// Configurar qué rutas debe proteger el middleware
export const config = {
  matcher: [
    /*
     * Coincidir con todas las rutas de solicitud excepto las que comienzan con:
     * - api (rutas API)
     * - _next/static (archivos estáticos)
     * - _next/image (archivos de optimización de imágenes)
     * - favicon.ico (favicon)
     * - public (archivos públicos)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}