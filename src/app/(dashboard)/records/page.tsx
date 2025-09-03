"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Trash2, ClipboardList, FileText, Eye } from "lucide-react";
import {
  DataTable,
  FormModal,
  Badge,
  type ColumnDef,
  type ActionDef,
} from "@/components/ui";
import { PageLayout } from "@/components/layouts/AppLayout";
import { usePermissions } from "@/hooks/usePermissions";
import { useModal, useConfirmModal } from "@/hooks/useModal";
import { useForm } from "@/hooks/useForm";
import { useNotifications } from "@/hooks/useNotifications";
import { useDataTableSearch } from "@/hooks/useDataTableSearch";
import { recordService, type ProductRecord } from "@/services/api/records";
import { productService, type Product } from "@/services/api/products";
import { controlService } from "@/services/api/controls";

interface RecordFormData extends Record<string, unknown> {
  productId: string;
  internalLot: string;
  supplierLot?: string;
  quantity: number;
  registrationDate: string;
  expirationDate?: string;
  observations?: string;
  status: "pending" | "approved" | "rejected";
}

export default function RecordsManagement() {
  const { data: session, status } = useSession();
  const { hasPermission } = usePermissions();
  const { success, error } = useNotifications();
  const [products, setProducts] = useState<Product[]>([]);

  const createModal = useModal<ProductRecord>();
  const editModal = useModal<ProductRecord>();
  const viewModal = useModal<ProductRecord>();
  const confirmModal = useConfirmModal();

  // Hook para manejar búsqueda de registros
  const {
    data: records,
    loading,
    searchProps,
    refetch: refetchRecords
  } = useDataTableSearch<ProductRecord>({
    fetchData: async (searchTerm?: string) => {
      const response = await recordService.getRecords({
        limit: 100,
        search: searchTerm
      });
      
      if (!response.success || !response.data) {
        throw new Error('Error fetching records');
      }
      
      return response.data.records;
    },
    placeholder: "Buscar registros por lote, producto o estado..."
  });

  const fetchProducts = useCallback(async () => {
    try {
      const response = await productService.getProducts({
        limit: 100,
      });
      if (response.success && response.data) {
        setProducts(response.data.products);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  }, []);

  useEffect(() => {
    if (session && hasPermission("records:read")) {
      fetchProducts();
    }
  }, [session, hasPermission, fetchProducts]);

  const handleCreateRecord = useCallback(
    async (data: RecordFormData) => {
      try {
        const response = await recordService.createRecord({
          productId: data.productId,
          internalLot: data.internalLot,
          supplierLot: data.supplierLot,
          quantity: data.quantity,
          registrationDate: data.registrationDate,
          expirationDate: data.expirationDate,
          observations: data.observations,
          status: data.status,
        });

        if (response.success && response.data) {
          createModal.close();
          await refetchRecords();
          success(
            "Registro creado",
            `El registro ${data.internalLot} ha sido creado exitosamente`
          );
        } else {
          error(
            "Error al crear registro",
            response.error || "No se pudo crear el registro"
          );
        }
      } catch {
        error("Error al crear registro", "Ha ocurrido un error inesperado");
      }
    },
    [createModal, refetchRecords, success, error]
  );

  const handleEditRecord = useCallback(
    async (data: RecordFormData) => {
      if (!editModal.data) return;

      try {
        const response = await recordService.updateRecord(editModal.data.id, {
          productId: data.productId,
          internalLot: data.internalLot,
          supplierLot: data.supplierLot,
          quantity: data.quantity,
          registrationDate: data.registrationDate,
          expirationDate: data.expirationDate,
          observations: data.observations,
          status: data.status,
        });

        if (response.success && response.data) {
          editModal.close();
          await refetchRecords();
          success(
            "Registro actualizado",
            `El registro ${data.internalLot} ha sido actualizado exitosamente`
          );
        } else {
          error(
            "Error al actualizar registro",
            response.error || "No se pudo actualizar el registro"
          );
        }
      } catch {
        error(
          "Error al actualizar registro",
          "Ha ocurrido un error inesperado"
        );
      }
    },
    [editModal, refetchRecords, success, error]
  );

  const handleDeleteRecord = useCallback(
    async (record: ProductRecord) => {
      if (!recordService.canDeleteRecord(record)) {
        error(
          "No se puede eliminar",
          `Solo se pueden eliminar registros pendientes. Estado actual: ${record.status}`
        );
        return;
      }

      confirmModal.confirm({
        title: "Eliminar Registro",
        message: `¿Estás seguro de que quieres eliminar el registro "${record.internalLot}"?`,
        type: "danger",
        confirmText: "Eliminar",
        onConfirm: async () => {
          try {
            const response = await recordService.deleteRecord(record.id);

            if (response.success) {
              await refetchRecords();
              success(
                "Registro eliminado",
                `El registro ${record.internalLot} ha sido eliminado exitosamente`
              );
            } else {
              error(
                "Error al eliminar registro",
                response.error ||
                  "No se pudo eliminar el registro. Verifica tus permisos."
              );
            }
          } catch (err) {
            const errorMessage =
              err instanceof Error ? err.message : "Error desconocido";
            error(
              "Error al eliminar registro",
              `Ha ocurrido un error inesperado: ${errorMessage}`
            );
          }
        },
      });
    },
    [confirmModal, refetchRecords, success, error]
  );

  const generatePDFDocument = useCallback(
    async (record: ProductRecord) => {
      try {
        // Parallel loading: Get data and import jsPDF simultaneously
        const [response, jsPDF] = await Promise.all([
          controlService.getQualityControl(record.id),
          import("jspdf").then(module => module.default)
        ]);

        if (!response.success || !response.data) {
          error(
            "Error al obtener datos",
            "No se pudieron obtener los datos del registro"
          );
          return null;
        }

        const { record: recordData, controls, photos } = response.data;
        const doc = new jsPDF();

        // Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text("Registro de Producto", 105, 15, { align: "center" });
        doc.line(10, 20, 200, 20);

        // Basic information
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        let currentY = 30;

        doc.text(
          `Fecha y Hora: ${new Date(
            recordData.registrationDate
          ).toLocaleString()}`,
          10,
          currentY
        );
        currentY += 10;
        doc.text(`Lote Interno: ${recordData.internalLot}`, 10, currentY);
        currentY += 10;
        doc.text(`Guía: ${recordData.supplierLot || "N/A"}`, 10, currentY);
        currentY += 10;
        doc.text(`Cantidad: ${recordData.quantity}`, 10, currentY);
        currentY += 10;
        doc.text(
          `Producto: ${recordData.product?.name || "N/A"}`,
          10,
          currentY
        );
        currentY += 10;
        doc.text(`Verificado por: Administrador`, 10, currentY);
        currentY += 10;

        if (recordData.observations) {
          doc.text(
            `Observaciones Generales: ${recordData.observations}`,
            10,
            currentY
          );
          currentY += 10;
        }

        // Quality control section
        currentY += 10;
        doc.line(10, currentY, 200, currentY);
        currentY += 10;
        doc.setFont("helvetica", "bold");
        doc.text("Control de Calidad", 10, currentY);
        doc.setFont("helvetica", "normal");
        currentY += 15;

        const alertas: string[] = [];

        if (controls && controls.length > 0) {
          // Table headers with borders
          doc.setFillColor(200, 200, 200);
          doc.rect(10, currentY, 190, 12, "F");
          doc.rect(10, currentY, 190, 12, "S");

          // Column borders
          doc.line(10, currentY, 10, currentY + 12); // Left border
          doc.line(60, currentY, 60, currentY + 12); // After Parámetro
          doc.line(120, currentY, 120, currentY + 12); // After Rango
          doc.line(150, currentY, 150, currentY + 12); // After Control
          doc.line(200, currentY, 200, currentY + 12); // Right border

          doc.setFont("helvetica", "bold");
          doc.text("Parámetro", 12, currentY + 8);
          doc.text("Rango/Especificación", 62, currentY + 8);
          doc.text("Control", 122, currentY + 8);
          doc.text("Observaciones", 152, currentY + 8);
          doc.setFont("helvetica", "normal");
          currentY += 12;

          // Controls data with borders
          for (const control of controls) {
            if (currentY > 250) {
              doc.addPage();
              currentY = 20;
            }

            const parametro = control.parameterName || "";
            const especificacion = control.fullRange || "";
            const controlValue =
              control.textControl || control.controlValue?.toString() || "";
            const observacion = control.observation || "";
            const fueraDeRango = control.outOfRange;

            if (fueraDeRango && control.alertMessage) {
              alertas.push(`${parametro}: ${control.alertMessage}`);
            }

            // Text content with proper wrapping
            const wrappedParametro = doc.splitTextToSize(parametro, 48);
            const wrappedEspecificacion = doc.splitTextToSize(
              especificacion,
              58
            );
            const wrappedControlValue = doc.splitTextToSize(controlValue, 28);
            const wrappedObservacion = doc.splitTextToSize(observacion, 48);

            // Calculate row height based on the tallest wrapped text
            const maxLines = Math.max(
              Array.isArray(wrappedParametro) ? wrappedParametro.length : 1,
              Array.isArray(wrappedEspecificacion)
                ? wrappedEspecificacion.length
                : 1,
              Array.isArray(wrappedControlValue)
                ? wrappedControlValue.length
                : 1,
              Array.isArray(wrappedObservacion) ? wrappedObservacion.length : 1
            );

            const lineHeight = 5;
            const rowHeight = Math.max(10, maxLines * lineHeight + 4); // Minimum 10, or calculated height

            // Check if we need a new page with the calculated height
            if (currentY + rowHeight > 280) {
              doc.addPage();
              currentY = 20;
            }

            // Draw cell borders with calculated height
            doc.rect(10, currentY, 190, rowHeight, "S");
            doc.line(60, currentY, 60, currentY + rowHeight);
            doc.line(120, currentY, 120, currentY + rowHeight);
            doc.line(150, currentY, 150, currentY + rowHeight);

            // Draw text with proper vertical centering
            const textStartY = currentY + 4;

            doc.text(wrappedParametro, 12, textStartY);
            doc.text(wrappedEspecificacion, 62, textStartY);

            // Control value with color if out of range
            if (fueraDeRango) {
              doc.setTextColor(255, 0, 0);
              doc.text(wrappedControlValue, 122, textStartY);
              doc.setTextColor(0, 0, 0);
            } else {
              doc.text(wrappedControlValue, 122, textStartY);
            }

            doc.text(wrappedObservacion, 152, textStartY);
            currentY += rowHeight;
          }
        } else {
          doc.text(
            "No hay datos de control de calidad disponibles.",
            10,
            currentY
          );
          currentY += 10;
        }

        // Alerts section
        if (alertas.length > 0) {
          currentY += 10;
          doc.setFont("helvetica", "bold");
          doc.setTextColor(255, 0, 0);
          doc.text("ALERTAS - VALORES FUERA DE RANGO:", 10, currentY);
          doc.setFont("helvetica", "normal");
          currentY += 10;

          alertas.forEach((alerta: string) => {
            doc.text(`• ${alerta}`, 15, currentY);
            currentY += 8;
          });
          doc.setTextColor(0, 0, 0);
        }

        // Photos section
        currentY += 10;
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }

        if (photos && photos.length > 0) {
          doc.text("Evidencia Fotográfica", 10, currentY);
          currentY += 10;

          // Process images in parallel for better performance
          const imagePromises = photos.map(async (photo) => {
            try {
              const base64Image = `data:image/jpeg;base64,${photo.base64Data}`;
              
              return new Promise<{photo: typeof photo, dimensions: {width: number, height: number}, base64: string}>((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                  const maxWidth = 140;
                  const maxHeight = 120;
                  let { width, height } = img;

                  if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                  }
                  if (height > maxHeight) {
                    width = (width * maxHeight) / height;
                    height = maxHeight;
                  }

                  resolve({ photo, dimensions: { width, height }, base64: base64Image });
                };
                img.onerror = () => reject(new Error(`Failed to load image: ${photo.filename}`));
                img.src = base64Image;
              });
            } catch (err) {
              console.error(`Error processing image ${photo.filename}:`, err);
              return null;
            }
          });

          // Wait for all images to be processed
          const processedImages = await Promise.allSettled(imagePromises);
          
          // Add processed images to PDF
          for (const result of processedImages) {
            if (result.status === 'fulfilled' && result.value) {
              const { dimensions, base64 } = result.value;
              
              if (currentY + dimensions.height > 280) {
                doc.addPage();
                currentY = 20;
              }

              doc.addImage(
                base64,
                "JPEG",
                10,
                currentY,
                dimensions.width,
                dimensions.height
              );
              currentY += dimensions.height + 10;
            } else if (result.status === 'rejected') {
              doc.text(
                `Error cargando imagen`,
                10,
                currentY
              );
              currentY += 10;
            }
          }
        } else {
          doc.text("No se adjuntaron imágenes.", 10, currentY);
        }

        return { doc, recordData };
      } catch (err) {
        console.error("Error generating PDF document:", err);
        error("Error al generar PDF", "No se pudo generar el documento PDF");
        return null;
      }
    },
    [error]
  );

  const handlePreviewPDF = useCallback(
    async (record: ProductRecord) => {
      // Show loading notification
      success(
        "Generando vista previa...",
        "Por favor espera mientras se genera el PDF"
      );

      try {
        const result = await generatePDFDocument(record);
        if (!result) return;

        const { doc } = result;

        // Create blob and open in new window for preview
        const pdfBlob = doc.output('blob');
        const blobUrl = URL.createObjectURL(pdfBlob);
        
        // Open in new window for preview
        const previewWindow = window.open(blobUrl, '_blank');
        if (!previewWindow) {
          error("Error de navegador", "No se pudo abrir la vista previa. Verifica que los pop-ups estén habilitados.");
          URL.revokeObjectURL(blobUrl);
          return;
        }

        // Clean up the blob URL after a delay
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
        }, 5000); // Increased timeout for better UX

        success(
          "Vista previa lista",
          "El PDF se ha abierto en una nueva ventana"
        );
      } catch (err) {
        console.error("Error generating PDF preview:", err);
        error("Error al generar vista previa", "No se pudo generar la vista previa del PDF");
      }
    },
    [generatePDFDocument, success, error]
  );

  const handleDownloadPDF = useCallback(
    async (record: ProductRecord) => {
      // Show loading notification
      success(
        "Generando PDF...",
        "Por favor espera mientras se procesa el documento"
      );

      try {
        const result = await generatePDFDocument(record);
        if (!result) return;

        const { doc, recordData } = result;

        // Generate optimized filename
        const productName = recordData.product?.name?.replace(/[^a-zA-Z0-9]/g, '_') || "Registro";
        const date = new Date(recordData.registrationDate)
          .toLocaleDateString('es-ES')
          .replace(/\//g, "-");
        const filename = `${productName}_${date}_${recordData.internalLot}.pdf`;
        
        doc.save(filename);

        success(
          "PDF descargado",
          `Archivo guardado como: ${filename}`
        );
      } catch (err) {
        console.error("Error downloading PDF:", err);
        error("Error al descargar PDF", "No se pudo descargar el PDF del registro");
      }
    },
    [generatePDFDocument, success, error]
  );

  // Memoize columns definition to prevent recreation on every render
  const columns: ColumnDef<ProductRecord>[] = useMemo(
    () => [
      {
        key: "internalLot",
        header: "Lote Interno",
        cell: (record) => (
          <div>
            <div className="font-medium text-gray-900">
              {record.internalLot}
            </div>
            <div className="text-sm text-gray-500">
              {record.product?.name || "Producto no encontrado"}
            </div>
          </div>
        ),
      },
      {
        key: "supplierLot",
        header: "Lote Proveedor",
        cell: (record) => (
          <div className="text-sm">{record.supplierLot || "-"}</div>
        ),
      },
      {
        key: "quantity",
        header: "Cantidad",
        cell: (record) => (
          <div className="text-sm font-medium">
            {record.quantity.toLocaleString()}
          </div>
        ),
      },
      {
        key: "registrationDate",
        header: "Fecha Registro",
        cell: (record) => (
          <div className="text-sm text-gray-500">
            {new Date(record.registrationDate).toLocaleDateString()}
          </div>
        ),
      },
      {
        key: "createdAt",
        header: "Creado",
        cell: (record) => (
          <div className="text-sm text-gray-500">
            {new Date(record.createdAt).toLocaleDateString()}
          </div>
        ),
      },
    ],
    []
  );

  // Memoize actions definition to prevent recreation on every render
  const actions: ActionDef<ProductRecord>[] = useMemo(
    () => [
      {
        label: "Vista Previa PDF",
        onClick: handlePreviewPDF,
        icon: <Eye className="h-4 w-4" />,
        variant: "secondary",
      },
      {
        label: "Descargar PDF",
        onClick: handleDownloadPDF,
        icon: <FileText className="h-4 w-4" />,
        variant: "secondary",
      },
      {
        label: "Eliminar",
        onClick: handleDeleteRecord,
        icon: <Trash2 className="h-4 w-4" />,
        variant: "danger",
        hidden: () => !hasPermission("records:delete"),
      },
    ],
    [handleDeleteRecord, handlePreviewPDF, handleDownloadPDF, hasPermission]
  );

  if (status === "loading") {
    return (
      <PageLayout title="Cargando...">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </PageLayout>
    );
  }

  if (!session || !hasPermission("records:read")) {
    return (
      <PageLayout title="Acceso Denegado">
        <div className="text-center py-12">
          <ClipboardList className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Acceso Restringido
          </h3>
          <p className="text-gray-600">
            No tienes permisos para ver la gestión de registros.
          </p>
        </div>
      </PageLayout>
    );
  }

  return (
    <>
      <PageLayout title="Gestión de Registros de Productos">
        <DataTable
          data={records}
          columns={columns}
          actions={actions}
          loading={loading}
          emptyMessage="No hay registros configurados"
          search={searchProps}
        />
      </PageLayout>

      {/* Modal de Crear Registro */}
      <RecordFormModal
        isOpen={createModal.isOpen}
        onClose={createModal.close}
        onSubmit={handleCreateRecord}
        products={products}
        title="Crear Registro"
      />

      {/* Modal de Editar Registro */}
      <RecordFormModal
        isOpen={editModal.isOpen}
        onClose={editModal.close}
        onSubmit={(data) => editModal.data && handleEditRecord(data)}
        products={products}
        record={editModal.data}
        title="Editar Registro"
      />

      {/* Modal de Ver Registro */}
      <RecordViewModal
        isOpen={viewModal.isOpen}
        onClose={viewModal.close}
        record={viewModal.data}
      />
    </>
  );
}

