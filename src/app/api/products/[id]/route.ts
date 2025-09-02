import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

// GET /api/products/[id] - Obtener producto por ID
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

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        parameters: {
          where: { active: true },
          orderBy: { name: "asc" },
        },
        _count: {
          select: {
            parameters: true,
            records: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/products/[id] - Actualizar producto
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
    const { name, description, code, active } = await request.json();

    // Verificar que el producto existe
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    // Validaciones
    if (name !== undefined && (!name || name.trim() === "")) {
      return NextResponse.json(
        { error: "El nombre es requerido" },
        { status: 400 }
      );
    }

    // Verify unique code if updating
    if (code && code !== existingProduct.code) {
      const codeExists = await prisma.product.findUnique({
        where: { code },
      });

      if (codeExists) {
        return NextResponse.json(
          { error: "El código ya existe" },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim();
    if (code !== undefined) updateData.code = code?.trim();
    if (active !== undefined) updateData.active = active;

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
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
    });

    // Crear log de auditoría
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "product.updated",
        resource: "products",
        metadata: JSON.stringify({
          productId: product.id,
          productName: product.name,
          changes: updateData,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[id] - Eliminar producto
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

    // Verificar que el producto existe
    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            records: true,
          },
        },
      },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    // Verificar si tiene registros asociados
    if (existingProduct._count.records > 0) {
      return NextResponse.json(
        {
          error:
            "No se puede eliminar el producto porque tiene registros asociados",
        },
        { status: 400 }
      );
    }

    await prisma.product.delete({
      where: { id },
    });

    // Crear log de auditoría
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "product.deleted",
        resource: "products",
        metadata: JSON.stringify({
          productId: id,
          productName: existingProduct.name,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({ message: "Producto eliminado exitosamente" });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
