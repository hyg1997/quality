import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })
    const successMessage = 'Si el email existe en nuestro sistema, recibirás un enlace de recuperación.'
    if (!user) {
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
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 3600000)
    await prisma.passwordReset.deleteMany({
      where: { userId: user.id }
    })
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiresAt: resetTokenExpiry
      }
    })
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
    console.log(`Password reset token for ${email}: ${resetToken}`)
    console.log(`Reset URL: ${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`)
    return NextResponse.json({ message: successMessage })
  } catch (error) {
    console.error('Error in forgot password:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}