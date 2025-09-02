"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Edit, Trash2, ClipboardList, Check, X, Eye } from "lucide-react";
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
import { recordService, type ProductRecord } from "@/services/api/records";
import { productService, type Product } from "@/services/api/products";

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
  const [records, setRecords] = useState<ProductRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const createModal = useModal<ProductRecord>();
  const editModal = useModal<ProductRecord>();
  const viewModal = useModal<ProductRecord>();
  const confirmModal = useConfirmModal();

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const response = await recordService.getRecords({
        limit: 100,
      });
      if (response.success && response.data) {
        setRecords(response.data.records);
      }
    } catch (error) {
      console.error("Error fetching records:", error);
    } finally {
      setLoading(false);
    }
  }, []);

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
      fetchRecords();
      fetchProducts();
    }
  }, [session, hasPermission, fetchRecords, fetchProducts]);

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
          await fetchRecords();
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
    [createModal, fetchRecords, success, error]
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
          await fetchRecords();
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
    [editModal, fetchRecords, success, error]
  );

  const handleDeleteRecord = useCallback(
    async (record: ProductRecord) => {
      if (!recordService.canDeleteRecord(record)) {
        error(
          "No se puede eliminar",
          "Solo se pueden eliminar registros pendientes"
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
              await fetchRecords();
              success(
                "Registro eliminado",
                `El registro ${record.internalLot} ha sido eliminado exitosamente`
              );
            } else {
              error(
                "Error al eliminar registro",
                response.error || "No se pudo eliminar el registro"
              );
            }
          } catch {
            error(
              "Error al eliminar registro",
              "Ha ocurrido un error inesperado"
            );
          }
        },
      });
    },
    [confirmModal, fetchRecords, success, error]
  );

  const handleApproveRecord = useCallback(
    async (record: ProductRecord) => {
      if (!recordService.canApproveRecord(record)) {
        error(
          "No se puede aprobar",
          "Solo se pueden aprobar registros pendientes"
        );
        return;
      }

      confirmModal.confirm({
        title: "Aprobar Registro",
        message: `¿Estás seguro de que quieres aprobar el registro "${record.internalLot}"?`,
        type: "success",
        confirmText: "Aprobar",
        onConfirm: async () => {
          try {
            const response = await recordService.approveRecord(record.id);

            if (response.success) {
              await fetchRecords();
              success(
                "Registro aprobado",
                `El registro ${record.internalLot} ha sido aprobado exitosamente`
              );
            } else {
              error(
                "Error al aprobar registro",
                response.error || "No se pudo aprobar el registro"
              );
            }
          } catch {
            error(
              "Error al aprobar registro",
              "Ha ocurrido un error inesperado"
            );
          }
        },
      });
    },
    [confirmModal, fetchRecords, success, error]
  );

  const handleRejectRecord = useCallback(
    async (record: ProductRecord) => {
      if (!recordService.canRejectRecord(record)) {
        error(
          "No se puede rechazar",
          "Solo se pueden rechazar registros pendientes"
        );
        return;
      }

      confirmModal.confirm({
        title: "Rechazar Registro",
        message: `¿Estás seguro de que quieres rechazar el registro "${record.internalLot}"?`,
        type: "danger",
        confirmText: "Rechazar",
        onConfirm: async () => {
          try {
            const response = await recordService.rejectRecord(record.id);

            if (response.success) {
              await fetchRecords();
              success(
                "Registro rechazado",
                `El registro ${record.internalLot} ha sido rechazado`
              );
            } else {
              error(
                "Error al rechazar registro",
                response.error || "No se pudo rechazar el registro"
              );
            }
          } catch {
            error(
              "Error al rechazar registro",
              "Ha ocurrido un error inesperado"
            );
          }
        },
      });
    },
    [confirmModal, fetchRecords, success, error]
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
        key: "expirationDate",
        header: "Fecha Vencimiento",
        cell: (record) => (
          <div className="text-sm text-gray-500">
            {record.expirationDate
              ? new Date(record.expirationDate).toLocaleDateString()
              : "-"}
          </div>
        ),
      },
      {
        key: "status",
        header: "Estado",
        cell: (record) => (
          <Badge className={recordService.getStatusColor(record.status)}>
            {recordService.getStatusLabel(record.status)}
          </Badge>
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
        label: "Ver",
        onClick: (record) => viewModal.open(record),
        icon: <Eye className="h-4 w-4" />,
        variant: "secondary",
      },
      {
        label: "Editar",
        onClick: (record) => editModal.open(record),
        icon: <Edit className="h-4 w-4" />,
        variant: "secondary",
        disabled: (record) => !recordService.canEditRecord(record),
        hidden: () => !hasPermission("records:update"),
      },
      {
        label: "Aprobar",
        onClick: handleApproveRecord,
        icon: <Check className="h-4 w-4" />,
        variant: "secondary",
        disabled: (record) => !recordService.canApproveRecord(record),
        hidden: () => !hasPermission("records:approve"),
      },
      {
        label: "Rechazar",
        onClick: handleRejectRecord,
        icon: <X className="h-4 w-4" />,
        variant: "danger",
        disabled: (record) => !recordService.canRejectRecord(record),
        hidden: () => !hasPermission("records:approve"),
      },
      {
        label: "Eliminar",
        onClick: handleDeleteRecord,
        icon: <Trash2 className="h-4 w-4" />,
        variant: "danger",
        disabled: (record) => !recordService.canDeleteRecord(record),
        hidden: () => !hasPermission("records:delete"),
      },
    ],
    [
      editModal,
      viewModal,
      handleApproveRecord,
      handleRejectRecord,
      handleDeleteRecord,
      hasPermission,
    ]
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
      <PageLayout
        title="Gestión de Registros de Productos"
        actions={
          hasPermission("records:create") ? (
            <button
              onClick={() => createModal.open()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear Registro
            </button>
          ) : undefined
        }
      >
        <DataTable
          data={records as unknown as Record<string, unknown>[]}
          columns={columns as unknown as ColumnDef<Record<string, unknown>>[]}
          actions={actions as unknown as ActionDef<Record<string, unknown>>[]}
          loading={loading}
          emptyMessage="No hay registros configurados"
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
