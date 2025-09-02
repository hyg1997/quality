import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/auth/verify-reset-token - Verificar si un token de recuperación es válido
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    // Buscar el token en la base de datos
    const resetToken = await prisma.passwordReset.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            status: true
          }
        }
      }
    })

    if (!resetToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    // Verificar si el token ha expirado
    if (resetToken.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Token has expired' }, { status: 400 })
    }

    // Verificar si el token ya fue usado
    if (resetToken.usedAt) {
      return NextResponse.json({ error: 'Token has already been used' }, { status: 400 })
    }

    // Verificar si el usuario está activo
    if (resetToken.user.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'User account is not active' }, { status: 400 })
    }

    return NextResponse.json({ valid: true })
  } catch (error) {
    console.error('Error verifying reset token:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}