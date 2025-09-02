import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed de la base de datos...");

  // 1. Crear Permisos
  console.log("📋 Creando permisos...");
  const permissions = [
    {
      name: "users:read",
      displayName: "Leer Usuarios",
      resource: "users",
      action: "read",
      description: "Leer usuarios",
    },
    {
      name: "users:create",
      displayName: "Crear Usuarios",
      resource: "users",
      action: "create",
      description: "Crear usuarios",
    },
    {
      name: "users:update",
      displayName: "Actualizar Usuarios",
      resource: "users",
      action: "update",
      description: "Actualizar usuarios",
    },
    {
      name: "users:delete",
      displayName: "Eliminar Usuarios",
      resource: "users",
      action: "delete",
      description: "Eliminar usuarios",
    },
    {
      name: "content:read",
      displayName: "Leer Contenido",
      resource: "content",
      action: "read",
      description: "Leer contenido",
    },
    {
      name: "content:create",
      displayName: "Crear Contenido",
      resource: "content",
      action: "create",
      description: "Crear contenido",
    },
    {
      name: "content:update",
      displayName: "Actualizar Contenido",
      resource: "content",
      action: "update",
      description: "Actualizar contenido",
    },
    {
      name: "content:delete",
      displayName: "Eliminar Contenido",
      resource: "content",
      action: "delete",
      description: "Eliminar contenido",
    },
    {
      name: "analytics:read",
      displayName: "Leer Reportes",
      resource: "analytics",
      action: "read",
      description: "Leer reportes",
    },
    {
      name: "analytics:export",
      displayName: "Exportar Reportes",
      resource: "analytics",
      action: "export",
      description: "Exportar reportes",
    },
    {
      name: "system:admin",
      displayName: "Administrar Sistema",
      resource: "system",
      action: "admin",
      description: "Administración del sistema",
    },
  ];

  const createdPermissions = [];
  for (const permission of permissions) {
    const created = await prisma.permission.upsert({
      where: { name: permission.name },
      update: permission,
      create: permission,
    });
    createdPermissions.push(created);
    console.log(`  ✓ Permiso: ${permission.name}`);
  }

  // 2. Crear Roles
  console.log("👥 Creando roles...");
  const adminRole = await prisma.role.upsert({
    where: { name: "administrador" },
    update: {},
    create: {
      name: "administrador",
      displayName: "Administrador",
      description: "Acceso completo al sistema",
      level: 100,
    },
  });

  const trabajadorRole = await prisma.role.upsert({
    where: { name: "trabajador" },
    update: {},
    create: {
      name: "trabajador",
      displayName: "Trabajador",
      description: "Operaciones básicas del sistema",
      level: 50,
    },
  });

  const superAdminRole = await prisma.role.upsert({
    where: { name: "superadmin" },
    update: {},
    create: {
      name: "superadmin",
      displayName: "Super Administrador",
      description: "Acceso total al sistema - Root",
      level: 200,
    },
  });

  console.log("  ✓ Rol administrador creado");
  console.log("  ✓ Rol trabajador creado");
  console.log("  ✓ Rol super administrador creado");

  // 3. Asignar Permisos a Roles
  console.log("🔗 Asignando permisos a roles...");

  // Super Admin obtiene todos los permisos
  for (const permission of createdPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: superAdminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: superAdminRole.id,
        permissionId: permission.id,
      },
    });
  }

  // Admin obtiene todos los permisos
  for (const permission of createdPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: permission.id,
      },
    });
  }

  // Trabajador obtiene permisos de contenido (sin delete)
  const trabajadorPermissions = createdPermissions.filter(
    (p) => p.resource === "content" && p.action !== "delete"
  );
  for (const permission of trabajadorPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: trabajadorRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: trabajadorRole.id,
        permissionId: permission.id,
      },
    });
  }

  console.log("  ✓ Permisos asignados a roles");

  // 4. Crear Usuario Admin
  console.log("👤 Creando usuario admin...");
  const hashedPassword = await bcrypt.hash("123456", 12);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@sistema.com" },
    update: {},
    create: {
      email: "admin@sistema.com",
      username: "admin",
      fullName: "Administrador del Sistema",
      password: hashedPassword,
      emailVerified: new Date(),
      status: "ACTIVE",
    },
  });

  console.log("  ✓ Usuario admin: admin@sistema.com (password: 123456)");

  // 5. Asignar Rol Super Admin al Usuario
  console.log("🔗 Asignando rol super admin al usuario...");
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: superAdminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: superAdminRole.id,
    },
  });

  console.log("  ✓ Rol super admin asignado al usuario");

  // 6. Crear Parámetros Maestros (basados en el PHP)
  console.log("📏 Creando parámetros maestros...");
  const masterParametersFromPHP = [
    {
      name: "COLOR",
      description: "Color del producto",
      type: "text",
      defaultValue: "Transparente",
      active: true,
    },
    {
      name: "PESO",
      description: "Peso del producto",
      type: "range",
      defaultValue: "1",
      minRange: 0,
      maxRange: 100,
      unit: "kg",
      active: true,
    },
    {
      name: "GRAMAJE",
      description: "Gramaje del producto",
      type: "range",
      defaultValue: "100",
      minRange: 0,
      maxRange: 1000,
      unit: "g",
      active: true,
    },
    {
      name: "ANCHO",
      description: "Ancho del producto",
      type: "range",
      defaultValue: "10",
      minRange: 0,
      maxRange: 100,
      unit: "cm",
      active: true,
    },
    {
      name: "ALTURA",
      description: "Altura del producto",
      type: "range",
      defaultValue: "10",
      minRange: 0,
      maxRange: 100,
      unit: "cm",
      active: true,
    },
    {
      name: "LARGO",
      description: "Largo del producto",
      type: "range",
      defaultValue: "10",
      minRange: 0,
      maxRange: 100,
      unit: "cm",
      active: true,
    },
    {
      name: "DIÁMETRO EXTERNO",
      description: "Diámetro externo",
      type: "range",
      defaultValue: "5",
      minRange: 0,
      maxRange: 50,
      unit: "mm",
      active: true,
    },
    {
      name: "DIÁMETRO EXTERNO BOCA",
      description: "Diámetro externo de la boca",
      type: "range",
      defaultValue: "3",
      minRange: 0,
      maxRange: 30,
      unit: "mm",
      active: true,
    },
    {
      name: "DIÁMETRO",
      description: "Diámetro del producto",
      type: "range",
      defaultValue: "5",
      minRange: 0,
      maxRange: 50,
      unit: "mm",
      active: true,
    },
    {
      name: "DIAMETRO SUPERIOR",
      description: "Diámetro superior",
      type: "range",
      defaultValue: "5",
      minRange: 0,
      maxRange: 50,
      unit: "mm",
      active: true,
    },
    {
      name: "DIAMETRO INFERIOR",
      description: "Diámetro inferior",
      type: "range",
      defaultValue: "5",
      minRange: 0,
      maxRange: 50,
      unit: "mm",
      active: true,
    },
    {
      name: "N° PUENTES DE UNIÓN",
      description: "Número de puentes de unión",
      type: "numeric",
      defaultValue: "4",
      unit: "unidades",
      active: true,
    },
    {
      name: "FUELLE",
      description: "Medida del fuelle",
      type: "range",
      defaultValue: "2",
      minRange: 0,
      maxRange: 20,
      unit: "mm",
      active: true,
    },
    {
      name: "CAPACIDAD DE REBOSE",
      description: "Capacidad de rebose",
      type: "range",
      defaultValue: "500",
      minRange: 0,
      maxRange: 5000,
      unit: "ml",
      active: true,
    },
    {
      name: "CALIBRE",
      description: "Calibre del producto",
      type: "range",
      defaultValue: "1",
      minRange: 0,
      maxRange: 10,
      unit: "mm",
      active: true,
    },
    {
      name: "APARIENCIA",
      description: "Apariencia del producto",
      type: "text",
      defaultValue: "Normal",
      active: true,
    },
    {
      name: "BASE DOSIFICADOR",
      description: "Base del dosificador",
      type: "text",
      defaultValue: "Estándar",
      active: true,
    },
    {
      name: "OLOR",
      description: "Olor del producto",
      type: "text",
      defaultValue: "Característico",
      active: true,
    },
    {
      name: "SABOR",
      description: "Sabor del producto",
      type: "text",
      defaultValue: "Característico",
      active: true,
    },
    {
      name: "TEXTURA",
      description: "Textura del producto",
      type: "text",
      defaultValue: "Lisa",
      active: true,
    },
    {
      name: "INDICE DE REFRACCIÓN",
      description: "Índice de refracción",
      type: "range",
      defaultValue: "1.4",
      minRange: 1,
      maxRange: 2,
      unit: "n",
      active: true,
    },
    {
      name: "°Brix",
      description: "Grados Brix",
      type: "range",
      defaultValue: "10",
      minRange: 0,
      maxRange: 100,
      unit: "°Bx",
      active: true,
    },
    {
      name: "pH",
      description: "Nivel de pH",
      type: "range",
      defaultValue: "7",
      minRange: 0,
      maxRange: 14,
      unit: "pH",
      active: true,
    },
    {
      name: "MATERIA EXTRAÑA",
      description: "Presencia de materia extraña",
      type: "text",
      defaultValue: "Ausente",
      active: true,
    },
    {
      name: "DISTANCIA",
      description: "Distancia de medición",
      type: "range",
      defaultValue: "10",
      minRange: 0,
      maxRange: 100,
      unit: "cm",
      active: true,
    },
  ];

  const createdMasterParameters = [];
  for (const masterParam of masterParametersFromPHP) {
    const created = await prisma.masterParameter.upsert({
      where: { name: masterParam.name },
      update: masterParam,
      create: masterParam,
    });
    createdMasterParameters.push(created);
    console.log(`  ✓ Parámetro Maestro: ${masterParam.name}`);
  }

  // 7. Crear Productos (basados en el PHP - muestra representativa)
  console.log("📦 Creando productos...");
  const productsFromPHP = [
    {
      name: "Tapa PET # 45",
      code: "TPT-45",
      description: "Tapa de PET número 45 para botellas",
      active: true,
    },
    {
      name: "Bolsa pack aceituna x 240g",
      code: "BPA-240",
      description: "Bolsa empaque para aceitunas de 240 gramos",
      active: true,
    },
    {
      name: "Bolsa doy pack c/válvula x 1 kg",
      code: "BDP-1K",
      description: "Bolsa doy pack con válvula de 1 kilogramo",
      active: true,
    },
    {
      name: "Botella PET x 1.9 L",
      code: "BPT-1.9L",
      description: "Botella de PET de 1.9 litros",
      active: true,
    },
    {
      name: "Galonera PET x 3.785 L",
      code: "GPT-3.785L",
      description: "Galonera de PET de 3.785 litros",
      active: true,
    },
    {
      name: "Botella PET x 1 L",
      code: "BPT-1L",
      description: "Botella de PET de 1 litro",
      active: true,
    },
    {
      name: "Botella oscura x 250 ml",
      code: "BO-250ML",
      description: "Botella oscura de 250 mililitros",
      active: true,
    },
    {
      name: "Botella transparente x 250 ml",
      code: "BT-250ML",
      description: "Botella transparente de 250 mililitros",
      active: true,
    },
    {
      name: "Caja N° 2 Aceite x 200 ml",
      code: "CA2-200ML",
      description: "Caja número 2 para aceite de 200 ml",
      active: true,
    },
    {
      name: "Aceite de Oliva Virgen",
      code: "AOV-001",
      description: "Aceite de oliva virgen extra",
      active: true,
    },
    {
      name: "Vinagre blanco al 5%",
      code: "VB-5",
      description: "Vinagre blanco al 5% de acidez",
      active: true,
    },
    {
      name: "Sal",
      code: "SAL-001",
      description: "Sal común para condimentar",
      active: true,
    },
  ];

  const createdProducts = [];
  for (const product of productsFromPHP) {
    const created = await prisma.product.upsert({
      where: { code: product.code },
      update: product,
      create: product,
    });
    createdProducts.push(created);
    console.log(`  ✓ Producto: ${product.name} (${product.code})`);
  }

  // 8. Crear Parámetros para Productos (ejemplos representativos)
  console.log("⚙️ Creando parámetros para productos...");

  // Tapa PET # 45
  const tapaParameters = [
    {
      productId: createdProducts[0].id,
      masterParameterId: createdMasterParameters.find(
        (mp) => mp.name === "DIÁMETRO EXTERNO"
      )?.id,
      name: "DIÁMETRO EXTERNO",
      type: "range",
      expectedValue: "45",
      minRange: 44,
      maxRange: 46,
      unit: "mm",
      required: true,
      active: true,
    },
    {
      productId: createdProducts[0].id,
      masterParameterId: createdMasterParameters.find(
        (mp) => mp.name === "COLOR"
      )?.id,
      name: "COLOR",
      type: "text",
      expectedValue: "Transparente",
      required: true,
      active: true,
    },
  ];

  // Bolsa pack aceituna x 240g
  const bolsaParameters = [
    {
      productId: createdProducts[1].id,
      masterParameterId: createdMasterParameters.find(
        (mp) => mp.name === "PESO"
      )?.id,
      name: "PESO",
      type: "range",
      expectedValue: "240",
      minRange: 235,
      maxRange: 245,
      unit: "g",
      required: true,
      active: true,
    },
    {
      productId: createdProducts[1].id,
      masterParameterId: createdMasterParameters.find(
        (mp) => mp.name === "ANCHO"
      )?.id,
      name: "ANCHO",
      type: "range",
      expectedValue: "15",
      minRange: 14,
      maxRange: 16,
      unit: "cm",
      required: true,
      active: true,
    },
  ];

  // Aceite de Oliva Virgen
  const aceiteParameters = [
    {
      productId: createdProducts[9].id,
      masterParameterId: createdMasterParameters.find((mp) => mp.name === "pH")
        ?.id,
      name: "pH",
      type: "range",
      expectedValue: "6.5",
      minRange: 6,
      maxRange: 7,
      unit: "pH",
      required: true,
      active: true,
    },
    {
      productId: createdProducts[9].id,
      masterParameterId: createdMasterParameters.find(
        (mp) => mp.name === "OLOR"
      )?.id,
      name: "OLOR",
      type: "text",
      expectedValue: "Característico a oliva",
      required: true,
      active: true,
    },
    {
      productId: createdProducts[9].id,
      masterParameterId: createdMasterParameters.find(
        (mp) => mp.name === "SABOR"
      )?.id,
      name: "SABOR",
      type: "text",
      expectedValue: "Afrutado",
      required: true,
      active: true,
    },
  ];

  const allParameters = [
    ...tapaParameters,
    ...bolsaParameters,
    ...aceiteParameters,
  ];
  const createdParameters = [];

  for (const param of allParameters) {
    if (param.masterParameterId) {
      const created = await prisma.parameter.create({
        data: param,
      });
      createdParameters.push(created);
      console.log(
        `  ✓ Parámetro: ${param.name} para ${
          createdProducts.find((p) => p.id === param.productId)?.name
        }`
      );
    }
  }

  // 9. Crear Registros de Muestra
  console.log("📊 Creando registros de muestra...");
  const records = [
    {
      productId: createdProducts[0].id,
      internalLot: "TPT45-2024-001",
      supplierLot: "SUP-TPT-001",
      quantity: 1000,
      registrationDate: new Date("2024-07-04"),
      expirationDate: new Date("2026-07-04"),
      observations: "Lote de tapas PET estándar",
      status: "approved",
      userId: adminUser.id,
      approvedBy: adminUser.id,
      approvalDate: new Date("2024-07-05"),
    },
    {
      productId: createdProducts[1].id,
      internalLot: "BPA240-2024-001",
      supplierLot: "SUP-BPA-001",
      quantity: 500,
      registrationDate: new Date("2024-07-10"),
      expirationDate: new Date("2025-07-10"),
      observations: "Bolsas para aceitunas verificadas",
      status: "approved",
      userId: adminUser.id,
      approvedBy: adminUser.id,
      approvalDate: new Date("2024-07-11"),
    },
    {
      productId: createdProducts[9].id,
      internalLot: "AOV001-2024-001",
      supplierLot: "SUP-AOV-001",
      quantity: 200,
      registrationDate: new Date("2024-07-15"),
      expirationDate: new Date("2026-07-15"),
      observations: "Aceite de oliva virgen extra premium",
      status: "pending",
      userId: adminUser.id,
    },
  ];

  const createdRecords = [];
  for (const record of records) {
    const created = await prisma.record.create({
      data: record,
    });
    createdRecords.push(created);
    console.log(`  ✓ Registro: ${record.internalLot} (${record.status})`);
  }

  // 10. Crear Controles para Registros Aprobados
  console.log("🔍 Creando controles de muestra...");
  const approvedRecords = createdRecords.filter((r) => r.status === "approved");

  for (const record of approvedRecords) {
    const productParameters = createdParameters.filter(
      (p) => p.productId === record.productId
    );

    for (const parameter of productParameters) {
      let controlValue: string;

      // Generar valores de control realistas
      if (parameter.type === "range") {
        const expected = parseFloat(parameter.expectedValue || "50");
        const variance = expected * 0.05; // ±5% de variación
        controlValue = (
          expected +
          (Math.random() - 0.5) * 2 * variance
        ).toFixed(2);
      } else {
        controlValue = parameter.expectedValue || "Conforme";
      }

      const isWithinRange =
        parameter.type === "range"
          ? parseFloat(controlValue) >= (parameter.minRange || 0) &&
            parseFloat(controlValue) <= (parameter.maxRange || 100)
          : true;

      await prisma.control.create({
        data: {
          recordId: record.id,
          parameterId: parameter.id,
          parameterName: parameter.name,
          fullRange:
            parameter.type === "range"
              ? `${parameter.minRange} - ${parameter.maxRange} ${
                  parameter.unit || ""
                }`
              : parameter.expectedValue || "",
          controlValue:
            parameter.type === "range" || parameter.type === "numeric"
              ? parseFloat(controlValue)
              : null,
          textControl: parameter.type === "text" ? controlValue : null,
          parameterType: parameter.type,
          outOfRange: !isWithinRange,
          alertMessage: !isWithinRange
            ? "Valor fuera del rango esperado"
            : null,
          observation: isWithinRange
            ? "Valor dentro del rango esperado"
            : "Valor fuera del rango - Revisar",
        },
      });
    }
    console.log(`  ✓ Controles creados para registro: ${record.internalLot}`);
  }

  // 11. Crear Logs de Auditoría
  console.log("📝 Creando logs de auditoría...");
  const auditLogs = [
    {
      userId: adminUser.id,
      action: "user.created",
      resource: "users",
      metadata: JSON.stringify({
        userId: adminUser.id,
        email: "admin@sistema.com",
      }),
    },
    {
      userId: adminUser.id,
      action: "product.created",
      resource: "products",
      metadata: JSON.stringify({
        productId: createdProducts[0].id,
        name: "Tapa PET # 45",
      }),
    },
    {
      userId: adminUser.id,
      action: "record.created",
      resource: "records",
      metadata: JSON.stringify({
        recordId: createdRecords[0].id,
        internalLot: "TPT45-2024-001",
      }),
    },
  ];

  for (const log of auditLogs) {
    await prisma.auditLog.create({
      data: log,
    });
  }
  console.log("  ✓ Logs de auditoría creados");

  console.log("\n🎉 Seed de base de datos completado exitosamente!");
  console.log("\n📋 Resumen:");
  console.log(`  • ${createdPermissions.length} permisos creados`);
  console.log(`  • 3 roles creados (administrador, trabajador, superadmin)`);
  console.log(`  • 1 usuario creado (password: 123456)`);
  console.log(
    `  • ${createdMasterParameters.length} parámetros maestros creados`
  );
  console.log(`  • ${createdProducts.length} productos creados`);
  console.log(
    `  • ${createdParameters.length} parámetros de productos creados`
  );
  console.log(`  • ${createdRecords.length} registros de muestra creados`);
  console.log(`  • Controles creados para registros aprobados`);
  console.log(`  • ${auditLogs.length} logs de auditoría creados`);
  console.log("\n🔑 Credenciales de acceso:");
  console.log("  • admin@sistema.com / 123456 (Super Administrador)");
  console.log("\n📊 Datos migrados desde PHP:");
  console.log("  • Usuarios originales del sistema PHP");
  console.log("  • 25 parámetros maestros del sistema original");
  console.log("  • Productos representativos del catálogo PHP");
  console.log("  • Estructura de roles y permisos adaptada");
}

main()
  .catch((e) => {
    console.error("❌ Error durante el seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
