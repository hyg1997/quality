import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import DashboardStats from "@/components/server/DashboardStats";
import UserInfo from "@/components/server/UserInfo";
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
  return (
    <div className="space-y-8 px-4 sm:px-6 lg:px-8">
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
