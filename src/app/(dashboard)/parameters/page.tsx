"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Edit, Trash2, Package, Settings } from "lucide-react";
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
import { parameterService, type Parameter } from "@/services/api/parameters";
import { productService, type Product } from "@/services/api/products";

interface ParameterFormData extends Record<string, unknown> {
  productId: string;
  name: string;
  type: "range" | "text" | "numeric";
  expectedValue?: string;
  minRange?: number;
  maxRange?: number;
  unit?: string;
  required: boolean;
  active: boolean;
}

export default function ParametersManagement() {
  const { data: session, status } = useSession();
  const { hasPermission } = usePermissions();
  const { success, error } = useNotifications();
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const createModal = useModal<Parameter>();
  const editModal = useModal<Parameter>();
  const confirmModal = useConfirmModal();

  const fetchParameters = useCallback(async () => {
    setLoading(true);
    try {
      const response = await parameterService.getParameters({
        limit: 100,
      });
      if (response.success && response.data) {
        setParameters(response.data.parameters);
      }
    } catch (error) {
      console.error("Error fetching parameters:", error);
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
    if (session && hasPermission("parameters:read")) {
      fetchParameters();
      fetchProducts();
    }
  }, [session, hasPermission, fetchParameters, fetchProducts]);

  const handleCreateParameter = useCallback(
    async (data: ParameterFormData) => {
      try {
        const response = await parameterService.createParameter({
          productId: data.productId,
          name: data.name,
          type: data.type,
          expectedValue: data.expectedValue,
          minRange: data.minRange,
          maxRange: data.maxRange,
          unit: data.unit,
          required: data.required,
          active: data.active,
        });

        if (response.success && response.data) {
          createModal.close();
          await fetchParameters();
          success(
            "Parámetro creado",
            `El parámetro ${data.name} ha sido creado exitosamente`
          );
        } else {
          error(
            "Error al crear parámetro",
            response.error || "No se pudo crear el parámetro"
          );
        }
      } catch {
        error("Error al crear parámetro", "Ha ocurrido un error inesperado");
      }
    },
    [createModal, fetchParameters, success, error]
  );

  const handleEditParameter = useCallback(
    async (data: ParameterFormData) => {
      if (!editModal.data) return;

      try {
        const response = await parameterService.updateParameter(
          editModal.data.id,
          {
            productId: data.productId,
            name: data.name,
            type: data.type,
            expectedValue: data.expectedValue,
            minRange: data.minRange,
            maxRange: data.maxRange,
            unit: data.unit,
            required: data.required,
            active: data.active,
          }
        );

        if (response.success && response.data) {
          editModal.close();
          await fetchParameters();
          success(
            "Parámetro actualizado",
            `El parámetro ${data.name} ha sido actualizado exitosamente`
          );
        } else {
          error(
            "Error al actualizar parámetro",
            response.error || "No se pudo actualizar el parámetro"
          );
        }
      } catch {
        error(
          "Error al actualizar parámetro",
          "Ha ocurrido un error inesperado"
        );
      }
    },
    [editModal, fetchParameters, success, error]
  );

  const handleDeleteParameter = useCallback(
    async (parameter: Parameter) => {
      confirmModal.confirm({
        title: "Eliminar Parámetro",
        message: `¿Estás seguro de que quieres eliminar el parámetro "${parameter.name}"?`,
        type: "danger",
        confirmText: "Eliminar",
        onConfirm: async () => {
          try {
            const response = await parameterService.deleteParameter(
              parameter.id
            );

            if (response.success) {
              await fetchParameters();
              success(
                "Parámetro eliminado",
                `El parámetro ${parameter.name} ha sido eliminado exitosamente`
              );
            } else {
              error(
                "Error al eliminar parámetro",
                response.error || "No se pudo eliminar el parámetro"
              );
            }
          } catch {
            error(
              "Error al eliminar parámetro",
              "Ha ocurrido un error inesperado"
            );
          }
        },
      });
    },
    [confirmModal, fetchParameters, success, error]
  );

  const handleToggleStatus = useCallback(
    async (parameter: Parameter) => {
      try {
        const response = await parameterService.toggleParameterStatus(
          parameter.id,
          !parameter.active
        );

        if (response.success && response.data) {
          await fetchParameters();
          const statusText = !parameter.active ? "activado" : "desactivado";
          success(
            "Estado actualizado",
            `El parámetro ${parameter.name} ha sido ${statusText} exitosamente`
          );
        } else {
          error(
            "Error al cambiar estado",
            response.error || "No se pudo cambiar el estado del parámetro"
          );
        }
      } catch {
        error("Error al cambiar estado", "Ha ocurrido un error inesperado");
      }
    },
    [fetchParameters, success, error]
  );

  // Memoize columns definition to prevent recreation on every render
  const columns: ColumnDef<Parameter>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Nombre",
        cell: (parameter) => (
          <div>
            <div className="font-medium text-gray-900">{parameter.name}</div>
            <div className="text-sm text-gray-500">
              {parameter.product?.name || "Producto no encontrado"}
            </div>
          </div>
        ),
      },
      {
        key: "type",
        header: "Tipo",
        cell: (parameter) => {
          const typeColors = {
            range: "bg-blue-100 text-blue-800",
            text: "bg-green-100 text-green-800",
            numeric: "bg-purple-100 text-purple-800",
          };
          return (
            <Badge className={typeColors[parameter.type]}>
              {parameter.type}
            </Badge>
          );
        },
      },
      {
        key: "expectedValue",
        header: "Valor Esperado",
        cell: (parameter) => (
          <div className="text-sm">
            {parameter.type === "range" &&
            parameter.minRange !== undefined &&
            parameter.maxRange !== undefined
              ? `${parameter.minRange} - ${parameter.maxRange}${
                  parameter.unit ? ` ${parameter.unit}` : ""
                }`
              : parameter.expectedValue || "-"}
          </div>
        ),
      },
      {
        key: "required",
        header: "Requerido",
        cell: (parameter) => (
          <Badge variant={parameter.required ? "success" : "default"}>
            {parameter.required ? "Sí" : "No"}
          </Badge>
        ),
      },
      {
        key: "active",
        header: "Estado",
        cell: (parameter) => (
          <Badge variant={parameter.active ? "success" : "default"}>
            {parameter.active ? "Activo" : "Inactivo"}
          </Badge>
        ),
      },
      {
        key: "createdAt",
        header: "Creado",
        cell: (parameter) => (
          <div className="text-sm text-gray-500">
            {new Date(parameter.createdAt).toLocaleDateString()}
          </div>
        ),
      },
    ],
    []
  );

  // Memoize actions definition to prevent recreation on every render
  const actions: ActionDef<Parameter>[] = useMemo(
    () => [
      {
        label: "Editar",
        onClick: (parameter) => editModal.open(parameter),
        icon: <Edit className="h-4 w-4" />,
        variant: "secondary",
        hidden: () => !hasPermission("parameters:update"),
      },
      {
        label: "Cambiar Estado",
        onClick: handleToggleStatus,
        icon: <Settings className="h-4 w-4" />,
        variant: "secondary",
        hidden: () => !hasPermission("parameters:update"),
      },
      {
        label: "Eliminar",
        onClick: handleDeleteParameter,
        icon: <Trash2 className="h-4 w-4" />,
        variant: "danger",
        hidden: () => !hasPermission("parameters:delete"),
      },
    ],
    [editModal, handleToggleStatus, handleDeleteParameter, hasPermission]
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

  if (!session || !hasPermission("parameters:read")) {
    return (
      <PageLayout title="Acceso Denegado">
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Acceso Restringido
          </h3>
          <p className="text-gray-600">
            No tienes permisos para ver la gestión de parámetros.
          </p>
        </div>
      </PageLayout>
    );
  }

  return (
    <>
      <PageLayout
        title="Gestión de Parámetros"
        actions={
          hasPermission("parameters:create") ? (
            <button
              onClick={() => createModal.open()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear Parámetro
            </button>
          ) : undefined
        }
      >
        <DataTable
          data={parameters as unknown as Record<string, unknown>[]}
          columns={columns as unknown as ColumnDef<Record<string, unknown>>[]}
          actions={actions as unknown as ActionDef<Record<string, unknown>>[]}
          loading={loading}
          emptyMessage="No hay parámetros configurados"
        />
      </PageLayout>

      {/* Modal de Crear Parámetro */}
      <ParameterFormModal
        isOpen={createModal.isOpen}
        onClose={createModal.close}
        onSubmit={handleCreateParameter}
        products={products}
        title="Crear Parámetro"
      />

      {/* Modal de Editar Parámetro */}
      <ParameterFormModal
        isOpen={editModal.isOpen}
        onClose={editModal.close}
        onSubmit={(data) => editModal.data && handleEditParameter(data)}
        products={products}
        parameter={editModal.data}
        title="Editar Parámetro"
      />
    </>
  );
}

// Componente Modal para Crear/Editar Parámetros
interface ParameterFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ParameterFormData) => void;
  products: Product[];
  parameter?: Parameter;
  title: string;
}

