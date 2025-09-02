import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import speakeasy from 'speakeasy'
import bcrypt from 'bcryptjs'

// POST /api/auth/2fa/login-verify - Verificar 2FA durante login
export async function POST(request: NextRequest) {
  try {
    const { username, password, token } = await request.json()

    if (!username || !password || !token) {
      return NextResponse.json({ 
        error: 'Se requieren usuario, contraseña y código 2FA' 
      }, { status: 400 })
    }

    // Buscar usuario
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: username },
          { username: username },
        ],
        status: "ACTIVE",
      },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    })

    if (!user || !user.password) {
      return NextResponse.json({ 
        error: 'Credenciales inválidas' 
      }, { status: 401 })
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return NextResponse.json({ 
        error: 'Credenciales inválidas' 
      }, { status: 401 })
    }

    // Verificar si el usuario tiene 2FA habilitado
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return NextResponse.json({ 
        error: 'El usuario no tiene 2FA habilitado' 
      }, { status: 400 })
    }

    // Verificar si es admin (los admins no necesitan 2FA)
    const isAdmin = user.userRoles.some(ur => ur.role.level >= 80)
    if (isAdmin) {
      return NextResponse.json({ 
        error: 'Los administradores no requieren 2FA' 
      }, { status: 400 })
    }

    // Verificar el token 2FA
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 2
    })

    if (!verified) {
      // Crear log de auditoría para intento fallido
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: '2fa.login.failed',
          resource: 'auth',
          metadata: JSON.stringify({
            userEmail: user.email,
            timestamp: new Date().toISOString()
          })
        }
      })

      return NextResponse.json({ 
        error: 'Código de verificación inválido' 
      }, { status: 400 })
    }

    // Crear log de auditoría para login exitoso con 2FA
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: '2fa.login.success',
        resource: 'auth',
        metadata: JSON.stringify({
          userEmail: user.email,
          timestamp: new Date().toISOString()
        })
      }
    })

    // Actualizar último login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date()
      }
    })

    return NextResponse.json({ 
      success: true,
      message: 'Verificación 2FA exitosa',
      userId: user.id
    })
  } catch (error) {
    console.error('Error verifying 2FA login:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}