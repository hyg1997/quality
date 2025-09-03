"use client";

import { useSession } from "next-auth/react";
import { useMemo, useCallback } from "react";
import { Plus, Edit, Trash2, Package, Eye } from "lucide-react";
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
import {
  masterParameterService,
  type MasterParameter,
} from "@/services/api/masterParameters";

interface MasterParameterFormData extends Record<string, unknown> {
  name: string;
  description?: string;
  type: "range" | "text" | "numeric";
  defaultValue?: string;
  minRange?: number;
  maxRange?: number;
  unit?: string;
  active: boolean;
}

export default function MasterParametersManagement() {
  const { data: session, status } = useSession();
  const { hasPermission } = usePermissions();
  const { success, error } = useNotifications();

  const createModal = useModal<MasterParameter>();
  const editModal = useModal<MasterParameter>();
  const confirmModal = useConfirmModal();

  const {
    data: masterParameters,
    loading,
    searchProps,
    refetch: refetchMasterParameters,
  } = useDataTableSearch<MasterParameter>({
    fetchData: async (searchTerm?: string) => {
      const response = await masterParameterService.getMasterParameters({
        limit: 100,
        search: searchTerm,
      });

      if (!response.success || !response.data) {
        throw new Error("Error fetching master parameters");
      }

      return response.data.masterParameters;
    },
    placeholder: "Buscar parámetros por nombre, descripción o tipo...",
  });

  const handleCreateMasterParameter = useCallback(
    async (data: MasterParameterFormData) => {
      try {
        const response = await masterParameterService.createMasterParameter({
          name: data.name,
          description: data.description,
          type: data.type,
          active: data.active,
        });

        if (response.success && response.data) {
          createModal.close();
          await refetchMasterParameters();
          success(
            "Parámetro maestro creado",
            `El parámetro maestro ${data.name} ha sido creado exitosamente`
          );
        } else {
          error(
            "Error al crear parámetro maestro",
            response.error || "No se pudo crear el parámetro maestro"
          );
        }
      } catch {
        error(
          "Error al crear parámetro maestro",
          "Ha ocurrido un error inesperado"
        );
      }
    },
    [createModal, refetchMasterParameters, success, error]
  );

  const handleEditMasterParameter = useCallback(
    async (data: MasterParameterFormData) => {
      if (!editModal.data) return;

      try {
        const response = await masterParameterService.updateMasterParameter(
          editModal.data.id,
          {
            name: data.name,
            description: data.description,
            type: data.type,
            active: data.active,
          }
        );

        if (response.success && response.data) {
          editModal.close();
          await refetchMasterParameters();
          success(
            "Parámetro maestro actualizado",
            `El parámetro maestro ${data.name} ha sido actualizado exitosamente`
          );
        } else {
          error(
            "Error al actualizar parámetro maestro",
            response.error || "No se pudo actualizar el parámetro maestro"
          );
        }
      } catch {
        error(
          "Error al actualizar parámetro maestro",
          "Ha ocurrido un error inesperado"
        );
      }
    },
    [editModal, refetchMasterParameters, success, error]
  );

  const handleDeleteMasterParameter = useCallback(
    async (masterParameter: MasterParameter) => {
      confirmModal.confirm({
        title: "Eliminar Parámetro Maestro",
        message: `¿Estás seguro de que quieres eliminar el parámetro maestro "${masterParameter.name}"?`,
        type: "danger",
        confirmText: "Eliminar",
        onConfirm: async () => {
          try {
            const response = await masterParameterService.deleteMasterParameter(
              masterParameter.id
            );

            if (response.success) {
              await refetchMasterParameters();
              success(
                "Parámetro maestro eliminado",
                `El parámetro maestro ${masterParameter.name} ha sido eliminado exitosamente`
              );
            } else {
              error(
                "Error al eliminar parámetro maestro",
                response.error || "No se pudo eliminar el parámetro maestro"
              );
            }
          } catch {
            error(
              "Error al eliminar parámetro maestro",
              "Ha ocurrido un error inesperado"
            );
          }
        },
      });
    },
    [confirmModal, refetchMasterParameters, success, error]
  );

  const handleToggleStatus = useCallback(
    async (masterParameter: MasterParameter) => {
      try {
        const response =
          await masterParameterService.toggleMasterParameterStatus(
            masterParameter.id,
            !masterParameter.active
          );

        if (response.success && response.data) {
          await refetchMasterParameters();
          const statusText = !masterParameter.active
            ? "activado"
            : "desactivado";
          success(
            "Estado actualizado",
            `El parámetro maestro ${masterParameter.name} ha sido ${statusText} exitosamente`
          );
        } else {
          error(
            "Error al cambiar estado",
            response.error ||
              "No se pudo cambiar el estado del parámetro maestro"
          );
        }
      } catch {
        error("Error al cambiar estado", "Ha ocurrido un error inesperado");
      }
    },
    [refetchMasterParameters, success, error]
  );

  const columns: ColumnDef<MasterParameter>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Nombre",
        cell: (masterParameter) => (
          <div>
            <div className="font-medium text-gray-900">
              {masterParameter.name}
            </div>
            {masterParameter.description && (
              <div className="text-sm text-gray-500">
                {masterParameter.description}
              </div>
            )}
          </div>
        ),
      },
      {
        key: "type",
        header: "Tipo",
        cell: (masterParameter) => {
          const typeColors = {
            range: "bg-blue-100 text-blue-800",
            text: "bg-green-100 text-green-800",
            numeric: "bg-purple-100 text-purple-800",
          };
          return (
            <Badge className={typeColors[masterParameter.type]}>
              {masterParameter.type}
            </Badge>
          );
        },
      },
      {
        key: "active",
        header: "Estado",
        cell: (masterParameter) => (
          <Badge variant={masterParameter.active ? "success" : "default"}>
            {masterParameter.active ? "Activo" : "Inactivo"}
          </Badge>
        ),
      },
      {
        key: "createdAt",
        header: "Creado",
        cell: (masterParameter) => (
          <div className="text-sm text-gray-500">
            {new Date(masterParameter.createdAt).toLocaleDateString()}
          </div>
        ),
      },
    ],
    []
  );

  const actions: ActionDef<MasterParameter>[] = useMemo(
    () => [
      {
        label: "Editar",
        onClick: (masterParameter) => editModal.open(masterParameter),
        icon: <Edit className="h-4 w-4" />,
        variant: "secondary",
        hidden: () => !hasPermission("content:update"),
      },
      {
        label: "Cambiar Estado",
        onClick: handleToggleStatus,
        icon: <Eye className="h-4 w-4" />,
        variant: "secondary",
        hidden: () => !hasPermission("content:update"),
      },
      {
        label: "Eliminar",
        onClick: handleDeleteMasterParameter,
        icon: <Trash2 className="h-4 w-4" />,
        variant: "danger",
        hidden: () => !hasPermission("content:delete"),
      },
    ],
    [editModal, handleToggleStatus, handleDeleteMasterParameter, hasPermission]
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

  if (!session || !hasPermission("content:read")) {
    return (
      <PageLayout title="Acceso Denegado">
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Acceso Restringido
          </h3>
          <p className="text-gray-600">
            No tienes permisos para ver la gestión de parámetros maestros.
          </p>
        </div>
      </PageLayout>
    );
  }

  return (
    <>
      <PageLayout
        title="Gestión de Parámetros Maestros"
        actions={
          hasPermission("content:create") ? (
            <button
              onClick={() => createModal.open()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear Parámetro Maestro
            </button>
          ) : undefined
        }
      >
        <DataTable
          data={masterParameters}
          columns={columns}
          actions={actions}
          loading={loading}
          emptyMessage="No hay parámetros maestros configurados"
          search={searchProps}
        />
      </PageLayout>

      {/* Modal de Crear Parámetro Maestro */}
      <MasterParameterFormModal
        isOpen={createModal.isOpen}
        onClose={createModal.close}
        onSubmit={handleCreateMasterParameter}
        title="Crear Parámetro Maestro"
      />

      {/* Modal de Editar Parámetro Maestro */}
      <MasterParameterFormModal
        isOpen={editModal.isOpen}
        onClose={editModal.close}
        onSubmit={(data) => editModal.data && handleEditMasterParameter(data)}
        masterParameter={editModal.data}
        title="Editar Parámetro Maestro"
      />
    </>
  );
}

interface MasterParameterFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: MasterParameterFormData) => void;
  masterParameter?: MasterParameter;
  title: string;
}

function MasterParameterFormModal({
  isOpen,
  onClose,
  onSubmit,
  masterParameter,
  title,
}: MasterParameterFormModalProps) {
  const form = useForm<MasterParameterFormData>({
    initialValues: {
      name: masterParameter?.name || "",
      description: masterParameter?.description || "",
      type: masterParameter?.type || "text",
      active: masterParameter?.active ?? true,
    },
    validationRules: {
      name: { required: true, minLength: 2 },
      type: { required: true },
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
              Nombre *
            </label>
            <input
              type="text"
              name={form.getFieldProps("name").name}
              value={String(form.getFieldProps("name").value)}
              onChange={form.getFieldProps("name").onChange}
              onBlur={form.getFieldProps("name").onBlur}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nombre del parámetro maestro"
            />
            {form.errors.name && (
              <p className="text-red-500 text-sm mt-1">{form.errors.name}</p>
            )}
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
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descripción
          </label>
          <textarea
            name={form.getFieldProps("description").name}
            value={String(form.getFieldProps("description").value)}
            onChange={form.getFieldProps("description").onChange}
            onBlur={form.getFieldProps("description").onBlur}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Descripción del parámetro maestro"
            rows={3}
          />
        </div>
        <div className="flex items-center space-x-6">
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
