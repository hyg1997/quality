import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Card, CardContent } from '@/components/ui'
import { Users, Check, Package, Clock } from 'lucide-react'

interface StatsData {
  totalUsers: number
  activeUsers: number
  totalProducts: number
  pendingReports: number
}

async function getStats(): Promise<StatsData> {
  const [totalUsers, activeUsers, totalProducts] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: 'ACTIVE' } }),
    prisma.user.count(),
    
  ])

  return {
    totalUsers,
    activeUsers,
    totalProducts,
    pendingReports: 23
  }
}

export default async function DashboardStats() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return null
  }

  const stats = await getStats()

  const statsCards = [
    {
      title: 'Usuarios Totales',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      title: 'Usuarios Activos',
      value: stats.activeUsers,
      icon: Check,
      color: 'bg-green-500'
    },
    {
      title: 'Productos Registrados',
      value: stats.totalProducts,
      icon: Package,
      color: 'bg-purple-500'
    },
    {
      title: 'Reportes Pendientes',
      value: stats.pendingReports,
      icon: Clock,
      color: 'bg-orange-500'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsCards.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}