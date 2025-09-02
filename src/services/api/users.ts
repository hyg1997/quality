import { apiClient, type ApiResponse } from './base'

// Types for User API
export interface User extends Record<string, unknown> {
  id: string
  email: string
  username: string | null
  fullName: string
  status: string
  roles: UserRole[]
  createdAt: string
  lastLoginAt: string | null
  twoFactorEnabled: boolean
}

export interface UserRole {
  id: string
  name: string
  displayName: string
  level: number
}

export interface CreateUserData {
  email: string
  username?: string
  fullName: string
  password: string
  roleIds?: string[]
}

export interface UpdateUserData {
  email?: string
  username?: string
  fullName?: string
  password?: string
  roleIds?: string[]
}

// User API Service
export class UserService {
  /**
   * Get all users
   */
  async getUsers(): Promise<ApiResponse<User[]>> {
    return apiClient.get<User[]>('/api/users')
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<ApiResponse<User>> {
    return apiClient.get<User>(`/api/users/${id}`)
  }

  /**
   * Create new user
   */
  async createUser(userData: CreateUserData): Promise<ApiResponse<User>> {
    return apiClient.post<User>('/api/users', userData, {
      showSuccessNotification: true,
      successMessage: 'Usuario creado exitosamente'
    })
  }

  /**
   * Update user
   */
  async updateUser(id: string, userData: UpdateUserData): Promise<ApiResponse<User>> {
    return apiClient.put<User>(`/api/users/${id}`, userData, {
      showSuccessNotification: true,
      successMessage: 'Usuario actualizado exitosamente'
    })
  }

  /**
   * Delete user
   */
  async deleteUser(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/api/users/${id}`, {
      showSuccessNotification: true,
      successMessage: 'Usuario eliminado exitosamente'
    })
  }

  /**
   * Disable 2FA for user (admin only)
   */
  async disable2FA(id: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`/api/users/${id}/disable-2fa`, {}, {
      showSuccessNotification: true,
      successMessage: '2FA deshabilitado exitosamente'
    })
  }

  /**
   * Check if user can be deleted (not admin, no dependencies)
   */
  canDeleteUser(user: User): boolean {
    return !user.roles.some(role => role.level >= 80)
  }

  /**
   * Check if user can be edited (not admin)
   */
  canEditUser(user: User): boolean {
    return !user.roles.some(role => role.level >= 80)
  }

  /**
   * Check if user has 2FA enabled
   */
  has2FAEnabled(user: User): boolean {
    return user.twoFactorEnabled
  }

  /**
   * Get user's highest role level
   */
  getUserRoleLevel(user: User): number {
    return Math.max(...user.roles.map(role => role.level), 0)
  }

  /**
   * Format user display name
   */
  formatUserDisplayName(user: User): string {
    return user.fullName || user.email
  }

  /**
   * Get user status badge variant
   */
  getUserStatusVariant(user: User): 'success' | 'warning' | 'danger' | 'default' {
    switch (user.status) {
      case 'ACTIVE':
        return 'success'
      case 'INACTIVE':
        return 'warning'
      case 'SUSPENDED':
        return 'danger'
      default:
        return 'default'
    }
  }
}

// Export singleton instance
export const userService = new UserService()