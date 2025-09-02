import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

// GET /api/records - Obtener todos los registros
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !hasPermission(session, PERMISSIONS.CONTENT?.READ)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search");
    const productId = searchParams.get("productId");
    const status = searchParams.get("status");
    const userId = searchParams.get("userId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const skip = (page - 1) * limit;

    // Build where clause
    const where: {
      OR?: Array<{
        internalLot?: { contains: string; mode: string };
        supplierLot?: { contains: string; mode: string };
        observations?: { contains: string; mode: string };
        product?: { name: { contains: string; mode: string } };
      }>;
      productId?: string;
      status?: string;
      userId?: string;
      registrationDate?: {
        gte?: Date;
        lte?: Date;
      };
    } = {};

    if (search) {
      where.OR = [
        { internalLot: { contains: search, mode: "insensitive" } },
        { supplierLot: { contains: search, mode: "insensitive" } },
        { observations: { contains: search, mode: "insensitive" } },
        {
          product: {
            name: { contains: search, mode: "insensitive" },
          },
        },
      ];
    }

    if (productId) {
      where.productId = productId;
    }

    if (status) {
      where.status = status;
    }

    if (userId) {
      where.userId = userId;
    }

    if (startDate || endDate) {
      where.registrationDate = {};
      if (startDate) {
        where.registrationDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.registrationDate.lte = new Date(endDate);
      }
    }

    const [records, total] = await Promise.all([
      prisma.record.findMany({
        where,
        skip,
        take: limit,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          approver: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.record.count({ where }),
    ]);

    return NextResponse.json({
      records,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error("Error fetching records:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/records - Crear nuevo registro
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !hasPermission(session, PERMISSIONS.CONTENT?.CREATE)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      productId,
      internalLot,
      supplierLot,
      quantity,
      registrationDate,
      expirationDate,
      observations,
      status = "pending",
    } = await request.json();

    // Validaciones
    if (!productId || !internalLot || !quantity) {
      return NextResponse.json(
        { error: "Producto, lote interno y cantidad son requeridos" },
        { status: 400 }
      );
    }

    if (quantity <= 0) {
      return NextResponse.json(
        { error: "La cantidad debe ser mayor a 0" },
        { status: 400 }
      );
    }

    // Verificar que el producto existe
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    // Verificar que el lote interno sea único
    const existingRecord = await prisma.record.findFirst({
      where: { internalLot },
    });

    if (existingRecord) {
      return NextResponse.json(
        { error: "El lote interno ya existe" },
        { status: 400 }
      );
    }

    const record = await prisma.record.create({
      data: {
        productId,
        internalLot,
        supplierLot,
        quantity: parseFloat(quantity.toString()),
        registrationDate: registrationDate ? new Date(registrationDate) : new Date(),
        expirationDate: expirationDate ? new Date(expirationDate) : null,
        observations,
        status,
        userId: session.user.id,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    // Crear log de auditoría
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "record.created",
        resource: "records",
        resourceId: record.id,
        metadata: JSON.stringify({
          recordId: record.id,
          internalLot: record.internalLot,
          productId: record.productId,
          productName: product.name,
          quantity: record.quantity,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error("Error creating record:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}