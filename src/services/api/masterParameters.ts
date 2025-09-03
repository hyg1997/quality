import { apiClient, type ApiResponse } from "./base";
export interface MasterParameter extends Record<string, unknown> {
  id: string;
  name: string;
  description?: string;
  type: "range" | "text" | "numeric";
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface CreateMasterParameterData {
  name: string;
  description?: string;
  type: "range" | "text" | "numeric";
  active?: boolean;
}
export interface UpdateMasterParameterData {
  name?: string;
  description?: string;
  type?: "range" | "text" | "numeric";
  active?: boolean;
}
export interface MasterParametersQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  active?: boolean;
}
export class MasterParameterService {
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
  async getMasterParameter(id: string): Promise<ApiResponse<MasterParameter>> {
    return apiClient.get<MasterParameter>(`/api/master-parameters/${id}`);
  }
  async createMasterParameter(
    data: CreateMasterParameterData
  ): Promise<ApiResponse<MasterParameter>> {
    return apiClient.post<MasterParameter>("/api/master-parameters", data);
  }
  async updateMasterParameter(
    id: string,
    data: UpdateMasterParameterData
  ): Promise<ApiResponse<MasterParameter>> {
    return apiClient.put<MasterParameter>(`/api/master-parameters/${id}`, data);
  }
  async deleteMasterParameter(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/api/master-parameters/${id}`);
  }
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
