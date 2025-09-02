import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// POST /api/auth/reset-password - Restablecer contraseña usando token
export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 })
    }

    // Validar longitud de contraseña
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 })
    }

    // Buscar el token en la base de datos
    const resetToken = await prisma.passwordReset.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            status: true
          }
        }
      }
    })

    if (!resetToken) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
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

    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(password, 12)

    // Actualizar la contraseña del usuario
    await prisma.user.update({
      where: { id: resetToken.user.id },
      data: {
        password: hashedPassword,
        updatedAt: new Date()
      }
    })

    // Marcar el token como usado
    await prisma.passwordReset.update({
      where: { id: resetToken.id },
      data: {
        usedAt: new Date()
      }
    })

    // Invalidar todas las sesiones activas del usuario
    await prisma.userSession.deleteMany({
      where: { userId: resetToken.user.id }
    })

    await prisma.refreshToken.deleteMany({
      where: { userId: resetToken.user.id }
    })

    // Crear log de auditoría
    await prisma.auditLog.create({
      data: {
        userId: resetToken.user.id,
        action: 'password.reset.completed',
        resource: 'auth',
        metadata: JSON.stringify({
          email: resetToken.user.email,
          tokenUsed: token.substring(0, 8) + '...', // Solo los primeros 8 caracteres por seguridad
          sessionsInvalidated: true,
          timestamp: new Date().toISOString()
        })
      }
    })

    return NextResponse.json({ 
      message: 'Password reset successfully',
      success: true 
    })
  } catch (error) {
    console.error('Error resetting password:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}