import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui";
import { Users, Package, ClipboardList, CheckCircle } from "lucide-react";

interface StatsData {
  totalUsers: number;
  activeUsers: number;
  totalProducts: number;
  totalRecords: number;
  totalControls: number;
  recentActivity: number;
}

async function getStats(): Promise<StatsData> {
  try {
    const [
      totalUsers,
      activeUsers,
      totalProducts,
      totalRecords,
      totalControls,
      recentActivity,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: "ACTIVE" } }),
      prisma.product.count({ where: { active: true } }),
      prisma.record.count(),
      prisma.control.count(),
      prisma.record.count({
        where: {
          registrationDate: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return {
      totalUsers,
      activeUsers,
      totalProducts,
      totalRecords,
      totalControls,
      recentActivity,
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return {
      totalUsers: 0,
      activeUsers: 0,
      totalProducts: 0,
      totalRecords: 0,
      totalControls: 0,
      recentActivity: 0,
    };
  }
}
export default async function DashboardStats() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return null;
  }
  const stats = await getStats();
  const statsCards = [
    {
      title: "Usuarios Activos",
      value: stats.activeUsers,
      subtitle: `${stats.totalUsers} total`,
      icon: Users,
      color: "bg-blue-500",
    },
    {
      title: "Productos Activos",
      value: stats.totalProducts,
      subtitle: "En el sistema",
      icon: Package,
      color: "bg-purple-500",
    },
    {
      title: "Registros Totales",
      value: stats.totalRecords,
      subtitle: `${stats.recentActivity} esta semana`,
      icon: ClipboardList,
      color: "bg-indigo-500",
    },
    {
      title: "Controles de Calidad",
      value: stats.totalControls,
      subtitle: "Realizados",
      icon: CheckCircle,
      color: "bg-green-500",
    },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsCards.map((stat, index) => (
        <Card
          key={index}
          className="hover:shadow-lg transition-shadow duration-200"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-gray-900 mb-1">
                  {stat.value.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">{stat.subtitle}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.color} flex-shrink-0`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
