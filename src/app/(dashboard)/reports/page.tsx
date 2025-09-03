"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { FileText, Download, Filter, Package, BarChart3 } from "lucide-react";
import {
  DataTable,
  Badge,
  type ColumnDef,
  type ActionDef,
} from "@/components/ui";
import { PageLayout } from "@/components/layouts/AppLayout";
import { usePermissions } from "@/hooks/usePermissions";
import { useNotifications } from "@/hooks/useNotifications";
import { useDataTableSearch } from "@/hooks/useDataTableSearch";
import { productService, type Product } from "@/services/api/products";
import {
  reportService,
  type ReportRecord,
  type ReportFilters as ReportFiltersType,
} from "@/services/api/reports";

interface ReportFilters {
  startDate: string;
  endDate: string;
  productId: string;
  status: string;
}

interface ReportData extends Record<string, unknown> {
  id: string;
  productName: string;
  productCode: string;
  internalLot: string;
  supplierLot?: string;
  quantity: number;
  registrationDate: string;
  status: "pending" | "approved" | "rejected";
  parametersCount: number;
  controlsCount: number;
}

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const { hasPermission } = usePermissions();
  const { success, error } = useNotifications();
  const [products, setProducts] = useState<Product[]>([]);
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    productId: "",
    status: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState({
    totalRecords: 0,
    approvedRecords: 0,
    pendingRecords: 0,
    rejectedRecords: 0,
    totalProducts: 0,
  });

  const {
    data: reportData,
    loading,
    searchProps,
    refetch: refetchReports,
  } = useDataTableSearch<ReportData>({
    fetchData: async (searchTerm?: string) => {
      const reportFilters: ReportFiltersType = {
        startDate: filters.startDate,
        endDate: filters.endDate,
        productId: filters.productId || undefined,
        status: filters.status || undefined,
      };

      const response = await reportService.getDetailedReport(reportFilters);

      if (!response.success || !response.data) {
        throw new Error("Error fetching report data");
      }

      const transformedData: ReportData[] = response.data.records
        .filter((record: ReportRecord) => {
          if (!searchTerm) return true;
          const searchLower = searchTerm.toLowerCase();
          return (
            record.productName.toLowerCase().includes(searchLower) ||
            record.productCode.toLowerCase().includes(searchLower) ||
            record.internalLot.toLowerCase().includes(searchLower) ||
            (record.supplierLot &&
              record.supplierLot.toLowerCase().includes(searchLower))
          );
        })
        .map((record: ReportRecord) => ({
          id: record.id,
          productName: record.productName,
          productCode: record.productCode,
          internalLot: record.internalLot,
          supplierLot: record.supplierLot,
          quantity: record.quantity,
          registrationDate: record.registrationDate,
          status: record.status,
          parametersCount: record.parametersCount,
          controlsCount: record.controlsCount,
        }));

      updateStats(response.data.records);
      return transformedData;
    },
    placeholder: "Buscar por lote, producto o código...",
  });

  const updateStats = (records: ReportRecord[]) => {
    const totalRecords = records.length;
    const approvedRecords = records.filter(
      (r) => r.status === "approved"
    ).length;
    const pendingRecords = records.filter((r) => r.status === "pending").length;
    const rejectedRecords = records.filter(
      (r) => r.status === "rejected"
    ).length;
    const uniqueProducts = new Set(records.map((r) => r.productName)).size;

    setStats({
      totalRecords,
      approvedRecords,
      pendingRecords,
      rejectedRecords,
      totalProducts: uniqueProducts,
    });
  };

  const loadProducts = useCallback(async () => {
    try {
      const response = await productService.getProducts({ limit: 100 });
      if (response.success && response.data) {
        setProducts(response.data.products);
      }
    } catch (err) {
      console.error("Error loading products:", err);
    }
  }, []);

  useEffect(() => {
    if (session && hasPermission("content:read")) {
      loadProducts();
    }
  }, [session, hasPermission, loadProducts]);

  useEffect(() => {
    refetchReports();
  }, [filters, refetchReports]);

  const handleFilterChange = (key: keyof ReportFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      endDate: new Date().toISOString().split("T")[0],
      productId: "",
      status: "",
    });
  };

  const exportToCSV = async () => {
    if (!reportData || reportData.length === 0) {
      error("No hay datos", "No hay datos para exportar");
      return;
    }

    try {
      const reportFilters: ReportFiltersType = {
        startDate: filters.startDate,
        endDate: filters.endDate,
        productId: filters.productId || undefined,
        status: filters.status || undefined,
      };

      await reportService.exportToCSV(reportFilters);
      success(
        "Exportación exitosa",
        "El reporte se ha descargado correctamente"
      );
    } catch (err) {
      console.error("Error exporting CSV:", err);
      error("Error en exportación", "No se pudo exportar el reporte");
    }
  };

  const columns: ColumnDef<ReportData>[] = useMemo(
    () => [
      {
        key: "productName",
        header: "Producto",
        cell: (data) => (
          <div>
            <div className="font-medium text-gray-900">{data.productName}</div>
            <div className="text-sm text-gray-500">{data.productCode}</div>
          </div>
        ),
      },
      {
        key: "internalLot",
        header: "Lote Interno",
        cell: (data) => (
          <div className="font-mono text-sm">{data.internalLot}</div>
        ),
      },
      {
        key: "supplierLot",
        header: "Lote Proveedor",
        cell: (data) => (
          <div className="text-sm text-gray-600">
            {data.supplierLot || "N/A"}
          </div>
        ),
      },
      {
        key: "quantity",
        header: "Cantidad",
        cell: (data) => (
          <div className="text-right font-medium">{data.quantity}</div>
        ),
      },
      {
        key: "registrationDate",
        header: "Fecha Registro",
        cell: (data) => (
          <div className="text-sm">
            {new Date(data.registrationDate).toLocaleDateString()}
          </div>
        ),
      },
      {
        key: "status",
        header: "Estado",
        cell: (data) => {
          const statusConfig = {
            pending: { label: "Pendiente", variant: "warning" as const },
            approved: { label: "Aprobado", variant: "success" as const },
            rejected: { label: "Rechazado", variant: "danger" as const },
          };
          const config = statusConfig[data.status];
          return <Badge variant={config.variant}>{config.label}</Badge>;
        },
      },
      {
        key: "parametersCount",
        header: "Parámetros",
        cell: (data) => (
          <div className="text-center">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {data.parametersCount}
            </span>
          </div>
        ),
      },
      {
        key: "controlsCount",
        header: "Controles",
        cell: (data) => (
          <div className="text-center">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {data.controlsCount}
            </span>
          </div>
        ),
      },
    ],
    []
  );

  const actions: ActionDef<ReportData>[] = useMemo(
    () => [
      {
        label: "Ver Detalles",
        onClick: (data) => {
          window.open(
            `/records?search=${data.internalLot}`,
            "_blank"
          );
        },
        icon: <FileText className="h-4 w-4" />,
        variant: "secondary",
      },
    ],
    []
  );

  if (status === "loading") {
    return (
      <PageLayout title="Cargando...">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </PageLayout>
    );
  }

  if (!session || !hasPermission("content:read")) {
    return (
      <PageLayout title="Acceso Denegado">
        <div className="text-center py-12">
          <BarChart3 className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Acceso Restringido
          </h3>
          <p className="text-gray-600">
            No tienes permisos para ver los reportes.
          </p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Reportes de Productos">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Package className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Registros
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.totalRecords}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-6 w-6 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">✓</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Aprobados
                    </dt>
                    <dd className="text-lg font-medium text-green-600">
                      {stats.approvedRecords}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-6 w-6 bg-yellow-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">⏳</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Pendientes
                    </dt>
                    <dd className="text-lg font-medium text-yellow-600">
                      {stats.pendingRecords}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-6 w-6 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">✗</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Rechazados
                    </dt>
                    <dd className="text-lg font-medium text-red-600">
                      {stats.rejectedRecords}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Package className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Productos
                    </dt>
                    <dd className="text-lg font-medium text-blue-600">
                      {stats.totalProducts}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Filtros de Reporte
              </h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {showFilters ? "Ocultar" : "Mostrar"} Filtros
                </button>
                <button
                  onClick={exportToCSV}
                  disabled={!reportData || reportData.length === 0}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha Inicio
                  </label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) =>
                      handleFilterChange("startDate", e.target.value)
                    }
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha Fin
                  </label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) =>
                      handleFilterChange("endDate", e.target.value)
                    }
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Producto
                  </label>
                  <select
                    value={filters.productId}
                    onChange={(e) =>
                      handleFilterChange("productId", e.target.value)
                    }
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="">Todos los productos</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) =>
                      handleFilterChange("status", e.target.value)
                    }
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="">Todos los estados</option>
                    <option value="pending">Pendiente</option>
                    <option value="approved">Aprobado</option>
                    <option value="rejected">Rechazado</option>
                  </select>
                </div>
                <div className="md:col-span-4 flex justify-end">
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Limpiar Filtros
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <DataTable
          data={reportData}
          columns={columns}
          actions={actions}
          loading={loading}
          emptyMessage="No hay datos de reporte disponibles"
          search={searchProps}
        />
      </div>
    </PageLayout>
  );
}
