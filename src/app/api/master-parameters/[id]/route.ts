import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, PERMISSIONS.CONTENT?.READ)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const masterParameter = await prisma.masterParameter.findUnique({
      where: { id },
      include: {
        parameters: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
    });
    if (!masterParameter) {
      return NextResponse.json(
        { error: "Master parameter not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(masterParameter);
  } catch (error) {
    console.error("Error fetching master parameter:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, PERMISSIONS.CONTENT?.UPDATE)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const body = await request.json();
    const {
      name,
      description,
      type,
      defaultValue,
      minRange,
      maxRange,
      unit,
      active,
    } = body;
    const isStatusChangeOnly =
      active !== undefined &&
      !name &&
      !description &&
      !type &&
      !defaultValue &&
      !minRange &&
      !maxRange &&
      !unit;
    if (!isStatusChangeOnly && (!name || !type)) {
      return NextResponse.json(
        { error: "Name and type are required" },
        { status: 400 }
      );
    }
    if (type && !["range", "text", "numeric"].includes(type)) {
      return NextResponse.json(
        { error: "Type must be 'range', 'text', or 'numeric'" },
        { status: 400 }
      );
    }
    const existingMasterParameter = await prisma.masterParameter.findUnique({
      where: { id },
    });
    if (!existingMasterParameter) {
      return NextResponse.json(
        { error: "Master parameter not found" },
        { status: 404 }
      );
    }
    if (name && name !== existingMasterParameter.name) {
      const nameExists = await prisma.masterParameter.findFirst({
        where: {
          name,
          id: { not: id },
        },
      });
      if (nameExists) {
        return NextResponse.json(
          { error: "A master parameter with this name already exists" },
          { status: 409 }
        );
      }
    }
    const updateData: {
      name?: string;
      description?: string;
      type?: string;
      defaultValue?: string;
      minRange?: number | null;
      maxRange?: number | null;
      unit?: string;
      active?: boolean;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (type !== undefined) updateData.type = type;
    if (defaultValue !== undefined) updateData.defaultValue = defaultValue;
    if (minRange !== undefined)
      updateData.minRange = minRange ? parseFloat(minRange) : null;
    if (maxRange !== undefined)
      updateData.maxRange = maxRange ? parseFloat(maxRange) : null;
    if (unit !== undefined) updateData.unit = unit;
    if (active !== undefined) updateData.active = active;
    const updatedMasterParameter = await prisma.masterParameter.update({
      where: { id },
      data: updateData,
      include: {
        parameters: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
    });
    return NextResponse.json({
      success: true,
      data: updatedMasterParameter,
    });
  } catch (error) {
    console.error("Error updating master parameter:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, PERMISSIONS.CONTENT?.DELETE)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const existingMasterParameter = await prisma.masterParameter.findUnique({
      where: { id },
      include: {
        parameters: true,
      },
    });
    if (!existingMasterParameter) {
      return NextResponse.json(
        { error: "Master parameter not found" },
        { status: 404 }
      );
    }
    if (existingMasterParameter.parameters.length > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete master parameter that is being used by products",
          details: `This master parameter is used by ${existingMasterParameter.parameters.length} product(s)`,
        },
        { status: 409 }
      );
    }
    await prisma.masterParameter.delete({
      where: { id },
    });
    return NextResponse.json({
      success: true,
      message: "Master parameter deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting master parameter:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
