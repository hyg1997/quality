import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

// GET /api/master-parameters - Get master parameters with pagination and filters
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
    const type = searchParams.get("type");
    const active = searchParams.get("active");

    const skip = (page - 1) * limit;

    // Build filters
    const where: {
      OR?: Array<{
        name?: { contains: string; mode: "insensitive" };
        description?: { contains: string; mode: "insensitive" };
        unit?: { contains: string; mode: "insensitive" };
      }>;
      type?: string;
      active?: boolean;
    } = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { unit: { contains: search, mode: "insensitive" } },
      ];
    }

    if (type) {
      where.type = type;
    }

    if (active !== null) {
      where.active = active === "true";
    }

    // Get master parameters
    const [masterParameters, total] = await Promise.all([
      prisma.masterParameter.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
      }),
      prisma.masterParameter.count({ where }),
    ]);

    return NextResponse.json({
      masterParameters,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error("Error fetching master parameters:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/master-parameters - Create new master parameter
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !hasPermission(session, PERMISSIONS.CONTENT?.CREATE)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      name,
      description,
      type,
      defaultValue,
      minRange,
      maxRange,
      unit,
      active = true,
    } = await request.json();

    // Validations
    if (!name || !type) {
      return NextResponse.json(
        {
          error: "Name and type are required",
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

    const masterParameter = await prisma.masterParameter.create({
      data: {
        name: name.trim(),
        description: description?.trim(),
        type,
        defaultValue: defaultValue?.trim(),
        minRange: type === "range" ? minRange : null,
        maxRange: type === "range" ? maxRange : null,
        unit: unit?.trim(),
        active,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "master_parameter.created",
        resource: "master_parameters",
        metadata: JSON.stringify({
          masterParameterId: masterParameter.id,
          masterParameterName: masterParameter.name,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json(masterParameter);
  } catch (error) {
    console.error("Error creating master parameter:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}