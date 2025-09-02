import { apiClient, type ApiResponse } from "./base";

// Types for Master Parameter API
export interface MasterParameter extends Record<string, unknown> {
  id: string;
  name: string;
  description?: string;
  type: "range" | "text" | "numeric";
  defaultValue?: string;
  minRange?: number;
  maxRange?: number;
  unit?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMasterParameterData {
  name: string;
  description?: string;
  type: "range" | "text" | "numeric";
  defaultValue?: string;
  minRange?: number;
  maxRange?: number;
  unit?: string;
  active?: boolean;
}

export interface UpdateMasterParameterData {
  name?: string;
  description?: string;
  type?: "range" | "text" | "numeric";
  defaultValue?: string;
  minRange?: number;
  maxRange?: number;
  unit?: string;
  active?: boolean;
}

export interface MasterParametersQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  active?: boolean;
}

// Master Parameter API Service
export class MasterParameterService {
  /**
   * Get all master parameters with pagination and filters
   */
  async getMasterParameters(params?: MasterParametersQueryParams): Promise<
    ApiResponse<{
      masterParameters: MasterParameter[];
      total: number;
      page: number;
      limit: number;
    }>
  > {
    const searchParams = new URLSearchParams();

    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.search) searchParams.set("search", params.search);
    if (params?.type) searchParams.set("type", params.type);
    if (params?.active !== undefined)
      searchParams.set("active", params.active.toString());

    const queryString = searchParams.toString();
    const url = `/api/master-parameters${queryString ? `?${queryString}` : ""}`;

    return apiClient.get<{
      masterParameters: MasterParameter[];
      total: number;
      page: number;
      limit: number;
    }>(url);
  }

  /**
   * Get a single master parameter by ID
   */
  async getMasterParameter(id: string): Promise<ApiResponse<MasterParameter>> {
    return apiClient.get<MasterParameter>(`/api/master-parameters/${id}`);
  }

  /**
   * Create a new master parameter
   */
  async createMasterParameter(
    data: CreateMasterParameterData
  ): Promise<ApiResponse<MasterParameter>> {
    return apiClient.post<MasterParameter>("/api/master-parameters", data);
  }

  /**
   * Update an existing master parameter
   */
  async updateMasterParameter(
    id: string,
    data: UpdateMasterParameterData
  ): Promise<ApiResponse<MasterParameter>> {
    return apiClient.put<MasterParameter>(`/api/master-parameters/${id}`, data);
  }

  /**
   * Delete a master parameter
   */
  async deleteMasterParameter(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/api/master-parameters/${id}`);
  }

  /**
   * Toggle master parameter active status
   */
  async toggleMasterParameterStatus(
    id: string,
    active: boolean
  ): Promise<ApiResponse<MasterParameter>> {
    return apiClient.put<MasterParameter>(`/api/master-parameters/${id}`, {
      active,
    });
  }
}

export const masterParameterService = new MasterParameterService();
