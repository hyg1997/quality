"use client"

import { useSession } from "next-auth/react"
import Link from "next/link"
import { hasPermission, isAdmin, PERMISSIONS } from "@/lib/permissions"
import { Lock, Users, Settings, ClipboardList, HardDrive } from "lucide-react"

interface SettingCard {
  title: string
  description: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  permission?: string
  adminOnly?: boolean
  color: string
}

export default function SettingsPage() {
  const { data: session, status } = useSession()

  if (status === "loading" || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  const settingsCards: SettingCard[] = [
    {
      title: "Autenticación de Dos Factores",
      description: "Configura la autenticación de dos factores para mayor seguridad",
      href: "/settings/2fa",
      icon: Lock,
      color: "bg-blue-500"
    },
    {
      title: "Gestión de Usuarios",
      description: "Administra usuarios, roles y permisos del sistema",
      href: "/users",
      icon: Users,
      permission: PERMISSIONS.USERS.READ,
      color: "bg-green-500"
    },
    {
      title: "Gestión de Roles",
      description: "Administra roles y permisos del sistema",
      href: "/settings/roles",
      icon: Settings,
      adminOnly: true,
      color: "bg-indigo-500"
    },
    {
      title: "Configuración del Sistema",
      description: "Configuraciones avanzadas y parámetros del sistema",
      href: "/settings/system",
      icon: Settings,
      adminOnly: true,
      color: "bg-red-500"
    },
    {
      title: "Logs de Auditoría",
      description: "Revisa los registros de actividad del sistema",
      href: "/settings/audit",
      icon: ClipboardList,
      permission: PERMISSIONS.SYSTEM.AUDIT,
      color: "bg-purple-500"
    },
    {
      title: "Respaldo de Datos",
      description: "Gestiona copias de seguridad y restauración",
      href: "/settings/backup",
      icon: HardDrive,
      permission: PERMISSIONS.SYSTEM.BACKUP,
      color: "bg-orange-500"
    }
  ]

  const filteredSettings = settingsCards.filter(setting => {
    if (setting.adminOnly && !isAdmin(session)) return false
    if (setting.permission && !hasPermission(session, setting.permission)) return false
    return true
  })

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="mt-1 text-sm text-gray-600">
          Administra la configuración de tu cuenta y del sistema
        </p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSettings.map((setting) => (
          <Link
            key={setting.href}
            href={setting.href}
            className="group block"
          >
            <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6 hover:shadow-md transition-all duration-200 hover:scale-105">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 ${setting.color} rounded-lg flex items-center justify-center text-white`}>
                  <setting.icon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                    {setting.title}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {setting.description}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <svg 
                    className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors duration-200" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M9 5l7 7-7 7" 
                    />
                  </svg>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* User Info Card */}
      <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Información de la Cuenta</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre Completo</label>
            <p className="mt-1 text-sm text-gray-900">{session.user.fullName}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <p className="mt-1 text-sm text-gray-900">{session.user.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Usuario</label>
            <p className="mt-1 text-sm text-gray-900">{session.user.username || 'No configurado'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Roles</label>
            <div className="mt-1 flex flex-wrap gap-1">
              {session.user.roles?.map((role) => (
                <span
                  key={role.id}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {role.displayName}
                </span>
              )) || (
                <span className="text-sm text-gray-500">Sin roles asignados</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      {!isAdmin(session) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Recomendación de Seguridad
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                Te recomendamos habilitar la autenticación de dos factores para mayor seguridad de tu cuenta.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}