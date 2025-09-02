import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

// POST /api/auth/forgot-password - Solicitar recuperación de contraseña
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Buscar usuario por email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    // Por seguridad, siempre devolvemos el mismo mensaje
    // independientemente de si el usuario existe o no
    const successMessage = 'Si el email existe en nuestro sistema, recibirás un enlace de recuperación.'

    if (!user) {
      // Crear log de auditoría para intento con email no existente
      await prisma.auditLog.create({
        data: {
          userId: null,
          action: 'password.reset.attempt',
          resource: 'auth',
          metadata: JSON.stringify({
            email,
            result: 'email_not_found',
            timestamp: new Date().toISOString()
          })
        }
      })

      return NextResponse.json({ message: successMessage })
    }

    // Verificar que el usuario esté activo
    if (user.status !== 'ACTIVE') {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'password.reset.attempt',
          resource: 'auth',
          metadata: JSON.stringify({
            email,
            result: 'user_inactive',
            userStatus: user.status,
            timestamp: new Date().toISOString()
          })
        }
      })

      return NextResponse.json({ message: successMessage })
    }

    // Generar token de recuperación
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hora

    // Eliminar tokens de recuperación anteriores para este usuario
    await prisma.passwordReset.deleteMany({
      where: { userId: user.id }
    })

    // Crear nuevo token de recuperación
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiresAt: resetTokenExpiry
      }
    })

    // Crear log de auditoría
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'password.reset.requested',
        resource: 'auth',
        metadata: JSON.stringify({
          email,
          tokenGenerated: true,
          expiresAt: resetTokenExpiry.toISOString(),
          timestamp: new Date().toISOString()
        })
      }
    })

    // TODO: Aquí deberías enviar el email con el enlace de recuperación
    // Por ahora, solo logueamos el token para desarrollo
    console.log(`Password reset token for ${email}: ${resetToken}`)
    console.log(`Reset URL: ${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`)

    // En producción, aquí enviarías el email:
    /*
    await sendPasswordResetEmail({
      to: user.email,
      name: user.fullName,
      resetUrl: `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`
    })
    */

    return NextResponse.json({ message: successMessage })
  } catch (error) {
    console.error('Error in forgot password:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}