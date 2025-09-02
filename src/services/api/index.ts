// Export all API services
export { apiClient, ApiClient } from './base'
export type { ApiResponse, ApiOptions } from './base'

export { userService, UserService } from './users'
export type { User, UserRole, CreateUserData, UpdateUserData } from './users'

export { roleService, RoleService } from './roles'
export type { Role, Permission, CreateRoleData, UpdateRoleData, PermissionsResponse } from './roles'

export { recordService, RecordService } from './records'
export type { ProductRecord, CreateRecordData, UpdateRecordData, RecordsQueryParams } from './records'

export { controlService, ControlService } from './controls'
export type { Control, Photo, QualityControlRecord, CreateControlData, CreatePhotoData, ParameterForControl } from './controls'