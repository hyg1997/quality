import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import type { Session } from "next-auth";
import Link from "next/link";
import { Card, CardContent, CardHeader, Button, Badge } from "@/components/ui";
import DashboardStats from "@/components/server/DashboardStats";
import UserInfo from "@/components/server/UserInfo";

function ModuleCard({
  title,
  description,
  permissions,
  buttonColor,
  session,
  href,
}: {
  title: string;
  description: string;
  permissions: Array<{ permission: string; label: string; color: string }>;
  buttonColor: string;
  session: Session;
  href: string;
}) {
  const hasAccess = permissions.some((p) =>
    hasPermission(session, p.permission)
  );

  if (!hasAccess) {
    return null;
  }

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-2 mb-4">
          {permissions.map(
            ({ permission, label, color }) =>
              hasPermission(session, permission) && (
                <Badge key={permission} className={color}>
                  {label}
                </Badge>
              )
          )}
        </div>

        <Link href={href}>
          <Button className={`w-full ${buttonColor}`}>Acceder</Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export default async function Dashboard() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Acceso Denegado
          </h1>
          <p className="text-gray-600">
            Debes iniciar sesión para acceder al dashboard.
          </p>
        </div>
      </div>
    );
  }

  const modules = [
    {
      id: "records",
      title: "Registro de Productos",
      description: "Gestionar el registro de productos y controles de calidad",
      href: "/records",
      checkPermission: PERMISSIONS.CONTENT?.READ,
      permissions: [
        {
          permission: PERMISSIONS.CONTENT?.CREATE,
          label: "Crear",
          color: "bg-green-100 text-green-800",
        },
        {
          permission: PERMISSIONS.CONTENT?.UPDATE,
          label: "Editar",
          color: "bg-yellow-100 text-yellow-800",
        },
        {
          permission: PERMISSIONS.CONTENT?.PUBLISH,
          label: "Aprobar",
          color: "bg-purple-100 text-purple-800",
        },
      ],
      buttonColor: "bg-blue-600 hover:bg-blue-700",
    },
    {
      id: "users",
      title: "Gestión de Usuarios",
      description: "Administrar usuarios y permisos del sistema",
      href: "/users",
      checkPermission: PERMISSIONS.USERS?.READ,
      permissions: [
        {
          permission: PERMISSIONS.USERS?.CREATE,
          label: "Crear",
          color: "bg-green-100 text-green-800",
        },
        {
          permission: PERMISSIONS.USERS?.UPDATE,
          label: "Editar",
          color: "bg-yellow-100 text-yellow-800",
        },
        {
          permission: PERMISSIONS.USERS?.DELETE,
          label: "Eliminar",
          color: "bg-red-100 text-red-800",
        },
      ],
      buttonColor: "bg-green-600 hover:bg-green-700",
    },
    {
      id: "products",
      title: "Gestión de Productos",
      description: "Administrar catálogo de productos y parámetros",
      href: "/products",
      checkPermission: PERMISSIONS.CONTENT?.READ,
      permissions: [
        {
          permission: PERMISSIONS.CONTENT?.CREATE,
          label: "Crear",
          color: "bg-green-100 text-green-800",
        },
        {
          permission: PERMISSIONS.CONTENT?.UPDATE,
          label: "Editar",
          color: "bg-yellow-100 text-yellow-800",
        },
      ],
      buttonColor: "bg-indigo-600 hover:bg-indigo-700",
    },
    {
      id: "reports",
      title: "Reportes",
      description: "Ver reportes y estadísticas del sistema",
      href: "/reports",
      checkPermission: PERMISSIONS.ANALYTICS?.READ,
      permissions: [
        {
          permission: PERMISSIONS.ANALYTICS?.READ,
          label: "Ver",
          color: "bg-blue-100 text-blue-800",
        },
        {
          permission: PERMISSIONS.REPORTS?.EXPORT,
          label: "Exportar",
          color: "bg-green-100 text-green-800",
        },
      ],
      buttonColor: "bg-purple-600 hover:bg-purple-700",
    },
  ];

  return (
    <div className="space-y-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Dashboard Principal
        </h1>
        <p className="text-gray-600">
          Bienvenido al sistema de control de calidad
        </p>
      </div>

      <DashboardStats />

      <UserInfo />

      {/* Módulos del sistema basados en permisos */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Módulos del Sistema
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map(
            (module) =>
              hasPermission(session, module.checkPermission) && (
                <ModuleCard
                  key={module.id}
                  title={module.title}
                  description={module.description}
                  permissions={module.permissions}
                  buttonColor={module.buttonColor}
                  session={session}
                  href={module.href}
                />
              )
          )}

          {/* Configuración del Sistema - Solo para administradores */}
          {hasPermission(session, PERMISSIONS.SYSTEM?.SETTINGS) && (
            <ModuleCard
              title="Configuración del Sistema"
              description="Configuración avanzada y administración del sistema"
              permissions={[
                {
                  permission: PERMISSIONS.SYSTEM?.SETTINGS,
                  label: "Administrador",
                  color: "bg-red-100 text-red-800",
                },
              ]}
              buttonColor="bg-red-600 hover:bg-red-700"
              session={session}
              href="/admin"
            />
          )}
        </div>
      </div>

      {/* Mensaje si no tiene permisos */}
      {!session.user.permissions?.length && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Sin permisos asignados
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                Contacta al administrador para que te asigne los permisos
                necesarios.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
