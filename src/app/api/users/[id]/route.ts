import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission, PERMISSIONS } from '@/lib/permissions'
import bcrypt from 'bcryptjs'

// PUT /api/users/[id] - Actualizar usuario
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !hasPermission(session, PERMISSIONS.USERS?.UPDATE)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { email, username, fullName, password, roleIds } = await request.json()

    // Validaciones
    if (!email || !fullName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verificar que el usuario existe
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verificar si el email ya existe en otro usuario
    if (email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email }
      })

      if (emailExists) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
      }
    }

    // Verificar si el username ya existe en otro usuario
    if (username && username !== existingUser.username) {
      const usernameExists = await prisma.user.findUnique({
        where: { username }
      })

      if (usernameExists) {
        return NextResponse.json({ error: 'Username already exists' }, { status: 400 })
      }
    }

    // Preparar datos de actualización
    const updateData: {
      email: string
      username: string | null
      fullName: string
      password?: string
    } = {
      email,
      username: username || null,
      fullName
    }

    // Si se proporciona nueva contraseña, hashearla
    if (password) {
      updateData.password = await bcrypt.hash(password, 12)
    }

    // Actualizar usuario
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData
    })

    // Actualizar roles si se proporcionan
    if (roleIds !== undefined) {
      // Eliminar roles existentes
      await prisma.userRole.deleteMany({
        where: { userId: id }
      })

      // Crear nuevos roles
      if (roleIds.length > 0) {
        await prisma.userRole.createMany({
          data: roleIds.map((roleId: string) => ({
            userId: id,
            roleId
          }))
        })
      }
    }

    // Crear log de auditoría
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'user.update',
        resource: 'user',
        metadata: JSON.stringify({
          targetUserId: id,
          targetUserEmail: updatedUser.email,
          fieldsUpdated: Object.keys(updateData),
          rolesUpdated: roleIds !== undefined
        })
      }
    })

    return NextResponse.json({ message: 'User updated successfully' })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/users/[id] - Eliminar usuario
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !hasPermission(session, PERMISSIONS.USERS?.DELETE)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verificar que el usuario existe
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // No permitir que un usuario se elimine a sí mismo
    if (id === session.user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    // Eliminar relaciones primero
    await prisma.userRole.deleteMany({
      where: { userId: id }
    })

    await prisma.userSession.deleteMany({
      where: { userId: id }
    })

    await prisma.refreshToken.deleteMany({
      where: { userId: id }
    })

    // Eliminar usuario
    await prisma.user.delete({
      where: { id }
    })

    // Crear log de auditoría
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'user.delete',
        resource: 'user',
        metadata: JSON.stringify({
          targetUserId: id,
          targetUserEmail: existingUser.email,
          targetUserFullName: existingUser.fullName
        })
      }
    })

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}