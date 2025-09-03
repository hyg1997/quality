import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, PERMISSIONS.CONTENT?.CREATE)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const {
      productId,
      internalLot,
      supplierLot,
      quantity,
      observations,
      verifiedBy,
      controls,
      photos
    } = await request.json();
    console.log('Received photos:', photos ? photos.length : 0);
    if (photos && photos.length > 0) {
      console.log('First photo:', {
        filename: photos[0].filename,
        hasBase64Data: !!photos[0].base64Data,
        base64Length: photos[0].base64Data ? photos[0].base64Data.length : 0
      });
    }
    if (!productId || !internalLot || !quantity || !verifiedBy) {
      return NextResponse.json(
        { error: "Producto, lote interno, cantidad y verificador son requeridos" },
        { status: 400 }
      );
    }
    if (quantity <= 0) {
      return NextResponse.json(
        { error: "La cantidad debe ser mayor a 0" },
        { status: 400 }
      );
    }
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      );
    }
    const existingRecord = await prisma.record.findFirst({
      where: { internalLot },
    });
    if (existingRecord) {
      return NextResponse.json(
        { error: "El lote interno ya existe" },
        { status: 400 }
      );
    }
    const result = await prisma.$transaction(async (tx) => {
      const record = await tx.record.create({
        data: {
          productId,
          internalLot,
          supplierLot,
          quantity: parseFloat(quantity.toString()),
          registrationDate: new Date(),
          observations,
          status: "pending",
          userId: session.user.id,
        },
      });
      if (controls && Array.isArray(controls)) {
        for (const control of controls) {
          await tx.control.create({
            data: {
              recordId: record.id,
              parameterId: control.parameterId || null,
              parameterName: control.parameterName,
              fullRange: control.fullRange,
              controlValue: control.controlValue || null,
              textControl: control.textControl || null,
              parameterType: control.parameterType,
              observation: control.observation || null,
              outOfRange: control.outOfRange || false,
              alertMessage: control.alertMessage || null,
            },
          });
        }
      }
      if (photos && Array.isArray(photos)) {
        console.log('Creating photos in database:', photos.length);
        for (const photo of photos) {
          console.log('Creating photo:', {
            recordId: record.id,
            filename: photo.filename,
            hasBase64Data: !!photo.base64Data,
            base64Length: photo.base64Data ? photo.base64Data.length : 0
          });
          const createdPhoto = await tx.photo.create({
            data: {
              recordId: record.id,
              filename: photo.filename,
              base64Data: photo.base64Data,
            },
          });
          console.log('Photo created with ID:', createdPhoto.id);
        }
      } else {
        console.log('No photos to create or photos is not an array:', photos);
      }
      return record;
    });
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "quality_control.created",
        resource: "controls",
        resourceId: result.id,
        metadata: JSON.stringify({
          recordId: result.id,
          internalLot: result.internalLot,
          productId: result.productId,
          productName: product.name,
          quantity: result.quantity,
          verifiedBy,
          controlsCount: controls?.length || 0,
          photosCount: photos?.length || 0,
          timestamp: new Date().toISOString(),
        }),
      },
    });
    return NextResponse.json({
      recordId: result.id,
      message: "Control de calidad creado exitosamente"
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating quality control:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}