function ParameterFormModal({
  isOpen,
  onClose,
  onSubmit,
  products,
  parameter,
  title,
}: ParameterFormModalProps) {
  const form = useForm<ParameterFormData>({
    initialValues: {
      productId: parameter?.productId || "",
      name: parameter?.name || "",
      type: parameter?.type || "text",
      expectedValue: parameter?.expectedValue || "",
      minRange: parameter?.minRange || undefined,
      maxRange: parameter?.maxRange || undefined,
      unit: parameter?.unit || "",
      required: parameter?.required ?? false,
      active: parameter?.active ?? true,
    },
    validationRules: {
      productId: { required: true },
      name: { required: true, minLength: 2 },
      type: { required: true },
    },
    onSubmit: async (data) => {
      await onSubmit(data);
    },
  });

  const selectedType = form.values.type;

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
              Nombre *
            </label>
            <input
              type="text"
              name={form.getFieldProps("name").name}
              value={String(form.getFieldProps("name").value)}
              onChange={form.getFieldProps("name").onChange}
              onBlur={form.getFieldProps("name").onBlur}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nombre del parámetro"
            />
            {form.errors.name && (
              <p className="text-red-500 text-sm mt-1">{form.errors.name}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo *
          </label>
          <select
            name={form.getFieldProps("type").name}
            value={String(form.getFieldProps("type").value)}
            onChange={form.getFieldProps("type").onChange}
            onBlur={form.getFieldProps("type").onBlur}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="text">Texto</option>
            <option value="numeric">Numérico</option>
            <option value="range">Rango</option>
          </select>
          {form.errors.type && (
            <p className="text-red-500 text-sm mt-1">{form.errors.type}</p>
          )}
        </div>

        {selectedType === "range" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valor Mínimo
              </label>
              <input
                type="number"
                name={form.getFieldProps("minRange").name}
                value={(form.getFieldProps("minRange").value as number) || ""}
                onChange={form.getFieldProps("minRange").onChange}
                onBlur={form.getFieldProps("minRange").onBlur}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valor Máximo
              </label>
              <input
                type="number"
                name={form.getFieldProps("maxRange").name}
                value={(form.getFieldProps("maxRange").value as number) || ""}
                onChange={form.getFieldProps("maxRange").onChange}
                onBlur={form.getFieldProps("maxRange").onBlur}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unidad
              </label>
              <input
                type="text"
                name={form.getFieldProps("unit").name}
                value={String(form.getFieldProps("unit").value)}
                onChange={form.getFieldProps("unit").onChange}
                onBlur={form.getFieldProps("unit").onBlur}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="kg, cm, etc."
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valor Esperado
            </label>
            <input
              type={selectedType === "numeric" ? "number" : "text"}
              name={form.getFieldProps("expectedValue").name}
              value={String(form.getFieldProps("expectedValue").value)}
              onChange={form.getFieldProps("expectedValue").onChange}
              onBlur={form.getFieldProps("expectedValue").onBlur}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Valor esperado del parámetro"
            />
          </div>
        )}

        <div className="flex items-center space-x-6">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={Boolean(form.values.required)}
              onChange={(e) => form.setValue("required", e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Requerido</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={Boolean(form.values.active)}
              onChange={(e) => form.setValue("active", e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Activo</span>
          </label>
        </div>
      </div>
    </FormModal>
  );
}
