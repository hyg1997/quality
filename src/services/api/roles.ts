import { apiClient, type ApiResponse } from './base'

// Types for Role API
export interface Role {
  id: string
  name: string
  displayName: string
  description: string | null
  level: number
  permissions: Permission[]
  userCount: number
  isProtected: boolean
}

export interface Permission {
  id: string
  name: string
  displayName: string
  description: string | null
  resource: string
  action: string
}

export interface CreateRoleData {
  name: string
  displayName: string
  description?: string
  level: number
  permissions: string[]
}

export interface UpdateRoleData {
  name?: string
  displayName?: string
  description?: string
  level?: number
  permissions?: string[]
}

export interface PermissionsResponse {
  permissions: Permission[]
}

// Role API Service
export class RoleService {
  /**
   * Get all roles
   */
  async getRoles(): Promise<ApiResponse<Role[]>> {
    return apiClient.get<Role[]>('/api/roles')
  }

  /**
   * Get role by ID
   */
  async getRoleById(id: string): Promise<ApiResponse<Role>> {
    return apiClient.get<Role>(`/api/roles/${id}`)
  }

  /**
   * Create new role
   */
  async createRole(roleData: CreateRoleData): Promise<ApiResponse<Role>> {
    return apiClient.post<Role>('/api/roles', roleData, {
      showSuccessNotification: true,
      successMessage: 'Rol creado exitosamente'
    })
  }

  /**
   * Update role
   */
  async updateRole(id: string, roleData: UpdateRoleData): Promise<ApiResponse<Role>> {
    return apiClient.put<Role>(`/api/roles/${id}`, roleData, {
      showSuccessNotification: true,
      successMessage: 'Rol actualizado exitosamente'
    })
  }

  /**
   * Delete role
   */
  async deleteRole(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/api/roles/${id}`, {
      showSuccessNotification: true,
      successMessage: 'Rol eliminado exitosamente'
    })
  }

  /**
   * Get all permissions
   */
  async getPermissions(): Promise<ApiResponse<Permission[]>> {
    const response = await apiClient.get<Permission[] | PermissionsResponse>('/api/permissions')
    
    if (response.success && response.data) {
      // Handle both array and object responses
      const permissions = Array.isArray(response.data) 
        ? response.data 
        : response.data.permissions || []
      
      return {
        data: permissions,
        error: null,
        success: true
      }
    }
    
    return response as ApiResponse<Permission[]>
  }

  /**
   * Check if role can be deleted
   */
  canDeleteRole(role: Role): boolean {
    return !role.isProtected && role.userCount === 0
  }

  /**
   * Check if role can be edited
   */
  canEditRole(role: Role): boolean {
    return !role.isProtected
  }

  /**
   * Get role level badge variant
   */
  getRoleLevelVariant(role: Role): 'danger' | 'warning' | 'default' {
    if (role.level >= 80) return 'danger'
    if (role.level >= 50) return 'warning'
    return 'default'
  }

  /**
   * Format role permissions for display
   */
  formatRolePermissions(role: Role, maxDisplay = 3): {
    visible: Permission[]
    remaining: number
  } {
    return {
      visible: role.permissions.slice(0, maxDisplay),
      remaining: Math.max(0, role.permissions.length - maxDisplay)
    }
  }

  /**
   * Group permissions by resource
   */
  groupPermissionsByResource(permissions: Permission[]): Record<string, Permission[]> {
    return permissions.reduce((groups, permission) => {
      const resource = permission.resource
      if (!groups[resource]) {
        groups[resource] = []
      }
      groups[resource].push(permission)
      return groups
    }, {} as Record<string, Permission[]>)
  }

  /**
   * Validate role level
   */
  validateRoleLevel(level: number): { valid: boolean; message?: string } {
    if (level < 1) {
      return { valid: false, message: 'El nivel debe ser mayor a 0' }
    }
    if (level >= 80) {
      return { valid: false, message: 'Los niveles 80+ están reservados para administradores' }
    }
    return { valid: true }
  }

  /**
   * Validate role name
   */
  validateRoleName(name: string, existingRoles: Role[] = [], excludeId?: string): {
    valid: boolean
    message?: string
  } {
    if (!name || name.trim().length < 2) {
      return { valid: false, message: 'El nombre debe tener al menos 2 caracteres' }
    }

    const normalizedName = name.trim().toLowerCase()
    const isDuplicate = existingRoles.some(role => 
      role.id !== excludeId && role.name.toLowerCase() === normalizedName
    )

    if (isDuplicate) {
      return { valid: false, message: 'Ya existe un rol con este nombre' }
    }

    return { valid: true }
  }
}

// Export singleton instance
export const roleService = new RoleService()