import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/lib/permissions'
import speakeasy from 'speakeasy'
import bcrypt from 'bcryptjs'
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (isAdmin(session)) {
      return NextResponse.json({ 
        error: 'Los administradores no tienen autenticación de dos factores' 
      }, { status: 403 })
    }
    const { token, password } = await request.json()
    if (!token || !password) {
      return NextResponse.json({ 
        error: 'Se requiere el código 2FA y la contraseña actual' 
      }, { status: 400 })
    }
    const userId = session.user.id
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return NextResponse.json({ 
        error: 'La autenticación de dos factores no está habilitada' 
      }, { status: 400 })
    }
    if (!user.password) {
      return NextResponse.json({ 
        error: 'Usuario sin contraseña configurada' 
      }, { status: 400 })
    }
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return NextResponse.json({ 
        error: 'Contraseña incorrecta' 
      }, { status: 400 })
    }
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 2
    })
    if (!verified) {
      await prisma.auditLog.create({
        data: {
          userId: userId,
          action: '2fa.disable.failed',
          resource: 'auth',
          metadata: JSON.stringify({
            userEmail: user.email,
            reason: 'invalid_token',
            timestamp: new Date().toISOString()
          })
        }
      })
      return NextResponse.json({ 
        error: 'Código de verificación inválido' 
      }, { status: 400 })
    }
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null
      }
    })
    await prisma.auditLog.create({
      data: {
        userId: userId,
        action: '2fa.disabled',
        resource: 'auth',
        metadata: JSON.stringify({
          userEmail: user.email,
          timestamp: new Date().toISOString()
        })
      }
    })
    return NextResponse.json({ 
      message: 'Autenticación de dos factores deshabilitada exitosamente',
      enabled: false 
    })
  } catch (error) {
    console.error('Error disabling 2FA:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}