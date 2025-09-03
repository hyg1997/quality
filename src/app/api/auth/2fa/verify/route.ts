import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/lib/permissions'
import speakeasy from 'speakeasy'
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (isAdmin(session)) {
      return NextResponse.json({ 
        error: 'Los administradores no requieren autenticación de dos factores' 
      }, { status: 403 })
    }
    const { token } = await request.json()
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }
    const userId = session.user.id
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (!user.twoFactorSecret) {
      return NextResponse.json({ 
        error: 'No se ha configurado la autenticación de dos factores' 
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
          action: '2fa.verification.failed',
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
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true
      }
    })
    await prisma.auditLog.create({
      data: {
        userId: userId,
        action: '2fa.enabled',
        resource: 'auth',
        metadata: JSON.stringify({
          userEmail: user.email,
          timestamp: new Date().toISOString()
        })
      }
    })
    return NextResponse.json({ 
      message: 'Autenticación de dos factores habilitada exitosamente',
      enabled: true 
    })
  } catch (error) {
    console.error('Error verifying 2FA:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}