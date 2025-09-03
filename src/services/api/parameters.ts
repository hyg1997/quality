import { apiClient, type ApiResponse } from "./base";

// Types for Parameter API
export interface Parameter {
  id: string;
  productId: string;
  name: string;
  type: "range" | "text" | "numeric";
  expectedValue?: string;
  minRange?: number;
  maxRange?: number;
  unit?: string;
  required: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  product?: {
    id: string;
    name: string;
    code?: string;
  };
}

export interface CreateParameterData {
  productId: string;
  masterParameterId?: string;
  name: string;
  type: "range" | "text" | "numeric";
  expectedValue?: string;
  minRange?: number;
  maxRange?: number;
  unit?: string;
  required?: boolean;
  active?: boolean;
}

export interface UpdateParameterData {
  productId?: string;
  name?: string;
  type?: "range" | "text" | "numeric";
  expectedValue?: string;
  minRange?: number;
  maxRange?: number;
  unit?: string;
  required?: boolean;
  active?: boolean;
}

export interface ParametersQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  productId?: string;
  type?: string;
  active?: boolean;
}

// Parameter API Service
export class ParameterService {
  /**
   * Get all parameters with pagination and filters
   */
  async getParameters(params?: ParametersQueryParams): Promise<
    ApiResponse<{
      parameters: Parameter[];
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
    if (params?.type) searchParams.set("type", params.type);
    if (params?.active !== undefined)
      searchParams.set("active", params.active.toString());

    const queryString = searchParams.toString();
    const url = `/api/parameters${queryString ? `?${queryString}` : ""}`;

    return apiClient.get<{
      parameters: Parameter[];
      total: number;
      page: number;
      limit: number;
    }>(url);
  }

  /**
   * Get parameters by product ID
   */
  async getParametersByProduct(
    productId: string
  ): Promise<
    ApiResponse<{
      parameters: Parameter[];
      total: number;
      page: number;
      limit: number;
    }>
  > {
    return apiClient.get<{
      parameters: Parameter[];
      total: number;
      page: number;
      limit: number;
    }>(`/api/parameters?productId=${productId}&limit=1000`);
  }

  /**
   * Get a single parameter by ID
   */
  async getParameter(id: string): Promise<ApiResponse<Parameter>> {
    return apiClient.get<Parameter>(`/api/parameters/${id}`);
  }

  /**
   * Create a new parameter
   */
  async createParameter(
    data: CreateParameterData
  ): Promise<ApiResponse<Parameter>> {
    return apiClient.post<Parameter>("/api/parameters", data);
  }

  /**
   * Update an existing parameter
   */
  async updateParameter(
    id: string,
    data: UpdateParameterData
  ): Promise<ApiResponse<Parameter>> {
    return apiClient.put<Parameter>(`/api/parameters/${id}`, data);
  }

  /**
   * Delete a parameter
   */
  async deleteParameter(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/api/parameters/${id}`);
  }

  /**
   * Toggle parameter active status
   */
  async toggleParameterStatus(
    id: string,
    active: boolean
  ): Promise<ApiResponse<Parameter>> {
    return apiClient.put<Parameter>(`/api/parameters/${id}`, { active });
  }

  /**
   * Validate parameter value against its configuration
   */
  async validateParameterValue(
    parameterId: string,
    value: string | number
  ): Promise<
    ApiResponse<{
      valid: boolean;
      message?: string;
      outOfRange?: boolean;
    }>
  > {
    return apiClient.post<{
      valid: boolean;
      message?: string;
      outOfRange?: boolean;
    }>(`/api/parameters/${parameterId}/validate`, { value });
  }

  /**
   * Get parameter statistics
   */
  async getParameterStats(): Promise<
    ApiResponse<{
      total: number;
      active: number;
      inactive: number;
      byType: Record<string, number>;
      byProduct: Array<{
        productId: string;
        productName: string;
        count: number;
      }>;
    }>
  > {
    return apiClient.get<{
      total: number;
      active: number;
      inactive: number;
      byType: Record<string, number>;
      byProduct: Array<{
        productId: string;
        productName: string;
        count: number;
      }>;
    }>("/api/parameters/stats");
  }

  /**
   * Duplicate parameters from one product to another
   */
  async duplicateParameters(
    fromProductId: string,
    toProductId: string
  ): Promise<ApiResponse<Parameter[]>> {
    return apiClient.post<Parameter[]>("/api/parameters/duplicate", {
      fromProductId,
      toProductId,
    });
  }
}

export const parameterService = new ParameterService();
