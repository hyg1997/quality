import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

// PUT /api/records/[id]/approve - Aprobar registro
export async function PUT(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !hasPermission(session, PERMISSIONS.CONTENT?.UPDATE)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verificar que el registro existe
    const existingRecord = await prisma.record.findUnique({
      where: { id },
      include: {
        product: true,
      },
    });

    if (!existingRecord) {
      return NextResponse.json(
        { error: "Registro no encontrado" },
        { status: 404 }
      );
    }

    // Solo permitir aprobar registros pendientes
    if (existingRecord.status !== "pending") {
      return NextResponse.json(
        { error: "Solo se pueden aprobar registros pendientes" },
        { status: 400 }
      );
    }

    const approvedRecord = await prisma.record.update({
      where: { id },
      data: {
        status: "approved",
        approvedBy: session.user.id,
        approvalDate: new Date(),
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
        approver: {
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
        action: "record.approved",
        resource: "records",
        resourceId: id,
        metadata: JSON.stringify({
          recordId: id,
          internalLot: approvedRecord.internalLot,
          productName: existingRecord.product.name,
          approvedBy: session.user.id,
          approvalDate: new Date().toISOString(),
          timestamp: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json(approvedRecord);
  } catch (error) {
    console.error("Error approving record:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}