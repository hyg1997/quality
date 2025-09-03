'use client'
import { useSession } from 'next-auth/react'
import { useCallback, useMemo } from 'react'
import { 
  hasPermission, 
  isAdmin, 
  isSuperAdmin, 
  getHighestRoleLevel, 
  hasRole, 
  hasMinimumRoleLevel, 
  hasAnyPermission, 
  hasAllPermissions, 
  canPerformAction 
} from '@/lib/permissions'
export function usePermissions() {
  const { data: session } = useSession()
  const hasPermissionCallback = useCallback(
    (permission: string) => hasPermission(session, permission),
    [session]
  )
  const isAdminCallback = useCallback(
    () => isAdmin(session),
    [session]
  )
  const isSuperAdminCallback = useCallback(
    () => isSuperAdmin(session),
    [session]
  )
  const hasRoleCallback = useCallback(
    (roleName: string) => hasRole(session, roleName),
    [session]
  )
  const hasMinimumRoleLevelCallback = useCallback(
    (level: number) => hasMinimumRoleLevel(session, level),
    [session]
  )
  const hasAnyPermissionCallback = useCallback(
    (permissions: string[]) => hasAnyPermission(session, permissions),
    [session]
  )
  const hasAllPermissionsCallback = useCallback(
    (permissions: string[]) => hasAllPermissions(session, permissions),
    [session]
  )
  const canPerformActionCallback = useCallback(
    (resource: string, action: string) => canPerformAction(session, resource, action),
    [session]
  )
  const getRoleLevelCallback = useCallback(
    () => getHighestRoleLevel(session),
    [session]
  )
  const canCallback = useCallback(
    (permission: string) => hasPermission(session, permission),
    [session]
  )
  const cannotCallback = useCallback(
    (permission: string) => !hasPermission(session, permission),
    [session]
  )
  const computedValues = useMemo(() => ({
    session,
    user: session?.user,
    roles: session?.user?.roles || [],
    permissions: session?.user?.permissions || [],
    isAuthenticated: !!session,
    canManageUsers: hasPermission(session, 'users:read'),
    canManageRoles: isAdmin(session),
    canManageSystem: isAdmin(session)
  }), [session])
  return {
    hasPermission: hasPermissionCallback,
    isAdmin: isAdminCallback,
    isSuperAdmin: isSuperAdminCallback,
    hasRole: hasRoleCallback,
    hasMinimumRoleLevel: hasMinimumRoleLevelCallback,
    hasAnyPermission: hasAnyPermissionCallback,
    hasAllPermissions: hasAllPermissionsCallback,
    canPerformAction: canPerformActionCallback,
    getRoleLevel: getRoleLevelCallback,
    can: canCallback,
    cannot: cannotCallback,
    ...computedValues
  }
}
export default usePermissions