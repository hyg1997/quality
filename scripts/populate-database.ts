import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import { config } from "dotenv";
import * as fs from "fs";
import * as path from "path";

config();

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

const SYSTEM_PERMISSIONS = [
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

  {
    name: "dashboard:read",
    displayName: "Ver Dashboard",
    resource: "dashboard",
    action: "read",
  },

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

class DatabasePopulator {
  private prisma: PrismaClient;

  constructor(prismaClient: PrismaClient) {
    this.prisma = prismaClient;
  }

  private log(
    message: string,
    type: "info" | "success" | "warning" | "error" = "info"
  ) {
    const colors = {
      info: "\x1b[36m",
      success: "\x1b[32m",
      warning: "\x1b[33m",
      error: "\x1b[31m",
    };
    const reset = "\x1b[0m";
    console.log(`${colors[type]}${message}${reset}`);
  }

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

  async createAdminUser(): Promise<string> {
    this.log("👤 Creando usuario administrador...", "info");

    try {
      const password = "admin123";
      const hashedPassword = await bcrypt.hash(password, 12);

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

  async createRolesAndPermissions(): Promise<{ adminRoleId: string }> {
    this.log("🎭 Creando roles y permisos...", "info");

    try {
      this.log("📋 Creando permisos del sistema...", "info");

      const createdPermissions = [];

      for (const permissionData of SYSTEM_PERMISSIONS) {
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
        if (adminRole.level !== 100) {
          adminRole = await this.prisma.role.update({
            where: { id: adminRole.id },
            data: { level: 100, updatedAt: new Date() },
          });
        }
        this.log("⚠️  Rol Super Admin ya existe", "warning");
      }

      this.log("🔗 Asignando permisos al rol Super Admin...", "info");

      await this.prisma.rolePermission.deleteMany({
        where: { roleId: adminRole.id },
      });

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

  async assignAdminRoleToUser(userId: string, roleId: string): Promise<void> {
    this.log("🔗 Asignando rol Super Admin al usuario...", "info");

    try {
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

  async createProducts(): Promise<void> {
    this.log("📦 Creando productos desde CSV...", "info");

    try {
      const csvPath = path.join(__dirname, "..", "PARAMETROS DE CONTROL.csv");

      if (!fs.existsSync(csvPath)) {
        this.log("⚠️ Archivo CSV no encontrado: " + csvPath, "warning");
        return;
      }

      const csvContent = fs.readFileSync(csvPath, "utf-8");
      const lines = csvContent.split("\n").filter((line) => line.trim());

      if (lines.length < 4) {
        this.log("⚠️ CSV no tiene suficientes líneas de datos", "warning");
        return;
      }

      const headers = lines[2].split(",").map((h) => h.trim());

      const masterParameters = await this.prisma.masterParameter.findMany({
        where: { active: true },
      });

      const masterParamMap = new Map(
        masterParameters.map((mp) => [mp.name, mp])
      );

      let createdProductsCount = 0;
      let createdParametersCount = 0;
      let skippedProductsCount = 0;

      for (let i = 3; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim());
        const productName = values[0];

        if (!productName || productName === "") continue;

        const existingProduct = await this.prisma.product.findFirst({
          where: { name: productName },
        });

        if (existingProduct) {
          skippedProductsCount++;
          continue;
        }

        const product = await this.prisma.product.create({
          data: {
            name: productName,
            code: this.generateProductCode(productName),
            description: `Producto de control: ${productName}`,
            active: true,
          },
        });

        createdProductsCount++;

        for (let j = 1; j < headers.length && j < values.length; j++) {
          const parameterName = headers[j];
          const parameterValue = values[j];

          if (!parameterName || !parameterValue || parameterValue === "")
            continue;

          const masterParam = masterParamMap.get(parameterName);
          if (!masterParam) continue;

          const parsedValue = this.parseParameterValue(
            parameterValue,
            masterParam.type
          );

          if (parsedValue) {
            await this.prisma.parameter.create({
              data: {
                productId: product.id,
                masterParameterId: masterParam.id,
                name: parameterName,
                type: masterParam.type,
                expectedValue: parsedValue.expectedValue,
                minRange: parsedValue.minRange,
                maxRange: parsedValue.maxRange,
                unit: masterParam.unit,
                required: true,
                active: true,
              },
            });

            createdParametersCount++;
          }
        }
      }

      this.log(`✅ Productos creados: ${createdProductsCount}`, "success");
      this.log(`✅ Parámetros creados: ${createdParametersCount}`, "success");
      this.log(
        `⏭️ Productos existentes omitidos: ${skippedProductsCount}`,
        "info"
      );
    } catch (error) {
      this.log("❌ Error creando productos: " + error, "error");
      throw error;
    }
  }

  private generateProductCode(name: string): string {
    return (
      name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .substring(0, 10) +
      "-" +
      Date.now().toString().slice(-4)
    );
  }

  private parseParameterValue(
    value: string,
    type: string
  ): {
    expectedValue?: string;
    minRange?: number;
    maxRange?: number;
  } | null {
    if (!value || value.trim() === "") return null;

    const cleanValue = value.trim();

    const plusMinusPattern = /([0-9.]+)\s*\+\/\-\s*([0-9.]+)/;
    const plusMinusMatch = cleanValue.match(plusMinusPattern);

    if (plusMinusMatch) {
      const baseValue = parseFloat(plusMinusMatch[1]);
      const tolerance = parseFloat(plusMinusMatch[2]);

      return {
        expectedValue: baseValue.toString(),
        minRange: baseValue - tolerance,
        maxRange: baseValue + tolerance,
      };
    }

    const rangePattern = /([0-9.]+)\s*-\s*([0-9.]+)/;
    const rangeMatch = cleanValue.match(rangePattern);

    if (rangeMatch) {
      const minValue = parseFloat(rangeMatch[1]);
      const maxValue = parseFloat(rangeMatch[2]);

      return {
        expectedValue: ((minValue + maxValue) / 2).toString(),
        minRange: minValue,
        maxRange: maxValue,
      };
    }

    const numericPattern = /^([0-9.]+)$/;
    const numericMatch = cleanValue.match(numericPattern);

    if (numericMatch) {
      const numValue = parseFloat(numericMatch[1]);

      if (type === "range" || type === "numeric") {
        return {
          expectedValue: numValue.toString(),
          minRange: numValue,
          maxRange: numValue,
        };
      }
    }

    return {
      expectedValue: cleanValue,
    };
  }

  async createMasterParameters(): Promise<void> {
    this.log("⚙️ Creando parámetros maestros desde CSV...", "info");

    try {
      const csvPath = path.join(__dirname, "..", "PARAMETROS DE CONTROL.csv");

      if (!fs.existsSync(csvPath)) {
        this.log("⚠️ Archivo CSV no encontrado: " + csvPath, "warning");
        return;
      }

      const csvContent = fs.readFileSync(csvPath, "utf-8");
      const lines = csvContent.split("\n").filter((line) => line.trim());

      if (lines.length < 3) {
        this.log("⚠️ CSV no tiene suficientes líneas", "warning");
        return;
      }

      const headers = lines[2].split(",").map((h) => h.trim());
      this.log(`📋 Headers encontrados: ${headers.length} columnas`, "info");

      const parameterNames = headers
        .slice(1)
        .filter((name) => name && name !== "PRODUCTO");

      let createdCount = 0;
      let skippedCount = 0;

      for (const paramName of parameterNames) {
        if (!paramName || paramName.trim() === "") continue;

        const existing = await this.prisma.masterParameter.findFirst({
          where: { name: paramName },
        });

        if (existing) {
          skippedCount++;
          continue;
        }

        let type: "range" | "text" | "numeric" = "text";
        let unit: string | undefined;

        const lowerName = paramName.toLowerCase();

        if (
          lowerName.includes("peso") ||
          lowerName.includes("gramaje") ||
          lowerName.includes("altura") ||
          lowerName.includes("ancho") ||
          lowerName.includes("largo") ||
          lowerName.includes("diámetro") ||
          lowerName.includes("capacidad") ||
          lowerName.includes("calibre")
        ) {
          type = "range";

          if (lowerName.includes("peso")) unit = "g";
          else if (lowerName.includes("gramaje")) unit = "g/m²";
          else if (
            lowerName.includes("altura") ||
            lowerName.includes("ancho") ||
            lowerName.includes("largo") ||
            lowerName.includes("diámetro")
          )
            unit = "mm";
          else if (lowerName.includes("capacidad")) unit = "ml";
          else if (lowerName.includes("calibre")) unit = "mm";
        } else if (
          lowerName.includes("ph") ||
          lowerName.includes("brix") ||
          lowerName.includes("refracción") ||
          lowerName.includes("puentes")
        ) {
          type = "numeric";

          if (lowerName.includes("brix")) unit = "°Brix";
          else if (lowerName.includes("refracción")) unit = "nD";
        }

        await this.prisma.masterParameter.create({
          data: {
            name: paramName,
            description: `Parámetro de control: ${paramName}`,
            type: type,
            unit: unit,
            active: true,
          },
        });

        createdCount++;
      }

      this.log(`✅ Parámetros maestros creados: ${createdCount}`, "success");
      this.log(`⏭️ Parámetros existentes omitidos: ${skippedCount}`, "info");
    } catch (error) {
      this.log("❌ Error creando parámetros maestros: " + error, "error");
      throw error;
    }
  }

  async populateDatabase(
    options: {
      users?: boolean;
      roles?: boolean;
      products?: boolean;
      masterParameters?: boolean;
    } = {}
  ) {
    this.log("🚀 Iniciando población de base de datos...", "info");

    const connected = await this.checkConnection();
    if (!connected) {
      throw new Error("No se pudo conectar a la base de datos");
    }

    try {
      let userId: string | undefined;
      let adminRoleId: string | undefined;

      if (options.users !== false) {
        userId = await this.createAdminUser();
      }

      if (options.roles !== false) {
        const { adminRoleId: roleId } = await this.createRolesAndPermissions();
        adminRoleId = roleId;
      }

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

  async disconnect() {
    await this.prisma.$disconnect();
  }
}

async function main() {
  const populator = new DatabasePopulator(prisma);

  try {
    const args = process.argv.slice(2);
    const options = {
      users: !args.includes("--skip-users"),
      roles: !args.includes("--skip-roles"),
      products: args.includes("--products"),
      masterParameters: args.includes("--master-parameters"),
    };

    console.log("📋 Opciones de población:", options);
    console.log("\n" + "=".repeat(60));

    await populator.populateDatabase(options);

    console.log("\n" + "=".repeat(60));
    console.log("✨ Script completado exitosamente");

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

if (require.main === module) {
  main();
}

export { DatabasePopulator };
