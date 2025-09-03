import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission, PERMISSIONS } from '@/lib/permissions'
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !hasPermission(session, PERMISSIONS.USERS?.READ)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const permissions = await prisma.permission.findMany({
      include: {
        _count: {
          select: {
            rolePermissions: true
          }
        }
      },
      orderBy: [
        { resource: 'asc' },
        { action: 'asc' }
      ]
    })
    const formattedPermissions = permissions.map(permission => ({
      id: permission.id,
      name: permission.name,
      displayName: permission.displayName,
      description: permission.description,
      resource: permission.resource,
      action: permission.action,
      roleCount: permission._count.rolePermissions
    }))
    const groupedPermissions = formattedPermissions.reduce((acc, permission) => {
      const resource = permission.resource
      if (!acc[resource]) {
        acc[resource] = []
      }
      acc[resource].push(permission)
      return acc
    }, {} as Record<string, typeof formattedPermissions>)
    return NextResponse.json({
      permissions: formattedPermissions,
      grouped: groupedPermissions
    })
  } catch (error) {
    console.error('Error fetching permissions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}