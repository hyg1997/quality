import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission, isAdmin, PERMISSIONS } from '@/lib/permissions'

// GET /api/roles - Obtener todos los roles
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !hasPermission(session, PERMISSIONS.USERS?.READ)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const roles = await prisma.role.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        },
        _count: {
          select: {
            userRoles: true
          }
        }
      },
      orderBy: {
        level: 'desc'
      }
    })

    const formattedRoles = roles.map(role => ({
      id: role.id,
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      level: role.level,
      permissions: role.rolePermissions.map(rp => rp.permission),
      userCount: role._count.userRoles,
      isProtected: role.level >= 80 // Admin roles are protected
    }))

    return NextResponse.json(formattedRoles)
  } catch (error) {
    console.error('Error fetching roles:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/roles - Crear nuevo rol
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, displayName, description, level, permissions } = await request.json()

    if (!name || !displayName || level === undefined) {
      return NextResponse.json({ 
        error: 'Name, displayName and level are required' 
      }, { status: 400 })
    }

    // Verificar que el nombre del rol no exista
    const existingRole = await prisma.role.findUnique({
      where: { name }
    })

    if (existingRole) {
      return NextResponse.json({ 
        error: 'Role name already exists' 
      }, { status: 400 })
    }

    // Crear el rol
    const role = await prisma.role.create({
      data: {
        name,
        displayName,
        description,
        level
      }
    })

    // Asignar permisos si se proporcionaron
    if (permissions && permissions.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissions.map((permissionId: string) => ({
          roleId: role.id,
          permissionId
        }))
      })
    }

    // Crear log de auditoría
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'role.created',
        resource: 'roles',
        metadata: JSON.stringify({
          roleId: role.id,
          roleName: role.name,
          level: role.level
        })
      }
    })

    return NextResponse.json(role, { status: 201 })
  } catch (error) {
    console.error('Error creating role:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}