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

  // Memoize permission check functions to prevent recreation on every render
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

  // Memoize computed values that depend on session
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
    // Basic permission checks
    hasPermission: hasPermissionCallback,
    
    // Role checks
    isAdmin: isAdminCallback,
    isSuperAdmin: isSuperAdminCallback,
    hasRole: hasRoleCallback,
    hasMinimumRoleLevel: hasMinimumRoleLevelCallback,
    
    // Advanced permission checks
    hasAnyPermission: hasAnyPermissionCallback,
    hasAllPermissions: hasAllPermissionsCallback,
    canPerformAction: canPerformActionCallback,
    
    // Utility functions
    getRoleLevel: getRoleLevelCallback,
    
    // Helper for conditional rendering
    can: canCallback,
    cannot: cannotCallback,
    
    // Computed properties (memoized)
    ...computedValues
  }
}

export default usePermissions