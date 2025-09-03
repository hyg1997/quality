import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
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
    const record = await prisma.record.findUnique({
      where: { id },
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
    if (!record) {
      return NextResponse.json(
        { error: "Registro no encontrado" },
        { status: 404 }
      );
    }
    return NextResponse.json(record);
  } catch (error) {
    console.error("Error fetching record:", error);
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
    const {
      productId,
      internalLot,
      supplierLot,
      quantity,
      registrationDate,
      expirationDate,
      observations,
      status,
    } = await request.json();
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
    if (existingRecord.status !== "pending") {
      return NextResponse.json(
        { error: "Solo se pueden editar registros pendientes" },
        { status: 400 }
      );
    }
    if (quantity !== undefined && quantity <= 0) {
      return NextResponse.json(
        { error: "La cantidad debe ser mayor a 0" },
        { status: 400 }
      );
    }
    if (productId && productId !== existingRecord.productId) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });
      if (!product) {
        return NextResponse.json(
          { error: "Producto no encontrado" },
          { status: 404 }
        );
      }
    }
    if (internalLot && internalLot !== existingRecord.internalLot) {
      const duplicateRecord = await prisma.record.findFirst({
        where: {
          internalLot,
          id: { not: id },
        },
      });
      if (duplicateRecord) {
        return NextResponse.json(
          { error: "El lote interno ya existe" },
          { status: 400 }
        );
      }
    }
    const updateData: Record<string, unknown> = {};
    if (productId !== undefined) updateData.productId = productId;
    if (internalLot !== undefined) updateData.internalLot = internalLot;
    if (supplierLot !== undefined) updateData.supplierLot = supplierLot;
    if (quantity !== undefined) updateData.quantity = parseFloat(quantity.toString());
    if (registrationDate !== undefined)
      updateData.registrationDate = new Date(registrationDate);
    if (expirationDate !== undefined)
      updateData.expirationDate = expirationDate ? new Date(expirationDate) : null;
    if (observations !== undefined) updateData.observations = observations;
    if (status !== undefined) updateData.status = status;
    const updatedRecord = await prisma.record.update({
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
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "record.updated",
        resource: "records",
        resourceId: id,
        metadata: JSON.stringify({
          recordId: id,
          internalLot: updatedRecord.internalLot,
          changes: updateData,
          timestamp: new Date().toISOString(),
        }),
      },
    });
    return NextResponse.json(updatedRecord);
  } catch (error) {
    console.error("Error updating record:", error);
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
    if (!session || !hasPermission(session, PERMISSIONS.RECORDS?.DELETE || PERMISSIONS.CONTENT?.DELETE)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
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
    if (existingRecord.status !== "pending") {
      return NextResponse.json(
        { error: "Solo se pueden eliminar registros pendientes" },
        { status: 400 }
      );
    }
    await prisma.record.delete({
      where: { id },
    });
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "record.deleted",
        resource: "records",
        resourceId: id,
        metadata: JSON.stringify({
          recordId: id,
          internalLot: existingRecord.internalLot,
          productName: existingRecord.product.name,
          timestamp: new Date().toISOString(),
        }),
      },
    });
    return NextResponse.json({ message: "Registro eliminado exitosamente" });
  } catch (error) {
    console.error("Error deleting record:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}