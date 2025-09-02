"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { hasPermission, isAdmin, PERMISSIONS } from "@/lib/permissions";
import {
  Home,
  Users,
  Package,
  ClipboardList,
  TrendingUp,
  Settings,
  Sliders,
  LogOut,
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
  const [mounted, setMounted] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "loading" || !mounted) return;
    if (!session) {
      router.replace("/auth/signin");
    }
  }, [session, status, mounted, router]);

  // Show loading while checking authentication
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
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-4 bg-blue-600">
            <h1 className="text-xl font-bold text-white truncate">
              Control de Calidad
            </h1>
          </div>

          {/* Navigation */}
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
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? "bg-blue-100 text-blue-700 border-r-4 border-blue-700 shadow-sm"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900 hover:shadow-sm"
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  <span className="truncate">{item.name}</span>
                  {isActive && (
                    <span className="ml-auto w-2 h-2 bg-blue-600 rounded-full"></span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User info */}
          <div className="p-4 border-t border-gray-200">
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
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <button
                type="button"
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                onClick={() => setSidebarOpen(true)}
              >
                <span className="sr-only">Abrir menú</span>
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
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

            {/* User menu - desktop */}
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

        {/* Page content */}
        <main className="flex-1">
          <div className="py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
