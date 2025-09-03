export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  productId?: string;
  status?: string;
}

export interface ReportSummary {
  totalRecords: number;
  recordsByStatus: Array<{
    status: string;
    _count: { id: number };
  }>;
  recordsByProduct: Array<{
    productId: string;
    _count: { id: number };
  }>;
}

export interface ReportRecord {
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

export interface ReportAnalytics {
  statusCounts: Array<{
    status: string;
    _count: { id: number };
  }>;
  dailyStats: Array<{
    date: string;
    total: number;
    approved: number;
    pending: number;
    rejected: number;
  }>;
  uniqueProducts: number;
  totalRecords: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class ReportService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = "/api/reports";
  }

  private async fetchApi<T>(url: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(url);
      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getSummary(filters: ReportFilters = {}) {
    const params = new URLSearchParams({
      type: "summary",
      ...Object.fromEntries(
        Object.entries(filters).filter(
          ([, value]) => value !== undefined && value !== ""
        )
      ),
    });

    return this.fetchApi<ReportSummary>(`${this.baseUrl}?${params.toString()}`);
  }

  async getDetailedReport(filters: ReportFilters = {}) {
    const params = new URLSearchParams({
      type: "detailed",
      ...Object.fromEntries(
        Object.entries(filters).filter(
          ([, value]) => value !== undefined && value !== ""
        )
      ),
    });

    return this.fetchApi<{ records: ReportRecord[]; total: number }>(
      `${this.baseUrl}?${params.toString()}`
    );
  }

  async getAnalytics(filters: ReportFilters = {}) {
    const params = new URLSearchParams({
      type: "analytics",
      ...Object.fromEntries(
        Object.entries(filters).filter(
          ([, value]) => value !== undefined && value !== ""
        )
      ),
    });

    return this.fetchApi<ReportAnalytics>(
      `${this.baseUrl}?${params.toString()}`
    );
  }

  async exportToCSV(filters: ReportFilters = {}) {
    const response = await this.getDetailedReport(filters);

    if (!response.success || !response.data) {
      throw new Error("No se pudieron obtener los datos para exportar");
    }

    const headers = [
      "Producto",
      "Código",
      "Lote Interno",
      "Lote Proveedor",
      "Cantidad",
      "Fecha Registro",
      "Estado",
      "Parámetros",
      "Controles",
    ];

    const csvContent = [
      headers.join(","),
      ...response.data.records.map((row: ReportRecord) =>
        [
          `"${row.productName}"`,
          `"${row.productCode}"`,
          `"${row.internalLot}"`,
          `"${row.supplierLot || "N/A"}"`,
          row.quantity,
          new Date(row.registrationDate).toLocaleDateString(),
          row.status,
          row.parametersCount,
          row.controlsCount,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `reporte_productos_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { success: true, message: "Archivo exportado exitosamente" };
  }
}

export const reportService = new ReportService();
