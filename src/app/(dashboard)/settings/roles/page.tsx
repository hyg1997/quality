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
import { useModal, useConfirmModal } from "@/hooks/useModal";
import { useForm } from "@/hooks/useForm";
import { useNotifications } from "@/hooks/useNotifications";
import { useDataTableSearch } from "@/hooks/useDataTableSearch";

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
  const { isAdmin, hasPermission } = usePermissions();
  const { success, error } = useNotifications();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(true);

  const createModal = useModal<Role>();
  const editModal = useModal<Role>();
  const confirmModal = useConfirmModal();

  // Hook para manejar búsqueda de roles
  const {
    data: roles,
    loading,
    searchProps,
    refetch: refetchRoles,
  } = useDataTableSearch<Role>({
    fetchData: async (searchTerm?: string) => {
      const url = new URL("/api/roles", window.location.origin);
      if (searchTerm) {
        url.searchParams.set("search", searchTerm);
      }

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error("Error fetching roles");
      }

      return response.json();
    },
    placeholder: "Buscar roles por nombre o descripción...",
  });

  const fetchPermissions = useCallback(async () => {
    setPermissionsLoading(true);
    try {
      const response = await fetch("/api/permissions");
      if (response.ok) {
        const data = await response.json();
        setPermissions(data.permissions || []);
      } else {
        console.error("Error fetching permissions:", response.statusText);
      }
    } catch (error) {
      console.error("Error fetching permissions:", error);
    } finally {
      setPermissionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session && hasPermission("roles:read")) {
      fetchPermissions();
    }
  }, [session, hasPermission, fetchPermissions]);

  const handleCreateRole = useCallback(
    async (data: RoleFormData) => {
      try {
        const response = await fetch("/api/roles", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: data.name,
            displayName: data.displayName,
            description: data.description,
            level: data.level,
            permissions: data.permissions,
          }),
        });

        if (response.ok) {
          createModal.close();
          await refetchRoles();
          success(
            "Rol creado",
            `El rol ${data.displayName} ha sido creado exitosamente`
          );
        } else {
          const errorData = await response.json();
          error(
            "Error al crear rol",
            errorData.error || "No se pudo crear el rol"
          );
        }
      } catch {
        error("Error al crear rol", "Ha ocurrido un error inesperado");
      }
    },
    [createModal, refetchRoles, success, error]
  );

  const handleEditRole = useCallback(
    async (data: RoleFormData) => {
      if (!editModal.data) return;

      try {
        const response = await fetch(`/api/roles/${editModal.data.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: data.name,
            displayName: data.displayName,
            description: data.description,
            level: data.level,
            permissions: data.permissions,
          }),
        });

        if (response.ok) {
          editModal.close();
          await refetchRoles();
          success(
            "Rol actualizado",
            `El rol ${data.displayName} ha sido actualizado exitosamente`
          );
        } else {
          const errorData = await response.json();
          error(
            "Error al actualizar rol",
            errorData.error || "No se pudo actualizar el rol"
          );
        }
      } catch {
        error("Error al actualizar rol", "Ha ocurrido un error inesperado");
      }
    },
    [editModal, refetchRoles, success, error]
  );

  const handleDeleteRole = useCallback(
    async (role: Role) => {
      try {
        const response = await fetch(`/api/roles/${role.id}`, {
          method: "DELETE",
        });

        if (response.ok) {
          await refetchRoles();
          success(
            "Rol eliminado",
            `El rol ${role.displayName} ha sido eliminado exitosamente`
          );
        } else {
          const errorData = await response.json();
          error(
            "Error al eliminar rol",
            errorData.error || "No se pudo eliminar el rol"
          );
        }
      } catch {
        error("Error al eliminar rol", "Ha ocurrido un error inesperado");
      }
    },
    [refetchRoles, success, error]
  );

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
            <span>{role.userCount || 0}</span>
          </div>
        ),
      },
      {
        key: "permissions",
        header: "Permisos",
        cell: (role) => (
          <div className="flex flex-wrap gap-1">
            {role.permissions?.slice(0, 3).map((permission) => (
              <Badge key={permission.id} variant="info" size="sm">
                {permission.displayName}
              </Badge>
            ))}
            {role.permissions && role.permissions.length > 3 && (
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

  const actions: ActionDef<Role>[] = useMemo(
    () => [
      {
        label: "Editar",
        icon: <Edit className="h-4 w-4" />,
        onClick: (role) => editModal.open(role),
        variant: "secondary" as const,
        disabled: (role) => !hasPermission("roles:update") || role.isProtected,
      },
      {
        label: "Eliminar",
        icon: <Trash2 className="h-4 w-4" />,
        onClick: (role) => {
          confirmModal.confirm({
            title: "Eliminar Rol",
            message: `¿Estás seguro de que quieres eliminar el rol "${role.displayName}"? Esta acción no se puede deshacer.`,
            type: "danger",
            confirmText: "Eliminar",
            onConfirm: () => handleDeleteRole(role),
          });
        },
        variant: "danger" as const,
        disabled: (role) => !hasPermission("roles:delete") || role.isProtected,
      },
    ],
    [editModal, confirmModal, handleDeleteRole, hasPermission]
  );

  // Loading state
  if (status === "loading" || permissionsLoading) {
    return (
      <PageLayout title="Gestión de Roles">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
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

  // Access denied
  if (!session || !isAdmin) {
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
        actions={
          <Button
            onClick={() => createModal.open()}
            icon={<Plus className="h-4 w-4" />}
            disabled={!hasPermission("roles:create")}
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
          emptyMessage="No hay roles disponibles"
          search={searchProps}
        />
      </PageLayout>

      {/* Modal para crear rol */}
      <RoleFormModal
        isOpen={createModal.isOpen}
        onClose={createModal.close}
        onSubmit={handleCreateRole}
        permissions={permissions}
        title="Crear Nuevo Rol"
      />

      {/* Modal para editar rol */}
      <RoleFormModal
        isOpen={editModal.isOpen}
        onClose={editModal.close}
        onSubmit={handleEditRole}
        permissions={permissions}
        role={editModal.data}
        title="Editar Rol"
      />

      {/* Modal de confirmación */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        onConfirm={confirmModal.handleConfirm}
        onClose={confirmModal.close}
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

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    const currentPermissions = form.values.permissions as string[];
    if (checked) {
      form.setValue("permissions", [...currentPermissions, permissionId]);
    } else {
      form.setValue(
        "permissions",
        currentPermissions.filter((id) => id !== permissionId)
      );
    }
  };

  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.resource]) {
      acc[permission.resource] = [];
    }
    acc[permission.resource].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      onSubmit={form.handleSubmit}
      loading={form.isSubmitting}
      disabled={!form.isValid}
      submitText={role ? "Actualizar Rol" : "Crear Rol"}
    >
      <div className="space-y-6">
        {/* Información básica del rol */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Rol *
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ej: admin, editor, viewer"
              value={form.values.name as string}
              onChange={form.getFieldProps("name").onChange}
              onBlur={form.getFieldProps("name").onBlur}
              name="name"
            />
            {form.errors.name && (
              <p className="text-red-500 text-sm mt-1">{form.errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre para Mostrar *
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ej: Administrador, Editor, Visualizador"
              value={form.values.displayName as string}
              onChange={form.getFieldProps("displayName").onChange}
              onBlur={form.getFieldProps("displayName").onBlur}
              name="displayName"
            />
            {form.errors.displayName && (
              <p className="text-red-500 text-sm mt-1">
                {form.errors.displayName}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descripción
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Descripción del rol y sus responsabilidades"
            value={form.values.description as string}
            onChange={form.getFieldProps("description").onChange}
            onBlur={form.getFieldProps("description").onBlur}
            name="description"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nivel de Autoridad *
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.values.level as number}
            onChange={form.getFieldProps("level").onChange}
            onBlur={form.getFieldProps("level").onBlur}
            name="level"
          >
            <option value={10}>Nivel 10 - Básico</option>
            <option value={20}>Nivel 20 - Usuario</option>
            <option value={30}>Nivel 30 - Colaborador</option>
            <option value={40}>Nivel 40 - Editor</option>
            <option value={50}>Nivel 50 - Moderador</option>
            <option value={60}>Nivel 60 - Supervisor</option>
            <option value={70}>Nivel 70 - Gerente</option>
            <option value={80}>Nivel 80 - Administrador</option>
            <option value={90}>Nivel 90 - Super Admin</option>
            <option value={100}>Nivel 100 - Root</option>
          </select>
          {form.errors.level && (
            <p className="text-red-500 text-sm mt-1">{form.errors.level}</p>
          )}
        </div>

        {/* Permisos agrupados por recurso */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Permisos
          </label>
          <div className="space-y-4 max-h-60 overflow-y-auto border border-gray-200 rounded-md p-4">
            {Object.entries(groupedPermissions).map(([resource, perms]) => (
              <div key={resource}>
                <h4 className="font-medium text-gray-900 mb-2 capitalize">
                  {resource === "content" ? "Contenido" : resource}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {perms.map((permission) => (
                    <label
                      key={permission.id}
                      className="flex items-center space-x-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={(form.values.permissions as string[]).includes(
                          permission.id
                        )}
                        onChange={(e) =>
                          handlePermissionChange(
                            permission.id,
                            e.target.checked
                          )
                        }
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        {permission.displayName}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </FormModal>
  );
}
