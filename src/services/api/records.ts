import { apiClient, type ApiResponse } from "./base";

// Types for Record API
export interface ProductRecord extends Record<string, unknown> {
  id: string;
  productId: string;
  internalLot: string;
  supplierLot?: string;
  quantity: number;
  registrationDate: string;
  expirationDate?: string;
  observations?: string;
  status: "pending" | "approved" | "rejected";
  userId: string;
  approvedBy?: string;
  approvalDate?: string;
  createdAt: string;
  updatedAt: string;
  product?: {
    id: string;
    name: string;
    code?: string;
  };
  user?: {
    id: string;
    fullName: string;
    email: string;
  };
  approver?: {
    id: string;
    fullName: string;
    email: string;
  };
}

export interface CreateRecordData {
  productId: string;
  internalLot: string;
  supplierLot?: string;
  quantity: number;
  registrationDate?: string;
  expirationDate?: string;
  observations?: string;
  status?: "pending" | "approved" | "rejected";
}

export interface UpdateRecordData {
  productId?: string;
  internalLot?: string;
  supplierLot?: string;
  quantity?: number;
  registrationDate?: string;
  expirationDate?: string;
  observations?: string;
  status?: "pending" | "approved" | "rejected";
}

export interface RecordsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  productId?: string;
  status?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

export class RecordService {
  /**
   * Get all records with pagination and filters
   */
  async getRecords(params?: RecordsQueryParams): Promise<
    ApiResponse<{
      records: ProductRecord[];
      total: number;
      page: number;
      limit: number;
    }>
  > {
    const searchParams = new URLSearchParams();

    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.search) searchParams.set("search", params.search);
    if (params?.productId) searchParams.set("productId", params.productId);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.userId) searchParams.set("userId", params.userId);
    if (params?.startDate) searchParams.set("startDate", params.startDate);
    if (params?.endDate) searchParams.set("endDate", params.endDate);

    const queryString = searchParams.toString();
    const url = `/api/records${queryString ? `?${queryString}` : ""}`;

    return apiClient.get<{
      records: ProductRecord[];
      total: number;
      page: number;
      limit: number;
    }>(url);
  }

  /**
   * Get records by product ID
   */
  async getRecordsByProduct(
    productId: string
  ): Promise<
    ApiResponse<{
      records: ProductRecord[];
      total: number;
      page: number;
      limit: number;
    }>
  > {
    return apiClient.get<{
      records: ProductRecord[];
      total: number;
      page: number;
      limit: number;
    }>(`/api/records?productId=${productId}&limit=1000`);
  }

  /**
   * Get a single record by ID
   */
  async getRecord(id: string): Promise<ApiResponse<ProductRecord>> {
    return apiClient.get<ProductRecord>(`/api/records/${id}`);
  }

  /**
   * Create a new record
   */
  async createRecord(
    data: CreateRecordData
  ): Promise<ApiResponse<ProductRecord>> {
    return apiClient.post<ProductRecord>("/api/records", data);
  }

  /**
   * Update an existing record
   */
  async updateRecord(
    id: string,
    data: UpdateRecordData
  ): Promise<ApiResponse<ProductRecord>> {
    return apiClient.put<ProductRecord>(`/api/records/${id}`, data);
  }

  /**
   * Delete a record
   */
  async deleteRecord(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/api/records/${id}`);
  }

  /**
   * Approve a record
   */
  async approveRecord(id: string): Promise<ApiResponse<ProductRecord>> {
    return apiClient.put<ProductRecord>(`/api/records/${id}/approve`, {});
  }

  /**
   * Reject a record
   */
  async rejectRecord(
    id: string,
    reason?: string
  ): Promise<ApiResponse<ProductRecord>> {
    return apiClient.put<ProductRecord>(`/api/records/${id}/reject`, {
      reason,
    });
  }

  /**
   * Get record statistics
   */
  async getRecordStats(): Promise<
    ApiResponse<{
      total: number;
      pending: number;
      approved: number;
      rejected: number;
      byProduct: Array<{
        productId: string;
        productName: string;
        count: number;
      }>;
      byStatus: Record<string, number>;
    }>
  > {
    return apiClient.get<{
      total: number;
      pending: number;
      approved: number;
      rejected: number;
      byProduct: Array<{
        productId: string;
        productName: string;
        count: number;
      }>;
      byStatus: Record<string, number>;
    }>("/api/records/stats");
  }

  /**
   * Validate internal lot uniqueness
   */
  async validateInternalLot(
    internalLot: string,
    excludeId?: string
  ): Promise<ApiResponse<{ available: boolean }>> {
    const params = new URLSearchParams({ internalLot });
    if (excludeId) params.set("excludeId", excludeId);

    return apiClient.get<{ available: boolean }>(
      `/api/records/validate-lot?${params.toString()}`
    );
  }

  /**
   * Format record display name
   */
  formatRecordDisplayName(record: ProductRecord): string {
    return `${record.internalLot} - ${
      record.product?.name || "Producto desconocido"
    }`;
  }

  /**
   * Check if record can be edited
   */
  canEditRecord(record: ProductRecord): boolean {
    return record.status === "pending";
  }

  /**
   * Check if record can be deleted
   */
  canDeleteRecord(record: ProductRecord): boolean {
    return record.status === "pending";
  }

  /**
   * Check if record can be approved
   */
  canApproveRecord(record: ProductRecord): boolean {
    return record.status === "pending";
  }

  /**
   * Check if record can be rejected
   */
  canRejectRecord(record: ProductRecord): boolean {
    return record.status === "pending";
  }

  /**
   * Get status color for UI
   */
  getStatusColor(status: string): string {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  /**
   * Get status label for UI
   */
  getStatusLabel(status: string): string {
    switch (status) {
      case "approved":
        return "Aprobado";
      case "rejected":
        return "Rechazado";
      case "pending":
        return "Pendiente";
      default:
        return "Desconocido";
    }
  }
}

export const recordService = new RecordService();
