import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

// GET /api/parameters/[id] - Get parameter by ID
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

    const parameter = await prisma.parameter.findUnique({
      where: { id },
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

    if (!parameter) {
      return NextResponse.json(
        { error: "Parameter not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(parameter);
  } catch (error) {
    console.error("Error fetching parameter:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/parameters/[id] - Update parameter
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
    const {
      productId,
      name,
      type,
      expectedValue,
      minRange,
      maxRange,
      unit,
      required,
      active,
    } = await request.json();

    // Verify parameter exists
    const existingParameter = await prisma.parameter.findUnique({
      where: { id },
      include: {
        product: true,
      },
    });

    if (!existingParameter) {
      return NextResponse.json(
        { error: "Parameter not found" },
        { status: 404 }
      );
    }

    // Validations
    if (name !== undefined && (!name || name.trim() === "")) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (type !== undefined && !["range", "text", "numeric"].includes(type)) {
      return NextResponse.json(
        {
          error: "Type must be range, text, or numeric",
        },
        { status: 400 }
      );
    }

    // Verify product exists if changing productId
    if (productId && productId !== existingParameter.productId) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 }
        );
      }
    }

    // Validate range values for range type
    const finalType = type || existingParameter.type;
    if (finalType === "range") {
      const finalMinRange =
        minRange !== undefined ? minRange : existingParameter.minRange;
      const finalMaxRange =
        maxRange !== undefined ? maxRange : existingParameter.maxRange;

      if (finalMinRange === null || finalMaxRange === null) {
        return NextResponse.json(
          {
            error: "Min and max range are required for range type parameters",
          },
          { status: 400 }
        );
      }

      if (finalMinRange >= finalMaxRange) {
        return NextResponse.json(
          {
            error: "Min range must be less than max range",
          },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (productId !== undefined) updateData.productId = productId;
    if (name !== undefined) updateData.name = name.trim();
    if (type !== undefined) updateData.type = type;
    if (expectedValue !== undefined)
      updateData.expectedValue = expectedValue?.trim();
    if (minRange !== undefined)
      updateData.minRange = finalType === "range" ? minRange : null;
    if (maxRange !== undefined)
      updateData.maxRange = finalType === "range" ? maxRange : null;
    if (unit !== undefined) updateData.unit = unit?.trim();
    if (required !== undefined) updateData.required = required;
    if (active !== undefined) updateData.active = active;

    const parameter = await prisma.parameter.update({
      where: { id },
      data: updateData,
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
        action: "parameter.updated",
        resource: "parameters",
        metadata: JSON.stringify({
          parameterId: parameter.id,
          parameterName: parameter.name,
          productId: parameter.productId,
          changes: updateData,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json(parameter);
  } catch (error) {
    console.error("Error updating parameter:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/parameters/[id] - Delete parameter
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

    // Verify parameter exists
    const existingParameter = await prisma.parameter.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            controls: true,
          },
        },
      },
    });

    if (!existingParameter) {
      return NextResponse.json(
        { error: "Parameter not found" },
        { status: 404 }
      );
    }

    // Check if it has associated controls
    if (existingParameter._count.controls > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete parameter because it has associated controls",
        },
        { status: 400 }
      );
    }

    await prisma.parameter.delete({
      where: { id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "parameter.deleted",
        resource: "parameters",
        metadata: JSON.stringify({
          parameterId: id,
          parameterName: existingParameter.name,
          productId: existingParameter.productId,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({ message: "Parameter deleted successfully" });
  } catch (error) {
    console.error("Error deleting parameter:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
