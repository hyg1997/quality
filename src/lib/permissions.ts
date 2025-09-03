import { Session } from "next-auth";
export interface Permission {
  id: string;
  name: string;
  displayName: string;
  resource: string;
  action: string;
}
export interface Role {
  id: string;
  name: string;
  displayName: string;
  level: number;
}
export function hasPermission(
  session: Session | null,
  permissionName: string | undefined
): boolean {
  if (!session?.user?.permissions || !permissionName) {
    return false;
  }
  if (isAdmin(session)) {
    return true;
  }
  return session.user.permissions.some(
    (permission) => permission.name === permissionName
  );
}
export function isAdmin(session: Session | null): boolean {
  if (!session?.user?.roles) {
    return false;
  }
  return session.user.roles.some((role) => role.level >= 80);
}
export function isSuperAdmin(session: Session | null): boolean {
  if (!session?.user?.roles) {
    return false;
  }
  return session.user.roles.some((role) => role.level >= 100);
}
export function getHighestRoleLevel(session: Session | null): number {
  if (!session?.user?.roles || session.user.roles.length === 0) {
    return 0;
  }
  return Math.max(...session.user.roles.map((role) => role.level));
}
export function hasRole(session: Session | null, roleName: string): boolean {
  if (!session?.user?.roles) {
    return false;
  }
  return session.user.roles.some((role) => role.name === roleName);
}
export function hasMinimumRoleLevel(
  session: Session | null,
  minimumLevel: number
): boolean {
  return getHighestRoleLevel(session) >= minimumLevel;
}
export function hasAnyPermission(
  session: Session | null,
  permissionNames: string[]
): boolean {
  if (!session?.user?.permissions) {
    return false;
  }
  if (isAdmin(session)) {
    return true;
  }
  return permissionNames.some((permissionName) =>
    session.user.permissions.some(
      (permission) => permission.name === permissionName
    )
  );
}
export function hasAllPermissions(
  session: Session | null,
  permissionNames: string[]
): boolean {
  if (!session?.user?.permissions) {
    return false;
  }
  if (isAdmin(session)) {
    return true;
  }
  return permissionNames.every((permissionName) =>
    session.user.permissions.some(
      (permission) => permission.name === permissionName
    )
  );
}
export function getPermissionsByResource(
  session: Session | null,
  resource: string
): Permission[] {
  if (!session?.user?.permissions) {
    return [];
  }
  return session.user.permissions.filter(
    (permission) => permission.resource === resource
  );
}
export function canPerformAction(
  session: Session | null,
  resource: string,
  action: string
): boolean {
  if (!session?.user?.permissions) {
    return false;
  }
  if (isAdmin(session)) {
    return true;
  }
  return session.user.permissions.some(
    (permission) =>
      permission.resource === resource && permission.action === action
  );
}
export const PERMISSIONS = {
  USERS: {
    CREATE: "users:create",
    READ: "users:read",
    UPDATE: "users:update",
    DELETE: "users:delete",
  },
  ROLES: {
    CREATE: "roles:create",
    READ: "roles:read",
    UPDATE: "roles:update",
    DELETE: "roles:delete",
  },
  PERMISSIONS: {
    READ: "permissions:read",
    ASSIGN: "permissions:assign",
  },
  DASHBOARD: {
    READ: "dashboard:read",
  },
  ANALYTICS: {
    READ: "analytics:read",
  },
  SYSTEM: {
    SETTINGS: "system:settings",
    BACKUP: "system:backup",
    AUDIT: "system:audit",
  },
  CONTENT: {
    CREATE: "content:create",
    READ: "content:read",
    UPDATE: "content:update",
    DELETE: "content:delete",
    PUBLISH: "content:publish",
  },
  PRODUCTS: {
    CREATE: "content:create",
    READ: "content:read",
    UPDATE: "content:update",
    DELETE: "content:delete",
  },
  RECORDS: {
    CREATE: "content:create",
    READ: "content:read",
    UPDATE: "content:update",
    DELETE: "content:delete",
    APPROVE: "content:publish",
  },
  REPORTS: {
    READ: "analytics:read",
    EXPORT: "analytics:export",
  },
} as const;
