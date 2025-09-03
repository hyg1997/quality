import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission, PERMISSIONS } from '@/lib/permissions'
import bcrypt from 'bcryptjs'

// GET /api/users - Obtener todos los usuarios
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !hasPermission(session, PERMISSIONS.USERS?.READ)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Obtener parámetros de búsqueda
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Construir condiciones de búsqueda
    const whereConditions: {
      OR?: Array<{
        email?: { contains: string };
        username?: { contains: string };
        fullName?: { contains: string };
      }>;
    } = {}
    
    if (search && search.trim().length > 0) {
      whereConditions.OR = [
        {
          email: {
            contains: search
          }
        },
        {
          username: {
            contains: search
          }
        },
        {
          fullName: {
            contains: search
          }
        }
      ]
    }

    const users = await prisma.user.findMany({
      where: whereConditions,
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        userRoles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                displayName: true,
                level: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    })

    // Transformar datos para incluir roles directamente
    const transformedUsers = users.map(user => ({
      ...user,
      roles: user.userRoles.map(ur => ur.role)
    }))

    return NextResponse.json(transformedUsers)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/users - Crear nuevo usuario
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !hasPermission(session, PERMISSIONS.USERS?.CREATE)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { email, username, fullName, password, roleIds } = await request.json()

    // Validaciones
    if (!email || !fullName || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    }

    // Verificar si el username ya existe (si se proporciona)
    if (username) {
      const existingUsername = await prisma.user.findUnique({
        where: { username }
      })

      if (existingUsername) {
        return NextResponse.json({ error: 'Username already exists' }, { status: 400 })
      }
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 12)

    // Crear usuario
    const user = await prisma.user.create({
      data: {
        email,
        username: username || null,
        fullName,
        password: hashedPassword,
        status: 'ACTIVE',
        emailVerified: new Date()
      }
    })

    // Asignar roles si se proporcionan
    if (roleIds && roleIds.length > 0) {
      await prisma.userRole.createMany({
        data: roleIds.map((roleId: string) => ({
          userId: user.id,
          roleId
        }))
      })
    }

    // Crear log de auditoría
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'user.create',
        resource: 'user',
        metadata: JSON.stringify({
          targetUserId: user.id,
          targetUserEmail: user.email,
          rolesAssigned: roleIds?.length || 0
        })
      }
    })

    return NextResponse.json({ message: 'User created successfully', userId: user.id })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}