import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission, isAdmin, PERMISSIONS } from '@/lib/permissions'
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !hasPermission(session, PERMISSIONS.USERS?.READ)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const whereConditions: {
      OR?: Array<{
        name?: { contains: string };
        displayName?: { contains: string };
        description?: { contains: string };
      }>;
    } = {}
    if (search && search.trim().length > 0) {
      whereConditions.OR = [
        {
          name: {
            contains: search
          }
        },
        {
          displayName: {
            contains: search
          }
        },
        {
          description: {
            contains: search
          }
        }
      ]
    }
    const roles = await prisma.role.findMany({
      where: whereConditions,
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
      },
      take: limit,
      skip: offset
    })
    const formattedRoles = roles.map(role => ({
      id: role.id,
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      level: role.level,
      permissions: role.rolePermissions.map(rp => rp.permission),
      userCount: role._count.userRoles,
      isProtected: role.level >= 80
    }))
    return NextResponse.json(formattedRoles)
  } catch (error) {
    console.error('Error fetching roles:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
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
    const levelNumber = parseInt(level, 10)
    if (isNaN(levelNumber)) {
      return NextResponse.json({ 
        error: 'Level must be a valid number' 
      }, { status: 400 })
    }
    const existingRole = await prisma.role.findUnique({
      where: { name }
    })
    if (existingRole) {
      return NextResponse.json({ 
        error: 'Role name already exists' 
      }, { status: 400 })
    }
    const role = await prisma.role.create({
      data: {
        name,
        displayName,
        description,
        level: levelNumber
      }
    })
    if (permissions && permissions.length > 0) {
      const existingPermissions = await prisma.permission.findMany({
        where: {
          id: {
            in: permissions
          }
        }
      })
      if (existingPermissions.length > 0) {
        await prisma.rolePermission.createMany({
          data: existingPermissions.map((permission) => ({
            roleId: role.id,
            permissionId: permission.id
          }))
        })
      }
    }
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