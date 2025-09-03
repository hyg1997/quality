import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import { config } from "dotenv";

// Cargar variables de entorno
config();

// Configurar cliente Turso
createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const adapter = new PrismaLibSQL({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const prisma = new PrismaClient({
  adapter,
});

// ============================================================================
// DEFINICIÓN DE PERMISOS DEL SISTEMA
// ============================================================================

const SYSTEM_PERMISSIONS = [
  // Usuarios
  {
    name: "users:create",
    displayName: "Crear Usuarios",
    resource: "users",
    action: "create",
  },
  {
    name: "users:read",
    displayName: "Leer Usuarios",
    resource: "users",
    action: "read",
  },
  {
    name: "users:update",
    displayName: "Actualizar Usuarios",
    resource: "users",
    action: "update",
  },
  {
    name: "users:delete",
    displayName: "Eliminar Usuarios",
    resource: "users",
    action: "delete",
  },

  // Roles
  {
    name: "roles:create",
    displayName: "Crear Roles",
    resource: "roles",
    action: "create",
  },
  {
    name: "roles:read",
    displayName: "Leer Roles",
    resource: "roles",
    action: "read",
  },
  {
    name: "roles:update",
    displayName: "Actualizar Roles",
    resource: "roles",
    action: "update",
  },
  {
    name: "roles:delete",
    displayName: "Eliminar Roles",
    resource: "roles",
    action: "delete",
  },

  // Permisos
  {
    name: "permissions:read",
    displayName: "Leer Permisos",
    resource: "permissions",
    action: "read",
  },
  {
    name: "permissions:assign",
    displayName: "Asignar Permisos",
    resource: "permissions",
    action: "assign",
  },

  // Dashboard
  {
    name: "dashboard:read",
    displayName: "Ver Dashboard",
    resource: "dashboard",
    action: "read",
  },

  // Analytics
  {
    name: "analytics:read",
    displayName: "Ver Analytics",
    resource: "analytics",
    action: "read",
  },
  {
    name: "analytics:export",
    displayName: "Exportar Analytics",
    resource: "analytics",
    action: "export",
  },

  // Sistema
  {
    name: "system:settings",
    displayName: "Configuración del Sistema",
    resource: "system",
    action: "settings",
  },
  {
    name: "system:backup",
    displayName: "Backup del Sistema",
    resource: "system",
    action: "backup",
  },
  {
    name: "system:audit",
    displayName: "Auditoría del Sistema",
    resource: "system",
    action: "audit",
  },

  // Contenido (Productos, Registros, etc.)
  {
    name: "content:create",
    displayName: "Crear Contenido",
    resource: "content",
    action: "create",
  },
  {
    name: "content:read",
    displayName: "Leer Contenido",
    resource: "content",
    action: "read",
  },
  {
    name: "content:update",
    displayName: "Actualizar Contenido",
    resource: "content",
    action: "update",
  },
  {
    name: "content:delete",
    displayName: "Eliminar Contenido",
    resource: "content",
    action: "delete",
  },
  {
    name: "content:publish",
    displayName: "Publicar Contenido",
    resource: "content",
    action: "publish",
  },
];

// ============================================================================
// UTILIDADES GENERALES
// ============================================================================

class DatabasePopulator {
  private prisma: PrismaClient;

  constructor(prismaClient: PrismaClient) {
    this.prisma = prismaClient;
  }

  // Método para logging con colores
  private log(
    message: string,
    type: "info" | "success" | "warning" | "error" = "info"
  ) {
    const colors = {
      info: "\x1b[36m", // Cyan
      success: "\x1b[32m", // Green
      warning: "\x1b[33m", // Yellow
      error: "\x1b[31m", // Red
    };
    const reset = "\x1b[0m";
    console.log(`${colors[type]}${message}${reset}`);
  }

  // Verificar conexión a la base de datos
  async checkConnection(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      this.log("✅ Conexión a Turso establecida correctamente", "success");
      return true;
    } catch (error) {
      this.log("❌ Error conectando a Turso: " + error, "error");
      return false;
    }
  }

  // ============================================================================
  // USUARIOS
  // ============================================================================

  async createAdminUser(): Promise<string> {
    this.log("👤 Creando usuario administrador...", "info");

    try {
      const password = "admin123";
      const hashedPassword = await bcrypt.hash(password, 12);

      // Verificar si ya existe
      let existingUser = await this.prisma.user.findFirst({
        where: {
          OR: [{ email: "admin@sistema.com" }, { username: "admin" }],
        },
      });

      if (existingUser) {
        this.log("⚠️  Usuario admin ya existe. Actualizando...", "warning");

        existingUser = await this.prisma.user.update({
          where: { id: existingUser.id },
          data: {
            password: hashedPassword,
            status: "ACTIVE",
            updatedAt: new Date(),
          },
        });

        this.log("✅ Usuario admin actualizado", "success");
      } else {
        existingUser = await this.prisma.user.create({
          data: {
            email: "admin@sistema.com",
            username: "admin",
            fullName: "Administrador del Sistema",
            password: hashedPassword,
            status: "ACTIVE",
            twoFactorEnabled: false,
            emailVerified: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        this.log(
          `✅ Usuario admin creado con ID: ${existingUser.id}`,
          "success"
        );
      }

      // Verificar hash
      const isValid = await bcrypt.compare(password, hashedPassword);
      this.log(
        `🔍 Verificación del hash: ${isValid ? "✅ Correcto" : "❌ Error"}`,
        isValid ? "success" : "error"
      );

      return existingUser.id;
    } catch (error) {
      this.log("❌ Error creando usuario admin: " + error, "error");
      throw error;
    }
  }

  // ============================================================================
  // ROLES Y PERMISOS
  // ============================================================================

  async createRolesAndPermissions(): Promise<{ adminRoleId: string }> {
    this.log("🎭 Creando roles y permisos...", "info");

    try {
      // 1. Crear todos los permisos
      this.log("📋 Creando permisos del sistema...", "info");

      const createdPermissions = [];

      for (const permissionData of SYSTEM_PERMISSIONS) {
        // Verificar si el permiso ya existe
        let permission = await this.prisma.permission.findUnique({
          where: { name: permissionData.name },
        });

        if (!permission) {
          permission = await this.prisma.permission.create({
            data: {
              name: permissionData.name,
              displayName: permissionData.displayName,
              resource: permissionData.resource,
              action: permissionData.action,
              description: `Permiso para ${permissionData.displayName.toLowerCase()}`,
              createdAt: new Date(),
            },
          });
          this.log(`  ✅ Permiso creado: ${permission.name}`, "success");
        } else {
          this.log(`  ⚠️  Permiso ya existe: ${permission.name}`, "warning");
        }

        createdPermissions.push(permission);
      }

      this.log(`📋 Total permisos: ${createdPermissions.length}`, "info");

      // 2. Crear rol de Super Administrador
      this.log("👑 Creando rol Super Administrador...", "info");

      let adminRole = await this.prisma.role.findUnique({
        where: { name: "super_admin" },
      });

      if (!adminRole) {
        adminRole = await this.prisma.role.create({
          data: {
            name: "super_admin",
            displayName: "Super Administrador",
            description: "Acceso completo al sistema con todos los permisos",
            level: 100,
            isSystem: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        this.log(
          `✅ Rol Super Admin creado con ID: ${adminRole.id}`,
          "success"
        );
      } else {
        // Actualizar el nivel si es necesario
        if (adminRole.level !== 100) {
          adminRole = await this.prisma.role.update({
            where: { id: adminRole.id },
            data: { level: 100, updatedAt: new Date() },
          });
        }
        this.log("⚠️  Rol Super Admin ya existe", "warning");
      }

      // 3. Asignar TODOS los permisos al rol admin
      this.log("🔗 Asignando permisos al rol Super Admin...", "info");

      // Eliminar permisos existentes del rol
      await this.prisma.rolePermission.deleteMany({
        where: { roleId: adminRole.id },
      });

      // Crear nuevas asignaciones de permisos
      const rolePermissions = createdPermissions.map((permission) => ({
        roleId: adminRole.id,
        permissionId: permission.id,
      }));

      await this.prisma.rolePermission.createMany({
        data: rolePermissions,
      });

      this.log(
        `✅ ${rolePermissions.length} permisos asignados al rol Super Admin`,
        "success"
      );

      return { adminRoleId: adminRole.id };
    } catch (error) {
      this.log("❌ Error creando roles y permisos: " + error, "error");
      throw error;
    }
  }

  // ============================================================================
  // ASIGNAR ROL AL USUARIO
  // ============================================================================

  async assignAdminRoleToUser(userId: string, roleId: string): Promise<void> {
    this.log("🔗 Asignando rol Super Admin al usuario...", "info");

    try {
      // Verificar si ya tiene el rol asignado
      const existingUserRole = await this.prisma.userRole.findUnique({
        where: {
          userId_roleId: {
            userId: userId,
            roleId: roleId,
          },
        },
      });

      if (!existingUserRole) {
        await this.prisma.userRole.create({
          data: {
            userId: userId,
            roleId: roleId,
            grantedAt: new Date(),
          },
        });
        this.log("✅ Rol Super Admin asignado al usuario", "success");
      } else {
        this.log("⚠️  Usuario ya tiene el rol Super Admin asignado", "warning");
      }
    } catch (error) {
      this.log("❌ Error asignando rol al usuario: " + error, "error");
      throw error;
    }
  }

  // ============================================================================
  // PRODUCTOS
  // ============================================================================

  async createProducts(): Promise<void> {
    this.log("📦 Creando productos...", "info");

    try {
      // TODO: Implementar creación de productos
      this.log("⏳ Productos - Pendiente de implementar", "warning");
    } catch (error) {
      this.log("❌ Error creando productos: " + error, "error");
      throw error;
    }
  }

  // ============================================================================
  // PARÁMETROS MAESTROS
  // ============================================================================

  async createMasterParameters(): Promise<void> {
    this.log("⚙️ Creando parámetros maestros...", "info");

    try {
      // TODO: Implementar creación de parámetros maestros
      this.log("⏳ Parámetros maestros - Pendiente de implementar", "warning");
    } catch (error) {
      this.log("❌ Error creando parámetros maestros: " + error, "error");
      throw error;
    }
  }

  // ============================================================================
  // MÉTODO PRINCIPAL
  // ============================================================================

  async populateDatabase(
    options: {
      users?: boolean;
      roles?: boolean;
      products?: boolean;
      masterParameters?: boolean;
    } = {}
  ) {
    this.log("🚀 Iniciando población de base de datos...", "info");

    // Verificar conexión
    const connected = await this.checkConnection();
    if (!connected) {
      throw new Error("No se pudo conectar a la base de datos");
    }

    try {
      let userId: string | undefined;
      let adminRoleId: string | undefined;

      // Ejecutar según opciones
      if (options.users !== false) {
        userId = await this.createAdminUser();
      }

      if (options.roles !== false) {
        const { adminRoleId: roleId } = await this.createRolesAndPermissions();
        adminRoleId = roleId;
      }

      // Asignar rol al usuario si ambos existen
      if (userId && adminRoleId) {
        await this.assignAdminRoleToUser(userId, adminRoleId);
      }

      if (options.products) {
        await this.createProducts();
      }

      if (options.masterParameters) {
        await this.createMasterParameters();
      }

      this.log("🎉 ¡Población de base de datos completada!", "success");
    } catch (error) {
      this.log("💥 Error durante la población: " + error, "error");
      throw error;
    }
  }

  // Cerrar conexión
  async disconnect() {
    await this.prisma.$disconnect();
  }
}

// ============================================================================
// EJECUCIÓN DEL SCRIPT
// ============================================================================

async function main() {
  const populator = new DatabasePopulator(prisma);

  try {
    // Obtener argumentos de línea de comandos
    const args = process.argv.slice(2);
    const options = {
      users: !args.includes("--skip-users"),
      roles: !args.includes("--skip-roles"), // Por defecto crear roles
      products: args.includes("--products"),
      masterParameters: args.includes("--master-parameters"),
    };

    console.log("📋 Opciones de población:", options);
    console.log("\n" + "=".repeat(60));

    await populator.populateDatabase(options);

    console.log("\n" + "=".repeat(60));
    console.log("✨ Script completado exitosamente");

    // Mostrar credenciales
    if (options.users) {
      console.log("\n🔑 Credenciales de acceso:");
      console.log("   Email: admin@sistema.com");
      console.log("   Usuario: admin");
      console.log("   Password: admin123");
      console.log("   Rol: Super Administrador (Level 100)");
      console.log("   Permisos: TODOS los permisos del sistema");
    }
  } catch (error) {
    console.error("💥 Error fatal:", error);
    process.exit(1);
  } finally {
    await populator.disconnect();
  }
}

// Ejecutar si es el archivo principal
if (require.main === module) {
  main();
}

export { DatabasePopulator };
