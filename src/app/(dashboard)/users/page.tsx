"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Edit, Trash2, Shield, ShieldOff } from "lucide-react";
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
import { useDataTableSearch } from "@/hooks/useDataTableSearch";
import {
  userService,
  roleService,
  type User,
  type UserRole,
} from "@/services/api";

interface UserFormData extends Record<string, unknown> {
  email: string;
  username: string;
  fullName: string;
  password: string;
  roleIds: string[];
}

export default function UsersManagement() {
  const { data: session, status } = useSession();
  const { hasPermission, isAdmin } = usePermissions();
  const { success, error } = useNotifications();

  const [roles, setRoles] = useState<UserRole[]>([]);

  const createModal = useModal<User>();
  const editModal = useModal<User>();
  const confirmModal = useConfirmModal();

  const {
    data: users,
    loading,
    searchProps,
    refetch: refetchUsers,
  } = useDataTableSearch<User>({
    fetchData: async (searchTerm?: string) => {
      const url = new URL("/api/users", window.location.origin);
      if (searchTerm) {
        url.searchParams.set("search", searchTerm);
      }

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error("Error fetching users");
      }

      return response.json();
    },
    placeholder: "Buscar usuarios por nombre, email o username...",
  });

  const fetchRoles = useCallback(async () => {
    const response = await roleService.getRoles();
    if (response.success && response.data) {
      const userRoles = response.data.map((role) => ({
        id: role.id,
        name: role.name,
        displayName: role.displayName,
        level: role.level,
      }));
      setRoles(userRoles);
    }
  }, []);

  const columns: ColumnDef<User>[] = useMemo(
    () => [
      {
        key: "fullName",
        header: "Usuario",
        cell: (user) => (
          <div>
            <div className="font-medium text-gray-900">{user.fullName}</div>
            <div className="text-sm text-gray-500">{user.email}</div>
            {user.username && (
              <div className="text-xs text-gray-400">@{user.username}</div>
            )}
          </div>
        ),
      },
      {
        key: "roles",
        header: "Roles",
        cell: (user) => (
          <div className="flex flex-wrap gap-1">
            {user.roles.slice(0, 2).map((role) => (
              <Badge
                key={role.id}
                variant={role.level >= 80 ? "danger" : "default"}
                size="sm"
              >
                {role.displayName}
              </Badge>
            ))}
            {user.roles.length > 2 && (
              <Badge variant="default" size="sm">
                +{user.roles.length - 2} más
              </Badge>
            )}
          </div>
        ),
      },
      {
        key: "status",
        header: "Estado",
        cell: (user) => (
          <Badge variant={userService.getUserStatusVariant(user)}>
            {user.status}
          </Badge>
        ),
      },
      {
        key: "twoFactorEnabled",
        header: "2FA",
        cell: (user) =>
          user.twoFactorEnabled ? (
            <Badge variant="success" size="sm">
              <Shield className="h-3 w-3 mr-1" />
              Activo
            </Badge>
          ) : (
            <span className="text-gray-400 text-sm">Inactivo</span>
          ),
      },
      {
        key: "lastLoginAt",
        header: "Último Acceso",
        cell: (user) => (
          <div className="text-sm text-gray-600">
            {user.lastLoginAt
              ? new Date(user.lastLoginAt).toLocaleDateString("es-ES")
              : "Nunca"}
          </div>
        ),
      },
    ],
    []
  );

  useEffect(() => {
    if (session && hasPermission("users:read")) {
      fetchRoles();
    }
  }, [session, hasPermission, fetchRoles]);

  const handleDeleteUser = useCallback(
    async (user: User) => {
      if (!userService.canDeleteUser(user)) {
        confirmModal.confirm({
          title: "No se puede eliminar",
          message: "No se puede eliminar un usuario administrador.",
          type: "warning",
          confirmText: "Entendido",
          onConfirm: () => {},
        });
        return;
      }

      confirmModal.confirm({
        title: "Eliminar Usuario",
        message: `¿Estás seguro de que quieres eliminar a "${userService.formatUserDisplayName(
          user
        )}"?`,
        type: "danger",
        confirmText: "Eliminar",
        onConfirm: async () => {
          try {
            const response = await userService.deleteUser(user.id);
            if (response.success) {
              await refetchUsers();
              success(
                "Usuario eliminado",
                `El usuario ${userService.formatUserDisplayName(
                  user
                )} ha sido eliminado exitosamente`
              );
            } else {
              error(
                "Error al eliminar usuario",
                response.error || "No se pudo eliminar el usuario"
              );
            }
          } catch {
            error(
              "Error al eliminar usuario",
              "Ha ocurrido un error inesperado"
            );
          }
        },
      });
    },
    [confirmModal, refetchUsers, success, error]
  );

  const handleDisable2FA = useCallback(
    async (user: User) => {
      confirmModal.confirm({
        title: "Deshabilitar 2FA",
        message: `¿Estás seguro de que quieres deshabilitar la autenticación de dos factores para "${userService.formatUserDisplayName(
          user
        )}"?`,
        type: "warning",
        confirmText: "Deshabilitar",
        onConfirm: async () => {
          try {
            const response = await userService.disable2FA(user.id);
            if (response.success) {
              await refetchUsers();
              success(
                "2FA deshabilitado",
                `La autenticación de dos factores ha sido deshabilitada para ${userService.formatUserDisplayName(
                  user
                )}`
              );
            } else {
              error(
                "Error al deshabilitar 2FA",
                response.error ||
                  "No se pudo deshabilitar la autenticación de dos factores"
              );
            }
          } catch {
            error(
              "Error al deshabilitar 2FA",
              "Ha ocurrido un error inesperado"
            );
          }
        },
      });
    },
    [confirmModal, refetchUsers, success, error]
  );

  const handleCreateUser = async (formData: UserFormData) => {
    try {
      const response = await userService.createUser({
        email: formData.email,
        username: formData.username || undefined,
        fullName: formData.fullName,
        password: formData.password,
        roleIds: formData.roleIds,
      });

      if (response.success) {
        createModal.close();
        await refetchUsers();
        success(
          "Usuario creado",
          `El usuario ${formData.fullName} ha sido creado exitosamente`
        );
      } else {
        error(
          "Error al crear usuario",
          response.error || "No se pudo crear el usuario"
        );
      }
    } catch {
      error("Error al crear usuario", "Ha ocurrido un error inesperado");
    }
  };

  const handleUpdateUser = async (userId: string, formData: UserFormData) => {
    try {
      const response = await userService.updateUser(userId, {
        email: formData.email,
        username: formData.username || undefined,
        fullName: formData.fullName,
        password: formData.password || undefined,
        roleIds: formData.roleIds,
      });

      if (response.success) {
        editModal.close();
        await refetchUsers();
        success(
          "Usuario actualizado",
          `El usuario ${formData.fullName} ha sido actualizado exitosamente`
        );
      } else {
        error(
          "Error al actualizar usuario",
          response.error || "No se pudo actualizar el usuario"
        );
      }
    } catch {
      error("Error al actualizar usuario", "Ha ocurrido un error inesperado");
    }
  };

  const actions: ActionDef<User>[] = useMemo(
    () => [
      {
        label: "Editar",
        onClick: (user) => editModal.open(user),
        icon: <Edit className="h-4 w-4" />,
        variant: "secondary",
        disabled: (user) => !userService.canEditUser(user),
        hidden: () => !hasPermission("users:update"),
      },
      {
        label: "Deshabilitar 2FA",
        onClick: handleDisable2FA,
        icon: <ShieldOff className="h-4 w-4" />,
        variant: "secondary",
        hidden: (user) =>
          !isAdmin() ||
          !userService.has2FAEnabled(user) ||
          !userService.canEditUser(user),
      },
      {
        label: "Eliminar",
        onClick: handleDeleteUser,
        icon: <Trash2 className="h-4 w-4" />,
        variant: "danger",
        disabled: (user) => !userService.canDeleteUser(user),
        hidden: () => !hasPermission("users:delete"),
      },
    ],
    [editModal, handleDisable2FA, handleDeleteUser, hasPermission, isAdmin]
  );

  if (status === "loading") {
    return (
      <PageLayout title="Administra usuarios del sistema">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </PageLayout>
    );
  }

  if (!session || !hasPermission("users:read")) {
    return (
      <PageLayout title="Acceso Denegado">
        <div className="text-center py-12">
          <Shield className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Acceso Restringido
          </h3>
          <p className="text-gray-600">
            No tienes permisos para ver la gestión de usuarios.
          </p>
        </div>
      </PageLayout>
    );
  }

  return (
    <>
      <PageLayout
        title="Administra usuarios del sistema"
        actions={
          hasPermission("users:create") ? (
            <button
              onClick={() => createModal.open()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear Usuario
            </button>
          ) : undefined
        }
      >
        <DataTable
          data={users}
          columns={columns}
          actions={actions}
          loading={loading}
          emptyMessage="No hay usuarios registrados"
          search={searchProps}
        />
      </PageLayout>

      {/* Modal de Crear Usuario */}
      <UserFormModal
        isOpen={createModal.isOpen}
        onClose={createModal.close}
        onSubmit={handleCreateUser}
        roles={roles}
        title="Crear Nuevo Usuario"
      />

      {/* Modal de Editar Usuario */}
      <UserFormModal
        isOpen={editModal.isOpen}
        onClose={editModal.close}
        onSubmit={(data) =>
          editModal.data && handleUpdateUser(editModal.data.id, data)
        }
        roles={roles}
        user={editModal.data}
        title="Editar Usuario"
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

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UserFormData) => void;
  roles: UserRole[];
  user?: User;
  title: string;
}

