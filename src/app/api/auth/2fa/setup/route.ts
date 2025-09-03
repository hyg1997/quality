import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/lib/permissions'
import speakeasy from 'speakeasy'
import QRCode from 'qrcode'
export async function POST() {
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
    const userId = session.user.id
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (user.twoFactorEnabled) {
      return NextResponse.json({ 
        error: 'La autenticación de dos factores ya está habilitada' 
      }, { status: 400 })
    }
    const secret = speakeasy.generateSecret({
      name: `Control de Calidad (${user.email})`,
      issuer: 'Control de Calidad',
      length: 32
    })
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!)
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secret.base32,
        twoFactorEnabled: false
      }
    })
    await prisma.auditLog.create({
      data: {
        userId: userId,
        action: '2fa.setup.initiated',
        resource: 'auth',
        metadata: JSON.stringify({
          userEmail: user.email,
          timestamp: new Date().toISOString()
        })
      }
    })
    return NextResponse.json({
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntryKey: secret.base32,
      message: 'Escanea el código QR con tu aplicación de autenticación'
    })
  } catch (error) {
    console.error('Error setting up 2FA:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.id
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorEnabled: true,
        twoFactorSecret: true
      }
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    return NextResponse.json({
      enabled: user.twoFactorEnabled,
      hasSecret: !!user.twoFactorSecret,
      isAdmin: isAdmin(session)
    })
  } catch (error) {
    console.error('Error checking 2FA status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}