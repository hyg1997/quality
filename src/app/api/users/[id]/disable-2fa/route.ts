import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/lib/permissions'

// POST /api/users/[id]/disable-2fa - Deshabilitar 2FA de un usuario
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: userId } = await params

    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verificar que no sea un admin (los admins no tienen 2FA)
    const isUserAdmin = user.userRoles.some(ur => ur.role.level >= 80)
    if (isUserAdmin) {
      return NextResponse.json({ 
        error: 'Cannot disable 2FA for admin users' 
      }, { status: 400 })
    }

    // Verificar que el usuario tenga 2FA habilitado
    if (!user.twoFactorEnabled) {
      return NextResponse.json({ 
        error: 'User does not have 2FA enabled' 
      }, { status: 400 })
    }

    // Deshabilitar 2FA
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null
      }
    })

    // Crear log de auditoría
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: '2fa.admin.disabled',
        resource: 'auth',
        metadata: JSON.stringify({
          targetUserId: userId,
          targetUserEmail: user.email,
          adminId: session.user.id,
          adminEmail: session.user.email,
          timestamp: new Date().toISOString()
        })
      }
    })

    return NextResponse.json({ 
      message: '2FA disabled successfully',
      user: {
        id: user.id,
        email: user.email,
        twoFactorEnabled: false
      }
    })
  } catch (error) {
    console.error('Error disabling 2FA:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}