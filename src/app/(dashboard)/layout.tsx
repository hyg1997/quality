"use client";
import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { hasPermission, isAdmin, PERMISSIONS } from "@/lib/permissions";
import { useIdleTimer } from "@/hooks/useIdleTimer";
import { IdleWarning } from "@/components/ui/IdleWarning";
import {
  Home,
  Users,
  Package,
  ClipboardList,
  TrendingUp,
  Settings,
  Sliders,
  LogOut,
  Menu,
  ChevronLeft,
} from "lucide-react";
interface MenuItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  adminOnly?: boolean;
}
const menuItems: MenuItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: Home,
    permission: PERMISSIONS.DASHBOARD.READ,
  },
  {
    name: "Gestión de Usuarios",
    href: "/users",
    icon: Users,
    permission: PERMISSIONS.USERS.READ,
  },
  {
    name: "Gestión de Productos",
    href: "/products",
    icon: Package,
    permission: PERMISSIONS.CONTENT.READ,
  },
  {
    name: "Gestión de Parámetros",
    href: "/parameters",
    icon: Sliders,
    permission: PERMISSIONS.CONTENT.READ,
  },
  {
    name: "Registro de Productos",
    href: "/records",
    icon: ClipboardList,
    permission: PERMISSIONS.RECORDS?.READ || PERMISSIONS.CONTENT.READ,
  },
  {
    name: "Control de Calidad",
    href: "/quality-control",
    icon: ClipboardList,
    permission: PERMISSIONS.CONTENT.CREATE,
  },
  {
    name: "Reportes",
    href: "/reports",
    icon: TrendingUp,
    permission: PERMISSIONS.ANALYTICS.READ,
  },
  {
    name: "Configuración",
    href: "/settings",
    icon: Settings,
    adminOnly: true,
  },
];
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const [warningRemainingTime, setWarningRemainingTime] = useState(0);

  const handleLogout = async () => {
    setIsSigningOut(true);
    setShowIdleWarning(false);
    try {
      await signOut({
        callbackUrl: '/auth/signin?message=session_expired',
        redirect: true
      });
    } catch (error) {
      console.error('Error during idle logout:', error);
      window.location.href = '/auth/signin?message=session_expired';
    }
  };

  // Auto logout after 1 minute of inactivity with 15-second warning
  const { resetTimer } = useIdleTimer({
    timeout: 60000, // 1 minute
    warningTime: 15000, // 15 seconds warning
    enabled: !!session && !isSigningOut,
    onWarning: (remainingTime) => {
      console.log(`Warning: ${remainingTime}ms remaining before logout`);
      setWarningRemainingTime(remainingTime);
      setShowIdleWarning(true);
    },
    onIdle: () => {
      console.log('User has been idle for 1 minute. Logging out...');
      handleLogout();
    }
  });

  const handleExtendSession = () => {
    setShowIdleWarning(false);
    resetTimer();
  };
  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    if (status === "loading" || !mounted) return;
    if (!session) {
      router.replace("/auth/signin");
    }
  }, [session, status, mounted, router]);
  if (status === "loading" || !session || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  const filteredMenuItems = menuItems.filter((item) => {
    if (item.adminOnly && !isAdmin(session)) return false;
    if (item.permission && !hasPermission(session, item.permission))
      return false;
    return true;
  });
  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut({
        callbackUrl: "/auth/signin",
        redirect: true,
      });
    } catch (error) {
      console.error("Error during sign out:", error);
      setIsSigningOut(false);
    }
  };
  return (
    <div className="min-h-screen bg-gray-50">
      {}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {}
      <div
        className={`fixed inset-y-0 left-0 z-50 bg-white shadow-lg transform transition-all duration-300 ease-in-out lg:translate-x-0 ${
          sidebarCollapsed ? "w-16" : "w-64"
        } ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex flex-col h-full">
          {}
          <div className="flex items-center justify-center h-16 px-4 bg-blue-600 relative">
            {sidebarCollapsed ? (
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <span className="text-blue-600 font-bold text-sm">CC</span>
              </div>
            ) : (
              <h1 className="text-xl font-bold text-white truncate">
                Control de Calidad
              </h1>
            )}
            {}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex absolute -right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-blue-600 border-2 border-white rounded-full items-center justify-center hover:bg-blue-700 transition-colors"
            >
              <ChevronLeft
                className={`h-3 w-3 text-white transition-transform duration-300 ${
                  sidebarCollapsed ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>
          {}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {filteredMenuItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              const handleNavigation = (e: React.MouseEvent) => {
                e.preventDefault();
                setSidebarOpen(false);
                router.push(item.href);
              };
              return (
                <button
                  key={item.href}
                  onClick={handleNavigation}
                  className={`w-full flex items-center text-sm font-medium rounded-lg transition-all duration-200 group relative ${
                    sidebarCollapsed ? "px-2 py-3 justify-center" : "px-4 py-3"
                  } ${
                    isActive
                      ? "bg-blue-100 text-blue-700 border-r-4 border-blue-700 shadow-sm"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900 hover:shadow-sm"
                  }`}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <item.icon
                    className={`h-5 w-5 flex-shrink-0 ${
                      sidebarCollapsed ? "" : "mr-3"
                    }`}
                  />
                  {!sidebarCollapsed && (
                    <>
                      <span className="truncate">{item.name}</span>
                      {isActive && (
                        <span className="ml-auto w-2 h-2 bg-blue-600 rounded-full"></span>
                      )}
                    </>
                  )}
                  {}
                  {sidebarCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                      {item.name}
                    </div>
                  )}
                </button>
              );
            })}
          </nav>
          {}
          <div className="p-4 border-t border-gray-200">
            {sidebarCollapsed ? (
              <div className="flex flex-col items-center space-y-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center group relative">
                  <span className="text-white font-medium text-sm">
                    {session.user.fullName?.charAt(0).toUpperCase()}
                  </span>
                  {}
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                    {session.user.fullName}
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="w-10 h-10 flex items-center justify-center text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed group relative"
                  title="Cerrar Sesión"
                >
                  {isSigningOut ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                  ) : (
                    <LogOut className="h-4 w-4" />
                  )}
                  {}
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                    Cerrar Sesión
                  </div>
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-sm">
                        {session.user.fullName?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {session.user.fullName}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {session.user.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="mt-3 w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSigningOut ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                      Cerrando...
                    </>
                  ) : (
                    <>
                      <LogOut className="mr-2 h-4 w-4" />
                      Cerrar Sesión
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      {}
      <div
        className={`transition-all duration-300 ${
          sidebarCollapsed ? "lg:pl-16" : "lg:pl-64"
        }`}
      >
        {}
        <header className="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <button
                type="button"
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                onClick={() => setSidebarOpen(true)}
              >
                <span className="sr-only">Abrir menú</span>
                <Menu className="h-6 w-6" />
              </button>
              <div className="ml-4 lg:ml-0">
                <h1 className="text-2xl font-semibold text-gray-900">
                  {filteredMenuItems.find(
                    (item) =>
                      pathname === item.href ||
                      (item.href !== "/dashboard" &&
                        pathname.startsWith(item.href))
                  )?.name || "Sistema"}
                </h1>
                {pathname !== "/dashboard" && (
                  <nav className="flex mt-1" aria-label="Breadcrumb">
                    <ol className="flex items-center space-x-2 text-sm text-gray-500">
                      <li>
                        <button
                          onClick={() => router.push("/dashboard")}
                          className="hover:text-gray-700 transition-colors duration-200"
                        >
                          Dashboard
                        </button>
                      </li>
                      <li>
                        <span className="mx-2">/</span>
                        <span className="text-gray-900 font-medium">
                          {filteredMenuItems.find(
                            (item) =>
                              pathname === item.href ||
                              (item.href !== "/dashboard" &&
                                pathname.startsWith(item.href))
                          )?.name || "Página"}
                        </span>
                      </li>
                    </ol>
                  </nav>
                )}
              </div>
            </div>
            {}
            <div className="hidden sm:flex sm:items-center sm:space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-xs">
                    {session.user.fullName?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-gray-900">
                    {session.user.fullName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {session.user.roles?.[0]?.displayName || "Usuario"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>
        {}
        <main className="flex-1">
          <div className="py-6">{children}</div>
        </main>
      </div>
      
      <IdleWarning
        isVisible={showIdleWarning}
        remainingTime={warningRemainingTime}
        onExtendSession={handleExtendSession}
        onLogout={handleLogout}
      />
    </div>
  );
}
