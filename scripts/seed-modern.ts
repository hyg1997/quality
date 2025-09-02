import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Iniciando seed del sistema moderno de autenticación...");

  // ============================================================================
  // 1. CREAR PERMISOS DEL SISTEMA
  // ============================================================================

  const permissions = [
    // User Management
    {
      name: "users:create",
      displayName: "Crear Usuarios",
      resource: "users",
      action: "create",
      description: "Crear nuevos usuarios en el sistema",
    },
    {
      name: "users:read",
      displayName: "Ver Usuarios",
      resource: "users",
      action: "read",
      description: "Ver lista y detalles de usuarios",
    },
    {
      name: "users:update",
      displayName: "Editar Usuarios",
      resource: "users",
      action: "update",
      description: "Modificar información de usuarios",
    },
    {
      name: "users:delete",
      displayName: "Eliminar Usuarios",
      resource: "users",
      action: "delete",
      description: "Eliminar usuarios del sistema",
    },

    // Role Management
    {
      name: "roles:create",
      displayName: "Crear Roles",
      resource: "roles",
      action: "create",
      description: "Crear nuevos roles",
    },
    {
      name: "roles:read",
      displayName: "Ver Roles",
      resource: "roles",
      action: "read",
      description: "Ver roles del sistema",
    },
    {
      name: "roles:update",
      displayName: "Editar Roles",
      resource: "roles",
      action: "update",
      description: "Modificar roles existentes",
    },
    {
      name: "roles:delete",
      displayName: "Eliminar Roles",
      resource: "roles",
      action: "delete",
      description: "Eliminar roles del sistema",
    },

    // Permission Management
    {
      name: "permissions:read",
      displayName: "Ver Permisos",
      resource: "permissions",
      action: "read",
      description: "Ver permisos del sistema",
    },
    {
      name: "permissions:assign",
      displayName: "Asignar Permisos",
      resource: "permissions",
      action: "assign",
      description: "Asignar permisos a roles",
    },

    // Dashboard & Analytics
    {
      name: "dashboard:read",
      displayName: "Ver Dashboard",
      resource: "dashboard",
      action: "read",
      description: "Acceder al panel principal",
    },
    {
      name: "analytics:read",
      displayName: "Ver Analíticas",
      resource: "analytics",
      action: "read",
      description: "Ver reportes y estadísticas",
    },

    // System Administration
    {
      name: "system:settings",
      displayName: "Configurar Sistema",
      resource: "system",
      action: "settings",
      description: "Acceder a configuración del sistema",
    },
    {
      name: "system:backup",
      displayName: "Respaldos",
      resource: "system",
      action: "backup",
      description: "Crear y gestionar respaldos",
    },
    {
      name: "system:audit",
      displayName: "Ver Auditoría",
      resource: "system",
      action: "audit",
      description: "Acceder a logs de auditoría",
    },

    // Content Management
    {
      name: "content:create",
      displayName: "Crear Contenido",
      resource: "content",
      action: "create",
      description: "Crear nuevo contenido",
    },
    {
      name: "content:read",
      displayName: "Ver Contenido",
      resource: "content",
      action: "read",
      description: "Ver contenido del sistema",
    },
    {
      name: "content:update",
      displayName: "Editar Contenido",
      resource: "content",
      action: "update",
      description: "Modificar contenido existente",
    },
    {
      name: "content:delete",
      displayName: "Eliminar Contenido",
      resource: "content",
      action: "delete",
      description: "Eliminar contenido",
    },
    {
      name: "content:publish",
      displayName: "Publicar Contenido",
      resource: "content",
      action: "publish",
      description: "Publicar y despublicar contenido",
    },
  ];

  console.log("📋 Creando permisos...");
  for (const permissionData of permissions) {
    await prisma.permission.upsert({
      where: { name: permissionData.name },
      update: {},
      create: permissionData,
    });
    console.log(`✅ Permiso: ${permissionData.displayName}`);
  }

  // ============================================================================
  // 2. CREAR ROLES DEL SISTEMA
  // ============================================================================

  const roles = [
    {
      name: "super_admin",
      displayName: "Super Administrador",
      description:
        "Acceso completo al sistema, incluyendo gestión de usuarios y configuración",
      level: 100,
      isSystem: true,
    },
    {
      name: "admin",
      displayName: "Administrador",
      description:
        "Administrador con permisos de gestión de usuarios y contenido",
      level: 80,
      isSystem: true,
    },
    {
      name: "manager",
      displayName: "Gerente",
      description: "Gestión de contenido y supervisión de operaciones",
      level: 60,
      isSystem: false,
    },
    {
      name: "editor",
      displayName: "Editor",
      description: "Creación y edición de contenido",
      level: 40,
      isSystem: false,
    },
    {
      name: "user",
      displayName: "Usuario",
      description: "Usuario básico con acceso limitado",
      level: 20,
      isSystem: true,
    },
    {
      name: "viewer",
      displayName: "Visualizador",
      description: "Solo lectura, sin permisos de edición",
      level: 10,
      isSystem: false,
    },
  ];

  console.log("👥 Creando roles...");
  for (const roleData of roles) {
    await prisma.role.upsert({
      where: { name: roleData.name },
      update: {},
      create: roleData,
    });
    console.log(`✅ Rol: ${roleData.displayName} (Nivel ${roleData.level})`);
  }

  // ============================================================================
  // 3. ASIGNAR PERMISOS A ROLES
  // ============================================================================

  const rolePermissions = [
    // Super Admin - Todos los permisos
    {
      roleName: "super_admin",
      permissions: permissions.map((p) => p.name),
    },

    // Admin - Gestión completa excepto sistema crítico
    {
      roleName: "admin",
      permissions: [
        "users:create",
        "users:read",
        "users:update",
        "users:delete",
        "roles:read",
        "roles:update",
        "permissions:read",
        "permissions:assign",
        "dashboard:read",
        "analytics:read",
        "content:create",
        "content:read",
        "content:update",
        "content:delete",
        "content:publish",
        "system:audit",
      ],
    },

    // Manager - Gestión de contenido y supervisión
    {
      roleName: "manager",
      permissions: [
        "users:read",
        "roles:read",
        "permissions:read",
        "dashboard:read",
        "analytics:read",
        "content:create",
        "content:read",
        "content:update",
        "content:delete",
        "content:publish",
      ],
    },

    // Editor - Creación y edición de contenido
    {
      roleName: "editor",
      permissions: [
        "dashboard:read",
        "content:create",
        "content:read",
        "content:update",
      ],
    },

    // User - Acceso básico
    {
      roleName: "user",
      permissions: ["dashboard:read", "content:read"],
    },

    // Viewer - Solo lectura
    {
      roleName: "viewer",
      permissions: ["dashboard:read", "content:read"],
    },
  ];

  console.log("🔗 Asignando permisos a roles...");
  for (const rolePermissionData of rolePermissions) {
    const role = await prisma.role.findUnique({
      where: { name: rolePermissionData.roleName },
    });

    if (role) {
      for (const permissionName of rolePermissionData.permissions) {
        const permission = await prisma.permission.findUnique({
          where: { name: permissionName },
        });

        if (permission) {
          await prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: role.id,
                permissionId: permission.id,
              },
            },
            update: {},
            create: {
              roleId: role.id,
              permissionId: permission.id,
            },
          });
        }
      }
      console.log(
        `✅ Permisos asignados a: ${role.displayName} (${rolePermissionData.permissions.length} permisos)`
      );
    }
  }

  // ============================================================================
  // 4. CREAR USUARIOS DEL SISTEMA
  // ============================================================================

  const users = [
    {
      email: "admin@empresa.com",
      username: "admin",
      fullName: "Administrador del Sistema",
      password: await bcrypt.hash("admin123", 12),
      status: "ACTIVE",
      emailVerified: new Date(),
      roleName: "super_admin",
    },
    {
      email: "martha@empresa.com",
      username: "martha",
      fullName: "Martha Limo Figueroa",
      password: await bcrypt.hash("martha123", 12),
      status: "ACTIVE",
      emailVerified: new Date(),
      roleName: "manager",
    },
    {
      email: "mariano@empresa.com",
      username: "mariano",
      fullName: "Mariano Castro Limo",
      password: await bcrypt.hash("mariano123", 12),
      status: "ACTIVE",
      emailVerified: new Date(),
      roleName: "editor",
    },
    {
      email: "viewer@empresa.com",
      username: "viewer",
      fullName: "Usuario Visualizador",
      password: await bcrypt.hash("viewer123", 12),
      status: "ACTIVE",
      emailVerified: new Date(),
      roleName: "viewer",
    },
    {
      email: "demo@empresa.com",
      username: "demo",
      fullName: "Usuario Demo",
      password: await bcrypt.hash("demo123", 12),
      status: "ACTIVE",
      emailVerified: new Date(),
      roleName: "user",
    },
  ];

  console.log("👤 Creando usuarios...");
  for (const userData of users) {
    const { roleName, ...userCreateData } = userData;

    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: userCreateData,
    });

    // Asignar rol al usuario
    const role = await prisma.role.findUnique({
      where: { name: roleName },
    });

    if (role) {
      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId: role.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          roleId: role.id,
        },
      });
      console.log(
        `✅ Usuario: ${user.fullName} (${user.email}) - Rol: ${role.displayName}`
      );
    }
  }

  // ============================================================================
  // 5. CREAR LOG DE AUDITORÍA INICIAL
  // ============================================================================

  const adminUser = await prisma.user.findUnique({
    where: { email: "admin@empresa.com" },
  });

  if (adminUser) {
    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: 'system.seed',
        resource: 'system',
        metadata: JSON.stringify({
          message: 'Sistema inicializado con datos de prueba',
          usersCreated: users.length,
          rolesCreated: roles.length,
          permissionsCreated: permissions.length
        })
      }
    });
    console.log("📝 Log de auditoría inicial creado");
  }

  console.log(
    "\n🎉 ¡Sistema moderno de autenticación inicializado exitosamente!"
  );
  console.log("\n📊 Resumen:");
  console.log(`   • ${permissions.length} permisos creados`);
  console.log(`   • ${roles.length} roles configurados`);
  console.log(`   • ${users.length} usuarios de prueba`);
  console.log("\n👥 Usuarios disponibles:");
  console.log("   🔑 admin@empresa.com / admin123 (Super Administrador)");
  console.log("   👩‍💼 martha@empresa.com / martha123 (Gerente)");
  console.log("   👨‍💻 mariano@empresa.com / mariano123 (Editor)");
  console.log("   👁️ viewer@empresa.com / viewer123 (Visualizador)");
  console.log("   👤 demo@empresa.com / demo123 (Usuario)");
  console.log("\n🌐 Accede al sistema en: http://localhost:3000");
}

main()
  .catch((e) => {
    console.error("❌ Error durante el seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
