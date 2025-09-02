import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

// GET /api/controls/[recordId] - Get quality control record with controls and photos
export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ recordId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !hasPermission(session, PERMISSIONS.CONTENT?.READ)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { recordId } = await params;

    // Get record with related data
    const record = await prisma.record.findUnique({
      where: { id: recordId },
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

    if (!record) {
      return NextResponse.json(
        { error: "Registro no encontrado" },
        { status: 404 }
      );
    }

    // Get controls
    const controls = await prisma.control.findMany({
      where: { recordId },
      include: {
        parameter: {
          select: {
            id: true,
            name: true,
            type: true,
            expectedValue: true,
            minRange: true,
            maxRange: true,
            unit: true,
          },
        },
      },
      orderBy: {
        parameterName: 'asc',
      },
    });

    // Get photos
    const photos = await prisma.photo.findMany({
      where: { recordId },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json({
      record,
      controls,
      photos,
    });
  } catch (error) {
    console.error("Error fetching quality control:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}