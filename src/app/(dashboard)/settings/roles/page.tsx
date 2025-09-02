"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Shield, Users, Plus, Edit, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  Button,
  Badge,
  DataTable,
  FormModal,
  ConfirmModal,
  type ColumnDef,
  type ActionDef,
} from "@/components/ui";
import { PageLayout } from "@/components/layouts/AppLayout";
import { usePermissions } from "@/hooks/usePermissions";
import { useApi } from "@/hooks/useApi";
import { useModal, useConfirmModal } from "@/hooks/useModal";
import { useForm } from "@/hooks/useForm";

interface Role extends Record<string, unknown> {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  level: number;
  permissions: Permission[];
  userCount: number;
  isProtected: boolean;
}

interface Permission {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  resource: string;
  action: string;
}

interface RoleFormData extends Record<string, unknown> {
  name: string;
  displayName: string;
  description: string;
  level: number;
  permissions: string[];
}

export default function RolesManagementPage() {
  const { data: session, status } = useSession();
  const { isAdmin } = usePermissions();
  const api = useApi();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  // Lista estática de permisos para evitar llamadas a la API
  const permissions: Permission[] = useMemo(
    () => [
      {
        id: "1",
        name: "users:create",
        displayName: "Crear Usuarios",
        description: null,
        resource: "users",
        action: "create",
      },
      {
        id: "2",
        name: "users:read",
        displayName: "Ver Usuarios",
        description: null,
        resource: "users",
        action: "read",
      },
      {
        id: "3",
        name: "users:update",
        displayName: "Editar Usuarios",
        description: null,
        resource: "users",
        action: "update",
      },
      {
        id: "4",
        name: "users:delete",
        displayName: "Eliminar Usuarios",
        description: null,
        resource: "users",
        action: "delete",
      },
      {
        id: "5",
        name: "roles:create",
        displayName: "Crear Roles",
        description: null,
        resource: "roles",
        action: "create",
      },
      {
        id: "6",
        name: "roles:read",
        displayName: "Ver Roles",
        description: null,
        resource: "roles",
        action: "read",
      },
      {
        id: "7",
        name: "roles:update",
        displayName: "Editar Roles",
        description: null,
        resource: "roles",
        action: "update",
      },
      {
        id: "8",
        name: "roles:delete",
        displayName: "Eliminar Roles",
        description: null,
        resource: "roles",
        action: "delete",
      },
      {
        id: "9",
        name: "analytics:read",
        displayName: "Ver Reportes",
        description: null,
        resource: "analytics",
        action: "read",
      },
      {
        id: "10",
        name: "analytics:export",
        displayName: "Exportar Reportes",
        description: null,
        resource: "analytics",
        action: "export",
      },
    ],
    []
  );
  const createModal = useModal<Role>();
  const editModal = useModal<Role>();
  const confirmModal = useConfirmModal();

  const fetchRoles = useCallback(async () => {
    if (!loading) return; // Evitar llamadas duplicadas
    const response = await api.get("/api/roles");
    if (response.success && response.data) {
      setRoles(response.data as Role[]);
    }
    setLoading(false);
  }, [api, loading]);

  // Memoize columns definition to prevent recreation on every render
  const columns: ColumnDef<Role>[] = useMemo(
    () => [
      {
        key: "displayName",
        header: "Nombre del Rol",
        cell: (role) => (
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4 text-blue-600" />
            <span className="font-medium">{role.displayName}</span>
          </div>
        ),
      },
      {
        key: "level",
        header: "Nivel",
        cell: (role) => (
          <Badge
            variant={
              role.level >= 80
                ? "danger"
                : role.level >= 50
                ? "warning"
                : "default"
            }
          >
            Nivel {role.level}
          </Badge>
        ),
      },
      {
        key: "userCount",
        header: "Usuarios",
        cell: (role) => (
          <div className="flex items-center space-x-1">
            <Users className="h-4 w-4 text-gray-400" />
            <span>{role.userCount}</span>
          </div>
        ),
      },
      {
        key: "permissions",
        header: "Permisos",
        cell: (role) => (
          <div className="flex flex-wrap gap-1">
            {role.permissions.slice(0, 3).map((permission) => (
              <Badge key={permission.id} variant="info" size="sm">
                {permission.displayName}
              </Badge>
            ))}
            {role.permissions.length > 3 && (
              <Badge variant="default" size="sm">
                +{role.permissions.length - 3} más
              </Badge>
            )}
          </div>
        ),
      },
    ],
    []
  );

  useEffect(() => {
    if (session && loading) {
      fetchRoles();
    }
  }, [session, loading, fetchRoles]);

  const handleDeleteRole = useCallback(
    async (role: Role) => {
      confirmModal.confirm({
        title: "Eliminar Rol",
        message: `¿Estás seguro de que quieres eliminar el rol "${role.displayName}"?`,
        type: "danger",
        confirmText: "Eliminar",
        onConfirm: async () => {
          const response = await api.delete(`/api/roles/${role.id}`, {
            showSuccessNotification: true,
            successMessage: "Rol eliminado exitosamente",
          });
          if (response.success) {
            await fetchRoles();
          }
        },
      });
    },
    [api, confirmModal, fetchRoles]
  );

  const handleCreateRole = async (formData: RoleFormData) => {
    const response = await api.post("/api/roles", formData, {
      showSuccessNotification: true,
      successMessage: "Rol creado exitosamente",
    });
    if (response.success) {
      createModal.close();
      await fetchRoles();
    }
  };

  const handleUpdateRole = async (roleId: string, formData: RoleFormData) => {
    const response = await api.put(`/api/roles/${roleId}`, formData, {
      showSuccessNotification: true,
      successMessage: "Rol actualizado exitosamente",
    });
    if (response.success) {
      editModal.close();
      await fetchRoles();
    }
  };

  // Memoize actions definition to prevent recreation on every render
  const actions: ActionDef<Role>[] = useMemo(
    () => [
      {
        label: "Editar",
        onClick: (role) => editModal.open(role),
        icon: <Edit className="h-4 w-4" />,
        variant: "secondary",
        disabled: (role) => role.isProtected,
      },
      {
        label: "Eliminar",
        onClick: handleDeleteRole,
        icon: <Trash2 className="h-4 w-4" />,
        variant: "danger",
        hidden: (role) => role.isProtected || role.userCount > 0,
      },
    ],
    [editModal, handleDeleteRole]
  );

  if (status === "loading" || loading) {
    return (
      <PageLayout
        title="Gestión de Roles"
        description="Administra roles y permisos del sistema"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </PageLayout>
    );
  }

  if (!session || !isAdmin()) {
    return (
      <PageLayout title="Acceso Denegado">
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Acceso Restringido
            </h3>
            <p className="text-gray-600">
              Solo los administradores pueden acceder a la gestión de roles.
            </p>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  return (
    <>
      <PageLayout
        title="Gestión de Roles"
        description="Administra roles y permisos del sistema"
        actions={
          <Button
            onClick={() => createModal.open()}
            icon={<Plus className="h-4 w-4" />}
          >
            Crear Rol
          </Button>
        }
      >
        <DataTable
          data={roles}
          columns={columns}
          actions={actions}
          loading={loading}
          emptyMessage="No hay roles configurados"
        />
      </PageLayout>

      {/* Modal de Crear Rol */}
      <RoleFormModal
        isOpen={createModal.isOpen}
        onClose={createModal.close}
        onSubmit={handleCreateRole}
        permissions={permissions}
        title="Crear Nuevo Rol"
      />

      {/* Modal de Editar Rol */}
      <RoleFormModal
        isOpen={editModal.isOpen}
        onClose={editModal.close}
        onSubmit={(data) =>
          editModal.data && handleUpdateRole(editModal.data.id, data)
        }
        permissions={permissions}
        role={editModal.data}
        title="Editar Rol"
      />

      {/* Modal de Confirmación */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={confirmModal.close}
        onConfirm={confirmModal.handleConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
      />
    </>
  );
}

// Componente Modal para Crear/Editar Roles
interface RoleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: RoleFormData) => void;
  permissions: Permission[];
  role?: Role;
  title: string;
}

function RoleFormModal({
  isOpen,
  onClose,
  onSubmit,
  permissions,
  role,
  title,
}: RoleFormModalProps) {
  const form = useForm<RoleFormData>({
    initialValues: {
      name: role?.name || "",
      displayName: role?.displayName || "",
      description: role?.description || "",
      level: role?.level || 10,
      permissions: role?.permissions.map((p) => p.id) || [],
    },
    validationRules: {
      name: { required: true, minLength: 2 },
      displayName: { required: true, minLength: 2 },
      level: { required: true },
    },
    onSubmit: async (data) => {
      await onSubmit(data);
    },
  });

  const togglePermission = (permissionId: string) => {
    const currentPermissions = form.values.permissions;
    const newPermissions = currentPermissions.includes(permissionId)
      ? currentPermissions.filter((id) => id !== permissionId)
      : [...currentPermissions, permissionId];

    form.setValue("permissions", newPermissions);
  };

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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del Rol
          </label>
          <input
            type="text"
            name={form.getFieldProps("name").name}
            value={String(form.getFieldProps("name").value)}
            onChange={form.getFieldProps("name").onChange}
            onBlur={form.getFieldProps("name").onBlur}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {form.errors.name && (
            <p className="text-red-500 text-sm mt-1">{form.errors.name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre para Mostrar
          </label>
          <input
            type="text"
            name={form.getFieldProps("displayName").name}
            value={String(form.getFieldProps("displayName").value)}
            onChange={form.getFieldProps("displayName").onChange}
            onBlur={form.getFieldProps("displayName").onBlur}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {form.errors.displayName && (
            <p className="text-red-500 text-sm mt-1">
              {form.errors.displayName}
            </p>
          )}
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
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nivel de Autoridad (1-79)
          </label>
          <input
            type="number"
            min="1"
            max="79"
            name={form.getFieldProps("level").name}
            value={String(form.getFieldProps("level").value)}
            onChange={form.getFieldProps("level").onChange}
            onBlur={form.getFieldProps("level").onBlur}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Niveles 80+ están reservados para administradores
          </p>
          {form.errors.level && (
            <p className="text-red-500 text-sm mt-1">{form.errors.level}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Permisos
          </label>
          <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3">
            {permissions.map((permission) => (
              <label
                key={permission.id}
                className="flex items-center space-x-2 py-1"
              >
                <input
                  type="checkbox"
                  checked={form.values.permissions.includes(permission.id)}
                  onChange={() => togglePermission(permission.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-500">
                  {permission.displayName}
                </span>
                <span className="text-xs text-gray-500">
                  ({permission.resource}.{permission.action})
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </FormModal>
  );
}