function UserFormModal({
  isOpen,
  onClose,
  onSubmit,
  roles,
  user,
  title,
}: UserFormModalProps) {
  const form = useForm<UserFormData>({
    initialValues: {
      email: user?.email || "",
      username: user?.username || "",
      fullName: user?.fullName || "",
      password: "",
      roleIds: user?.roles.map((r) => r.id) || [],
    },
    validationRules: {
      email: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      },
      fullName: { required: true, minLength: 2 },
      password: user ? {} : { required: true, minLength: 8 },
    },
    onSubmit: async (data) => {
      await onSubmit(data);
    },
  });

  const toggleRole = (roleId: string) => {
    const currentRoles = form.values.roleIds;
    const newRoles = currentRoles.includes(roleId)
      ? currentRoles.filter((id) => id !== roleId)
      : [...currentRoles, roleId];

    form.setValue("roleIds", newRoles);
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              name={form.getFieldProps("email").name}
              value={String(form.getFieldProps("email").value)}
              onChange={form.getFieldProps("email").onChange}
              onBlur={form.getFieldProps("email").onBlur}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {form.errors.email && (
              <p className="text-red-500 text-sm mt-1">{form.errors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Usuario (opcional)
            </label>
            <input
              type="text"
              name={form.getFieldProps("username").name}
              value={String(form.getFieldProps("username").value)}
              onChange={form.getFieldProps("username").onChange}
              onBlur={form.getFieldProps("username").onBlur}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre Completo *
          </label>
          <input
            type="text"
            name={form.getFieldProps("fullName").name}
            value={String(form.getFieldProps("fullName").value)}
            onChange={form.getFieldProps("fullName").onChange}
            onBlur={form.getFieldProps("fullName").onBlur}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {form.errors.fullName && (
            <p className="text-red-500 text-sm mt-1">{form.errors.fullName}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contraseña {!user && "*"}
          </label>
          <input
            type="password"
            name={form.getFieldProps("password").name}
            value={String(form.getFieldProps("password").value)}
            onChange={form.getFieldProps("password").onChange}
            onBlur={form.getFieldProps("password").onBlur}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={user ? "Dejar vacío para mantener la actual" : ""}
          />
          {form.errors.password && (
            <p className="text-red-500 text-sm mt-1">{form.errors.password}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Roles
          </label>
          <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3">
            {roles.map((role) => (
              <label key={role.id} className="flex items-center space-x-2 py-1">
                <input
                  type="checkbox"
                  checked={form.values.roleIds.includes(role.id)}
                  onChange={() => toggleRole(role.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-500">
                  {role.displayName}
                </span>
                <Badge
                  variant={role.level >= 80 ? "danger" : "default"}
                  size="sm"
                >
                  Nivel {role.level}
                </Badge>
              </label>
            ))}
          </div>
        </div>
      </div>
    </FormModal>
  );
}
