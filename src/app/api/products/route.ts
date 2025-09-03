import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, PERMISSIONS.CONTENT?.READ)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const active = searchParams.get("active");
    const skip = (page - 1) * limit;
    const where: {
      OR?: Array<{
        name?: { contains: string };
        description?: { contains: string };
        code?: { contains: string };
      }>;
      active?: boolean;
    } = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { code: { contains: search } },
      ];
    }
    if (active !== null) {
      where.active = active === "true";
    }
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: {
              parameters: true,
              records: true,
            },
          },
          parameters: {
            orderBy: { name: "asc" },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);
    return NextResponse.json({
      products,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, PERMISSIONS.CONTENT?.CREATE)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { name, description, code, active = true } = await request.json();
    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "El nombre es requerido" },
        { status: 400 }
      );
    }
    if (code) {
      const existingProduct = await prisma.product.findUnique({
        where: { code },
      });
      if (existingProduct) {
        return NextResponse.json(
          { error: "El código ya existe" },
          { status: 400 }
        );
      }
    }
    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        description: description?.trim(),
        code: code?.trim(),
        active,
      },
      include: {
        _count: {
          select: {
            parameters: true,
            records: true,
          },
        },
      },
    });
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "product.created",
        resource: "products",
        metadata: JSON.stringify({
          productId: product.id,
          productName: product.name,
          timestamp: new Date().toISOString(),
        }),
      },
    });
    return NextResponse.json(product);
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
