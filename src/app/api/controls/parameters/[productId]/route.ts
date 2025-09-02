import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

// GET /api/controls/parameters/[productId] - Get parameters for quality control
export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !hasPermission(session, PERMISSIONS.CONTENT?.READ)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { productId } = await params;

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    // Get parameters for the product
    const parameters = await prisma.parameter.findMany({
      where: {
        productId,
        active: true,
      },
      select: {
        id: true,
        name: true,
        type: true,
        expectedValue: true,
        minRange: true,
        maxRange: true,
        unit: true,
        required: true,
        active: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(parameters);
  } catch (error) {
    console.error("Error fetching parameters for control:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}