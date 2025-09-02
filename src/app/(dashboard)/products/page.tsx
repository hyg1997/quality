"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Edit, Trash2, Package, Eye } from "lucide-react";
import {
  DataTable,
  FormModal,
  ConfirmModal,
  Badge,
  type ColumnDef,
  type ActionDef,
} from "@/components/ui";
import { PageLayout } from "@/components/layouts/AppLayout";
import { usePermissions } from "@/hooks/usePermissions";
import { useModal, useConfirmModal } from "@/hooks/useModal";
import { useForm } from "@/hooks/useForm";
import { useNotifications } from "@/hooks/useNotifications";
import { productService, type Product } from "@/services/api/products";
import { parameterService, type Parameter } from "@/services/api/parameters";
import {
  masterParameterService,
  type MasterParameter,
} from "@/services/api/masterParameters";

interface ProductFormData extends Record<string, unknown> {
  name: string;
  description: string;
  code: string;
  active: boolean;
}

interface ParameterFormData {
  id?: string;
  masterParameterId?: string;
  name: string;
  type: "range" | "text" | "numeric";
  expectedValue?: string;
  minRange?: number;
  maxRange?: number;
  unit?: string;
  required: boolean;
  active: boolean;
}

export default function ProductsManagement() {
  const { data: session, status } = useSession();
  const { hasPermission } = usePermissions();
  const { success, error } = useNotifications();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const createModal = useModal<Product>();
  const editModal = useModal<Product>();
  const confirmModal = useConfirmModal();

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await productService.getProducts({
        limit: 100,
      });
      if (response.success && response.data) {
        setProducts(response.data.products);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session && hasPermission("content:read")) {
      fetchProducts();
    }
  }, [session, hasPermission, fetchProducts]);

  const handleCreateProduct = useCallback(
    async (data: ProductFormData) => {
      try {
        const response = await productService.createProduct({
          name: data.name,
          description: data.description,
          code: data.code,
          active: data.active,
        });

        if (response.success && response.data) {
          createModal.close();
          await fetchProducts();
          success(
            "Producto creado",
            `El producto ${data.name} ha sido creado exitosamente`
          );
        } else {
          error(
            "Error al crear producto",
            response.error || "No se pudo crear el producto"
          );
        }
      } catch {
        error("Error al crear producto", "Ha ocurrido un error inesperado");
      }
    },
    [createModal, fetchProducts, success, error]
  );

  const handleEditProduct = useCallback(
    async (data: ProductFormData) => {
      if (!editModal.data) return;

      try {
        const response = await productService.updateProduct(editModal.data.id, {
          name: data.name,
          description: data.description,
          code: data.code,
          active: data.active,
        });

        if (response.success && response.data) {
          editModal.close();
          await fetchProducts();
          success(
            "Producto actualizado",
            `El producto ${data.name} ha sido actualizado exitosamente`
          );
        } else {
          error(
            "Error al actualizar producto",
            response.error || "No se pudo actualizar el producto"
          );
        }
      } catch {
        error(
          "Error al actualizar producto",
          "Ha ocurrido un error inesperado"
        );
      }
    },
    [editModal, fetchProducts, success, error]
  );

  const handleDeleteProduct = useCallback(
    async (product: Product) => {
      try {
        const response = await productService.deleteProduct(product.id);

        if (response.success) {
          await fetchProducts();
          success(
            "Producto eliminado",
            `El producto ${product.name} ha sido eliminado exitosamente`
          );
        } else {
          error(
            "Error al eliminar producto",
            response.error || "No se pudo eliminar el producto"
          );
        }
      } catch {
        error("Error al eliminar producto", "Ha ocurrido un error inesperado");
      }
    },
    [fetchProducts, success, error]
  );

  const handleToggleStatus = useCallback(
    async (product: Product) => {
      try {
        const response = await productService.toggleProductStatus(
          product.id,
          !product.active
        );

        if (response.success && response.data) {
          await fetchProducts();
          const statusText = !product.active ? "activado" : "desactivado";
          success(
            "Estado actualizado",
            `El producto ${product.name} ha sido ${statusText} exitosamente`
          );
        } else {
          error(
            "Error al cambiar estado",
            response.error || "No se pudo cambiar el estado del producto"
          );
        }
      } catch {
        error("Error al cambiar estado", "Ha ocurrido un error inesperado");
      }
    },
    [fetchProducts, success, error]
  );

  // Memoize columns definition to prevent recreation on every render
  const columns: ColumnDef<Product>[] = useMemo(
    () => [
      {
        key: "code",
        header: "Código",
        cell: (product) => (
          <div className="text-sm font-mono">{product.code || "-"}</div>
        ),
      },
      {
        key: "name",
        header: "Nombre",
        cell: (product) => (
          <div>
            <div className="font-medium">{product.name}</div>
            {product.description && (
              <div className="text-sm text-gray-500">{product.description}</div>
            )}
          </div>
        ),
      },
      {
        key: "parameters",
        header: "Parámetros",
        cell: (product) => (
          <Badge variant="info" size="sm">
            {product._count?.parameters || 0} parámetros
          </Badge>
        ),
      },
      {
        key: "records",
        header: "Registros",
        cell: (product) => (
          <Badge variant="default" size="sm">
            {product._count?.records || 0} registros
          </Badge>
        ),
      },
      {
        key: "active",
        header: "Estado",
        cell: (product) => (
          <Badge variant={product.active ? "success" : "danger"}>
            {product.active ? "Activo" : "Inactivo"}
          </Badge>
        ),
      },
    ],
    []
  );

  // Memoize actions definition to prevent recreation on every render
  const actions = useMemo(
    () =>
      [
        {
          label: "Editar",
          onClick: (product: Product) => editModal.open(product),
          icon: <Edit className="h-4 w-4" />,
          variant: "secondary" as const,
          hidden: () => !hasPermission("content:update"),
        },
        {
          label: "Visible",
          onClick: handleToggleStatus,
          icon: <Eye className="h-4 w-4" />,
          variant: "secondary" as const,
          hidden: () => !hasPermission("content:update"),
        },
        {
          label: "Eliminar",
          onClick: (product: Product) =>
            confirmModal.confirm({
              title: "Eliminar Producto",
              message: `¿Estás seguro de que deseas eliminar el producto "${product.name}"?`,
              onConfirm: () => handleDeleteProduct(product),
            }),
          icon: <Trash2 className="h-4 w-4" />,
          variant: "danger" as const,
          hidden: () => !hasPermission("content:delete"),
        },
      ] as ActionDef<Product>[],
    [
      editModal,
      handleToggleStatus,
      confirmModal,
      handleDeleteProduct,
      hasPermission,
    ]
  );

  if (status === "loading" || loading) {
    return (
      <PageLayout title="Administra el catálogo de productos del sistema">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </PageLayout>
    );
  }

  if (!session || !hasPermission("content:read")) {
    return (
      <PageLayout title="Acceso Denegado">
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Acceso Restringido
          </h3>
          <p className="text-gray-600">
            No tienes permisos para acceder a la gestión de productos.
          </p>
        </div>
      </PageLayout>
    );
  }

  return (
    <>
      <PageLayout
        title="Administra el catálogo de productos del sistema"
        actions={
          hasPermission("content:create") ? (
            <button
              onClick={() => createModal.open()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear Producto
            </button>
          ) : undefined
        }
      >
        <DataTable
          data={products}
          columns={columns}
          actions={actions}
          loading={loading}
          emptyMessage="No hay productos registrados"
        />
      </PageLayout>

      {/* Modal de Crear Producto */}
      <ProductFormModal
        isOpen={createModal.isOpen}
        onClose={createModal.close}
        onSubmit={handleCreateProduct}
        title="Crear Producto"
      />

      {/* Modal de Editar Producto */}
      <ProductFormModal
        isOpen={editModal.isOpen}
        onClose={editModal.close}
        onSubmit={handleEditProduct}
        product={editModal.data}
        title="Editar Producto"
      />

      {/* Modal de Confirmación */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.handleConfirm}
        onClose={confirmModal.close}
      />
    </>
  );
}

