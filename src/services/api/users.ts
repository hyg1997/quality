import { apiClient, type ApiResponse } from './base'
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
export class UserService {
  async getUsers(): Promise<ApiResponse<User[]>> {
    return apiClient.get<User[]>('/api/users')
  }
  async getUserById(id: string): Promise<ApiResponse<User>> {
    return apiClient.get<User>(`/api/users/${id}`)
  }
  async createUser(userData: CreateUserData): Promise<ApiResponse<User>> {
    return apiClient.post<User>('/api/users', userData, {
      showSuccessNotification: true,
      successMessage: 'Usuario creado exitosamente'
    })
  }
  async updateUser(id: string, userData: UpdateUserData): Promise<ApiResponse<User>> {
    return apiClient.put<User>(`/api/users/${id}`, userData, {
      showSuccessNotification: true,
      successMessage: 'Usuario actualizado exitosamente'
    })
  }
  async deleteUser(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/api/users/${id}`, {
      showSuccessNotification: true,
      successMessage: 'Usuario eliminado exitosamente'
    })
  }
  async disable2FA(id: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`/api/users/${id}/disable-2fa`, {}, {
      showSuccessNotification: true,
      successMessage: '2FA deshabilitado exitosamente'
    })
  }
  canDeleteUser(user: User): boolean {
    return !user.roles.some(role => role.level >= 80)
  }
  canEditUser(user: User): boolean {
    return !user.roles.some(role => role.level >= 80)
  }
  has2FAEnabled(user: User): boolean {
    return user.twoFactorEnabled
  }
  getUserRoleLevel(user: User): number {
    return Math.max(...user.roles.map(role => role.level), 0)
  }
  formatUserDisplayName(user: User): string {
    return user.fullName || user.email
  }
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
export const userService = new UserService()