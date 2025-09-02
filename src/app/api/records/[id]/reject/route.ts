import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

// PUT /api/records/[id]/reject - Rechazar registro
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
    const { reason } = await request.json();

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

    // Solo permitir rechazar registros pendientes
    if (existingRecord.status !== "pending") {
      return NextResponse.json(
        { error: "Solo se pueden rechazar registros pendientes" },
        { status: 400 }
      );
    }

    const rejectedRecord = await prisma.record.update({
      where: { id },
      data: {
        status: "rejected",
        approvedBy: session.user.id,
        approvalDate: new Date(),
        observations: reason
          ? `${existingRecord.observations || ''}\n\nRechazado: ${reason}`.trim()
          : existingRecord.observations,
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
        action: "record.rejected",
        resource: "records",
        resourceId: id,
        metadata: JSON.stringify({
          recordId: id,
          internalLot: rejectedRecord.internalLot,
          productName: existingRecord.product.name,
          rejectedBy: session.user.id,
          rejectionReason: reason,
          rejectionDate: new Date().toISOString(),
          timestamp: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json(rejectedRecord);
  } catch (error) {
    console.error("Error rejecting record:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}