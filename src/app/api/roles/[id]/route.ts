import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/lib/permissions'

// PUT /api/roles/[id] - Actualizar rol
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: roleId } = await params
    const { name, displayName, description, level, permissions } = await request.json()

    // Verificar que el rol existe
    const existingRole = await prisma.role.findUnique({
      where: { id: roleId }
    })

    if (!existingRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    // Verificar que no sea un rol protegido
    if (existingRole.level >= 80) {
      return NextResponse.json({ 
        error: 'Cannot modify protected system role' 
      }, { status: 400 })
    }

    // Actualizar el rol
    const updatedRole = await prisma.role.update({
      where: { id: roleId },
      data: {
        name,
        displayName,
        description,
        level
      }
    })

    // Actualizar permisos si se proporcionaron
    if (permissions) {
      // Eliminar permisos existentes
      await prisma.rolePermission.deleteMany({
        where: { roleId }
      })

      // Agregar nuevos permisos
      if (permissions.length > 0) {
        await prisma.rolePermission.createMany({
          data: permissions.map((permissionId: string) => ({
            roleId,
            permissionId
          }))
        })
      }
    }

    // Crear log de auditoría
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'role.updated',
        resource: 'roles',
        metadata: JSON.stringify({
          roleId,
          roleName: updatedRole.name,
          level: updatedRole.level
        })
      }
    })

    return NextResponse.json(updatedRole)
  } catch (error) {
    console.error('Error updating role:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/roles/[id] - Eliminar rol
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: roleId } = await params

    // Verificar que el rol existe
    const existingRole = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        _count: {
          select: {
            userRoles: true
          }
        }
      }
    })

    if (!existingRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    // Verificar que no sea un rol protegido
    if (existingRole.level >= 80) {
      return NextResponse.json({ 
        error: 'Cannot delete protected system role' 
      }, { status: 400 })
    }

    // Verificar que no tenga usuarios asignados
    if (existingRole._count.userRoles > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete role with assigned users' 
      }, { status: 400 })
    }

    // Eliminar permisos del rol
    await prisma.rolePermission.deleteMany({
      where: { roleId }
    })

    // Eliminar el rol
    await prisma.role.delete({
      where: { id: roleId }
    })

    // Crear log de auditoría
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'role.deleted',
        resource: 'roles',
        metadata: JSON.stringify({
          roleId,
          roleName: existingRole.name,
          level: existingRole.level
        })
      }
    })

    return NextResponse.json({ message: 'Role deleted successfully' })
  } catch (error) {
    console.error('Error deleting role:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}