// Componente del formulario de producto
interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProductFormData) => void;
  product?: Product;
  title: string;
}

function ProductFormModal({
  isOpen,
  onClose,
  onSubmit,
  product,
  title,
}: ProductFormModalProps) {
  const [parameters, setParameters] = useState<ParameterFormData[]>([]);
  const [availableParameters, setAvailableParameters] = useState<
    MasterParameter[]
  >([]);
  const [activeTab, setActiveTab] = useState<"product" | "parameters">(
    "product"
  );

  const form = useForm<ProductFormData>({
    initialValues: {
      name: product?.name || "",
      description: product?.description || "",
      code: product?.code || "",
      active: product?.active ?? true,
    },
    validationRules: {
      name: { required: true, minLength: 2 },
      code: { minLength: 2 },
    },
    onSubmit: async (data) => {
      await handleSubmit(data);
    },
  });

  const loadAvailableParameters = useCallback(async () => {
    try {
      // Get master parameters from the master_parameters table
      const response = await masterParameterService.getMasterParameters({
        limit: 1000,
        active: true, // Only get active master parameters
      });
      if (response.success && response.data && response.data.masterParameters) {
        // Get masterParameterIds that are already used in the current product
        const usedMasterParameterIds = parameters
          .map((p) => p.masterParameterId)
          .filter(Boolean); // Remove undefined/null values

        // Filter out master parameters that are already assigned to this product
        const availableMasterParameters = response.data.masterParameters.filter(
          (masterParam) => !usedMasterParameterIds.includes(masterParam.id)
        );

        // Remove duplicates from available master parameters
        const uniqueParameters = availableMasterParameters.reduce(
          (acc: MasterParameter[], param) => {
            // Check if parameter is not already in the accumulator
            if (!acc.find((p) => p.id === param.id)) {
              acc.push(param);
            }
            return acc;
          },
          []
        );

        setAvailableParameters(uniqueParameters);
      }
    } catch (error) {
      console.error("Error loading master parameters:", error);
    }
  }, [parameters]);

  // Load parameters from product data when editing
  useEffect(() => {
    if (product?.parameters && Array.isArray(product.parameters) && isOpen) {
      const parameterData = product.parameters.map((param: Parameter) => ({
        id: param.id,
        name: param.name,
        type: param.type,
        expectedValue: param.expectedValue || "",
        minRange: param.minRange || 0,
        maxRange: param.maxRange || 100,
        unit: param.unit || "",
        required: param.required,
        active: param.active,
      }));
      setParameters(parameterData);
    } else if (!product?.id) {
      setParameters([]);
    }
  }, [product?.parameters, isOpen, product?.id]);

  // Load all available parameters for selection
  useEffect(() => {
    if (isOpen && product?.id) {
      loadAvailableParameters();
    }
  }, [isOpen, product?.id, parameters, loadAvailableParameters]);

  const addParameter = () => {
    const newParameter: ParameterFormData = {
      name: "",
      type: "range",
      expectedValue: "",
      minRange: 0,
      maxRange: 100,
      unit: "",
      required: true,
      active: true,
    };
    setParameters([...parameters, newParameter]);
  };

  const removeParameter = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index));
  };

  const updateParameter = (
    index: number,
    field: keyof ParameterFormData,
    value: string | number | boolean
  ) => {
    const updatedParameters = [...parameters];
    updatedParameters[index] = { ...updatedParameters[index], [field]: value };
    setParameters(updatedParameters);
  };

  const selectExistingParameter = (index: number, parameterId: string) => {
    const selectedParam = availableParameters.find((p) => p.id === parameterId);
    if (selectedParam) {
      const updatedParameters = [...parameters];
      updatedParameters[index] = {
        masterParameterId: selectedParam.id,
        name: selectedParam.name,
        type: selectedParam.type,
        expectedValue: selectedParam.defaultValue || "",
        minRange: selectedParam.minRange || 0,
        maxRange: selectedParam.maxRange || 100,
        unit: selectedParam.unit || "",
        required: true,
        active: selectedParam.active,
      };
      setParameters(updatedParameters);
      // Refresh available parameters to exclude the newly selected one
      loadAvailableParameters();
    }
  };

  const saveParameters = async () => {
    if (!product?.id) return;

    try {
      // Save or update each parameter
      for (const param of parameters) {
        if (param.id) {
          // Update existing parameter
          await parameterService.updateParameter(param.id, {
            name: param.name,
            type: param.type,
            expectedValue: param.expectedValue,
            minRange: param.minRange,
            maxRange: param.maxRange,
            unit: param.unit,
            required: param.required,
            active: param.active,
          });
        } else {
          // Create new parameter
          await parameterService.createParameter({
            productId: product.id,
            masterParameterId: param.masterParameterId,
            name: param.name,
            type: param.type,
            expectedValue: param.expectedValue,
            minRange: param.minRange,
            maxRange: param.maxRange,
            unit: param.unit,
            required: param.required,
            active: param.active,
          });
        }
      }
    } catch (error) {
      console.error("Error saving parameters:", error);
    }
  };

  const handleSubmit = async (data: ProductFormData) => {
    await onSubmit(data);
    if (product?.id) {
      await saveParameters();
    }
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={form.handleSubmit}
      title={title}
      loading={form.isSubmitting}
      disabled={!form.isValid}
      size="xl"
    >
      <div className="space-y-6">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              type="button"
              onClick={() => setActiveTab("product")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "product"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Información del Producto
            </button>
            {product?.id && (
              <button
                type="button"
                onClick={() => setActiveTab("parameters")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "parameters"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Parámetros ({parameters.length})
              </button>
            )}
          </nav>
        </div>

        {/* Product Tab */}
        {activeTab === "product" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del Producto *
              </label>
              <input
                type="text"
                value={form.values.name}
                onChange={(e) => form.setValue("name", e.target.value)}
                onBlur={() => form.handleBlur("name")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ingresa el nombre del producto"
              />
              {form.errors.name && (
                <p className="text-red-500 text-sm mt-1">{form.errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código
              </label>
              <input
                type="text"
                value={form.values.code}
                onChange={(e) => form.setValue("code", e.target.value)}
                onBlur={() => form.handleBlur("code")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Código único del producto"
              />
              {form.errors.code && (
                <p className="text-red-500 text-sm mt-1">{form.errors.code}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                value={form.values.description}
                onChange={(e) => form.setValue("description", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Descripción del producto"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="active"
                checked={form.values.active}
                onChange={(e) => form.setValue("active", e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label
                htmlFor="active"
                className="ml-2 block text-sm text-gray-900"
              >
                Producto activo
              </label>
            </div>
          </div>
        )}

        {/* Parameters Tab */}
        {activeTab === "parameters" && product?.id && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                Parámetros del Producto
              </h3>
              <button
                type="button"
                onClick={addParameter}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4 mr-1" />
                Agregar Parámetro
              </button>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {parameters.map((param, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Parámetro
                        </label>
                        {param.id ? (
                          <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700">
                            {param.name}
                          </div>
                        ) : (
                          <select
                            value={param.id || ""}
                            onChange={(e) =>
                              selectExistingParameter(index, e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Seleccionar parámetro...</option>
                            {availableParameters.map((availableParam) => (
                              <option
                                key={availableParam.id}
                                value={availableParam.id}
                              >
                                {availableParam.name} (
                                {availableParam.type === "range"
                                  ? "Rango"
                                  : availableParam.type === "text"
                                  ? "Texto"
                                  : "Numérico"}
                                )
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tipo
                        </label>
                        <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700">
                          {param.type === "range"
                            ? "Rango"
                            : param.type === "text"
                            ? "Texto"
                            : "Numérico"}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeParameter(index)}
                      className="ml-4 text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {param.type === "range" && (
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Mínimo
                        </label>
                        <input
                          type="number"
                          value={param.minRange || 0}
                          onChange={(e) =>
                            updateParameter(
                              index,
                              "minRange",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Máximo
                        </label>
                        <input
                          type="number"
                          value={param.maxRange || 100}
                          onChange={(e) =>
                            updateParameter(
                              index,
                              "maxRange",
                              parseFloat(e.target.value) || 100
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Unidad
                        </label>
                        <input
                          type="text"
                          value={param.unit || ""}
                          onChange={(e) =>
                            updateParameter(index, "unit", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="ej: mm, kg, %"
                        />
                      </div>
                    </div>
                  )}

                  {(param.type === "text" || param.type === "numeric") && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Valor Esperado
                      </label>
                      <input
                        type={param.type === "numeric" ? "number" : "text"}
                        value={param.expectedValue || ""}
                        onChange={(e) =>
                          updateParameter(
                            index,
                            "expectedValue",
                            e.target.value
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Valor esperado"
                      />
                    </div>
                  )}

                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id={`required-${index}`}
                        checked={param.required}
                        onChange={(e) =>
                          updateParameter(index, "required", e.target.checked)
                        }
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor={`required-${index}`}
                        className="ml-2 block text-sm text-gray-900"
                      >
                        Requerido
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id={`active-${index}`}
                        checked={param.active}
                        onChange={(e) =>
                          updateParameter(index, "active", e.target.checked)
                        }
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor={`active-${index}`}
                        className="ml-2 block text-sm text-gray-900"
                      >
                        Activo
                      </label>
                    </div>
                  </div>
                </div>
              ))}

              {parameters.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No hay parámetros configurados</p>
                  <p className="text-sm">
                    Haz clic en &quot;Agregar Parámetro&quot; para comenzar
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </FormModal>
  );
}