// Componente Modal para Crear/Editar Registros
interface RecordFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: RecordFormData) => void;
  products: Product[];
  record?: ProductRecord;
  title: string;
}

function RecordFormModal({
  isOpen,
  onClose,
  onSubmit,
  products,
  record,
  title,
}: RecordFormModalProps) {
  const form = useForm<RecordFormData>({
    initialValues: {
      productId: record?.productId || "",
      internalLot: record?.internalLot || "",
      supplierLot: record?.supplierLot || "",
      quantity: record?.quantity || 0,
      registrationDate: record?.registrationDate
        ? new Date(record.registrationDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      expirationDate: record?.expirationDate
        ? new Date(record.expirationDate).toISOString().split("T")[0]
        : "",
      observations: record?.observations || "",
      status: record?.status || "pending",
    },
    validationRules: {
      productId: { required: true },
      internalLot: { required: true, minLength: 2 },
      quantity: { required: true, minLength: 1 },
      registrationDate: { required: true },
    },
    onSubmit: async (data) => {
      await onSubmit(data);
    },
  });

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={form.handleSubmit}
      title={title}
      loading={form.isSubmitting}
      disabled={!form.isValid}
      size="lg"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Producto *
            </label>
            <select
              name={form.getFieldProps("productId").name}
              value={String(form.getFieldProps("productId").value)}
              onChange={form.getFieldProps("productId").onChange}
              onBlur={form.getFieldProps("productId").onBlur}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar producto</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} {product.code ? `(${product.code})` : ""}
                </option>
              ))}
            </select>
            {form.errors.productId && (
              <p className="text-red-500 text-sm mt-1">
                {form.errors.productId}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lote Interno *
            </label>
            <input
              type="text"
              name={form.getFieldProps("internalLot").name}
              value={String(form.getFieldProps("internalLot").value)}
              onChange={form.getFieldProps("internalLot").onChange}
              onBlur={form.getFieldProps("internalLot").onBlur}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Lote interno único"
            />
            {form.errors.internalLot && (
              <p className="text-red-500 text-sm mt-1">
                {form.errors.internalLot}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lote Proveedor
            </label>
            <input
              type="text"
              name={form.getFieldProps("supplierLot").name}
              value={String(form.getFieldProps("supplierLot").value)}
              onChange={form.getFieldProps("supplierLot").onChange}
              onBlur={form.getFieldProps("supplierLot").onBlur}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Lote del proveedor"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cantidad *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              name={form.getFieldProps("quantity").name}
              value={(form.getFieldProps("quantity").value as number) || ""}
              onChange={form.getFieldProps("quantity").onChange}
              onBlur={form.getFieldProps("quantity").onBlur}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Cantidad del producto"
            />
            {form.errors.quantity && (
              <p className="text-red-500 text-sm mt-1">
                {form.errors.quantity}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Registro *
            </label>
            <input
              type="date"
              name={form.getFieldProps("registrationDate").name}
              value={String(form.getFieldProps("registrationDate").value)}
              onChange={form.getFieldProps("registrationDate").onChange}
              onBlur={form.getFieldProps("registrationDate").onBlur}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {form.errors.registrationDate && (
              <p className="text-red-500 text-sm mt-1">
                {form.errors.registrationDate}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Vencimiento
            </label>
            <input
              type="date"
              name={form.getFieldProps("expirationDate").name}
              value={String(form.getFieldProps("expirationDate").value)}
              onChange={form.getFieldProps("expirationDate").onChange}
              onBlur={form.getFieldProps("expirationDate").onBlur}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estado
          </label>
          <select
            name={form.getFieldProps("status").name}
            value={String(form.getFieldProps("status").value)}
            onChange={form.getFieldProps("status").onChange}
            onBlur={form.getFieldProps("status").onBlur}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="pending">Pendiente</option>
            <option value="approved">Aprobado</option>
            <option value="rejected">Rechazado</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Observaciones
          </label>
          <textarea
            name={form.getFieldProps("observations").name}
            value={String(form.getFieldProps("observations").value)}
            onChange={form.getFieldProps("observations").onChange}
            onBlur={form.getFieldProps("observations").onBlur}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Observaciones adicionales..."
          />
        </div>
      </div>
    </FormModal>
  );
}

// Componente Modal para Ver Registro
interface RecordViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  record?: ProductRecord;
}

function RecordViewModal({ isOpen, onClose, record }: RecordViewModalProps) {
  if (!record) return null;

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={() => {}}
      title="Detalles del Registro"
      size="lg"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Producto
            </label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg">
              {record.product?.name || "Producto no encontrado"}
              {record.product?.code && ` (${record.product.code})`}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lote Interno
            </label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg">
              {record.internalLot}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lote Proveedor
            </label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg">
              {record.supplierLot || "-"}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cantidad
            </label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg">
              {record.quantity.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Registro
            </label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg">
              {new Date(record.registrationDate).toLocaleDateString()}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Vencimiento
            </label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg">
              {record.expirationDate
                ? new Date(record.expirationDate).toLocaleDateString()
                : "-"}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estado
          </label>
          <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg">
            <Badge className={recordService.getStatusColor(record.status)}>
              {recordService.getStatusLabel(record.status)}
            </Badge>
          </div>
        </div>

        {record.observations && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observaciones
            </label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg">
              {record.observations}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Creado
            </label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg">
              {new Date(record.createdAt).toLocaleString()}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Actualizado
            </label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg">
              {new Date(record.updatedAt).toLocaleString()}
            </div>
          </div>
        </div>

        {record.approvedBy && record.approvalDate && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Aprobado por
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg">
                {record.approver?.fullName || "Usuario desconocido"}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Aprobación
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg">
                {new Date(record.approvalDate).toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </div>
    </FormModal>
  );
}
