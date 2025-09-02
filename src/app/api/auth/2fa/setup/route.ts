import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/lib/permissions'
import speakeasy from 'speakeasy'
import QRCode from 'qrcode'

// POST /api/auth/2fa/setup - Generar secreto 2FA y código QR
export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Los administradores no necesitan 2FA
    if (isAdmin(session)) {
      return NextResponse.json({ 
        error: 'Los administradores no requieren autenticación de dos factores' 
      }, { status: 403 })
    }

    const userId = session.user.id

    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Si ya tiene 2FA habilitado, no permitir regenerar
    if (user.twoFactorEnabled) {
      return NextResponse.json({ 
        error: 'La autenticación de dos factores ya está habilitada' 
      }, { status: 400 })
    }

    // Generar secreto para 2FA
    const secret = speakeasy.generateSecret({
      name: `Control de Calidad (${user.email})`,
      issuer: 'Control de Calidad',
      length: 32
    })

    // Generar código QR
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!)

    // Guardar el secreto temporalmente (no habilitado hasta verificar)
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secret.base32,
        twoFactorEnabled: false // Se habilitará después de la verificación
      }
    })

    // Crear log de auditoría
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

// GET /api/auth/2fa/setup - Verificar estado 2FA del usuario
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