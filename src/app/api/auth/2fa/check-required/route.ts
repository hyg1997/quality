import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()
    if (!username || !password) {
      return NextResponse.json({ 
        error: 'Se requieren usuario y contraseña' 
      }, { status: 400 })
    }
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
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return NextResponse.json({ 
        error: 'Credenciales inválidas' 
      }, { status: 401 })
    }
    const isAdmin = user.userRoles.some(ur => ur.role.level >= 80)
    if (isAdmin) {
      return NextResponse.json({ 
        requires2FA: false,
        isAdmin: true
      })
    }
    const requires2FA = user.twoFactorEnabled && !!user.twoFactorSecret
    return NextResponse.json({ 
      requires2FA,
      isAdmin: false,
      twoFactorEnabled: user.twoFactorEnabled
    })
  } catch (error) {
    console.error('Error checking 2FA requirement:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}