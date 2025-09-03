import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Card, CardContent, CardHeader, Badge } from "@/components/ui";
export default async function UserInfo() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return null;
  }
  const { user } = session;
  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-gray-900">
          Información del Usuario
        </h3>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-lg">
                {user.fullName?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-medium text-gray-900">{user.fullName}</p>
              <p className="text-sm text-gray-600">{user.email}</p>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Roles Asignados
            </p>
            <div className="flex flex-wrap gap-2">
              {user.roles?.map((role) => (
                <Badge key={role.id} variant="info">
                  {role.displayName}
                </Badge>
              )) || <Badge variant="default">Sin roles asignados</Badge>}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Permisos Activos
            </p>
            <p className="text-sm text-gray-600">
              {user.permissions?.length || 0} permisos asignados
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
