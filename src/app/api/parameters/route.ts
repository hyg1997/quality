import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

// GET /api/parameters - Get parameters with pagination and filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !hasPermission(session, PERMISSIONS.CONTENT?.READ)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const productId = searchParams.get("productId");
    const type = searchParams.get("type");
    const active = searchParams.get("active");

    const skip = (page - 1) * limit;

    // Build filters
    const where: {
      OR?: Array<{
        name?: { contains: string; mode: "insensitive" };
        expectedValue?: { contains: string; mode: "insensitive" };
        unit?: { contains: string; mode: "insensitive" };
      }>;
      productId?: string;
      type?: string;
      active?: boolean;
    } = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { expectedValue: { contains: search, mode: "insensitive" } },
        { unit: { contains: search, mode: "insensitive" } },
      ];
    }

    if (productId) {
      where.productId = productId;
    }

    if (type) {
      where.type = type;
    }

    if (active !== null) {
      where.active = active === "true";
    }

    // Get parameters with product info
    const [parameters, total] = await Promise.all([
      prisma.parameter.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      }),
      prisma.parameter.count({ where }),
    ]);

    return NextResponse.json({
      parameters,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error("Error fetching parameters:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/parameters - Create new parameter
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !hasPermission(session, PERMISSIONS.CONTENT?.CREATE)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      productId,
      name,
      type,
      expectedValue,
      minRange,
      maxRange,
      unit,
      required = true,
      active = true,
    } = await request.json();

    // Validations
    if (!productId || !name || !type) {
      return NextResponse.json(
        {
          error: "Product ID, name, and type are required",
        },
        { status: 400 }
      );
    }

    if (!["range", "text", "numeric"].includes(type)) {
      return NextResponse.json(
        {
          error: "Type must be range, text, or numeric",
        },
        { status: 400 }
      );
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Validate range values for range type
    if (
      type === "range" &&
      (minRange === undefined || maxRange === undefined)
    ) {
      return NextResponse.json(
        {
          error: "Min and max range are required for range type parameters",
        },
        { status: 400 }
      );
    }

    if (type === "range" && minRange >= maxRange) {
      return NextResponse.json(
        {
          error: "Min range must be less than max range",
        },
        { status: 400 }
      );
    }

    const parameter = await prisma.parameter.create({
      data: {
        productId,
        name: name.trim(),
        type,
        expectedValue: expectedValue?.trim(),
        minRange: type === "range" ? minRange : null,
        maxRange: type === "range" ? maxRange : null,
        unit: unit?.trim(),
        required,
        active,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "parameter.created",
        resource: "parameters",
        metadata: JSON.stringify({
          parameterId: parameter.id,
          parameterName: parameter.name,
          productId: parameter.productId,
          productName: product.name,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json(parameter);
  } catch (error) {
    console.error("Error creating parameter:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
