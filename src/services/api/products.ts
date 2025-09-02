import { apiClient, type ApiResponse } from './base'

// Types for Product API
export interface Product extends Record<string, unknown> {
  id: string
  name: string
  description?: string
  code?: string
  active: boolean
  createdAt: string
  updatedAt: string
  _count?: {
    parameters: number
    records: number
  }
}

export interface CreateProductData {
  name: string
  description?: string
  code?: string
  active?: boolean
}

export interface UpdateProductData {
  name?: string
  description?: string
  code?: string
  active?: boolean
}

export interface ProductsQueryParams {
  page?: number
  limit?: number
  search?: string
  active?: boolean
}

// Product API Service
export class ProductService {
  /**
   * Get all products with pagination and filters
   */
  async getProducts(params?: ProductsQueryParams): Promise<ApiResponse<{ products: Product[], total: number, page: number, limit: number }>> {
    const searchParams = new URLSearchParams()

    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.search) searchParams.set('search', params.search)
    if (params?.active !== undefined)
      searchParams.set('active', params.active.toString())

    const queryString = searchParams.toString()
    const url = `/api/products${queryString ? `?${queryString}` : ''}`

    return apiClient.get<{ products: Product[], total: number, page: number, limit: number }>(url)
  }

  /**
   * Get a single product by ID
   */
  async getProduct(id: string): Promise<ApiResponse<Product>> {
    return apiClient.get<Product>(`/api/products/${id}`)
  }

  /**
   * Create a new product
   */
  async createProduct(data: CreateProductData): Promise<ApiResponse<Product>> {
    return apiClient.post<Product>('/api/products', data)
  }

  /**
   * Update an existing product
   */
  async updateProduct(id: string, data: UpdateProductData): Promise<ApiResponse<Product>> {
    return apiClient.put<Product>(`/api/products/${id}`, data)
  }

  /**
   * Delete a product
   */
  async deleteProduct(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/api/products/${id}`)
  }

  /**
   * Toggle product active status
   */
  async toggleProductStatus(id: string, active: boolean): Promise<ApiResponse<Product>> {
    return apiClient.put<Product>(`/api/products/${id}`, { active })
  }

  /**
   * Get products for dropdown/select components
   */
  async getProductsForSelect(): Promise<ApiResponse<Pick<Product, "id" | "name" | "code">[]>> {
    return apiClient.get<Pick<Product, "id" | "name" | "code">[]>(
      '/api/products/select'
    )
  }

  /**
   * Validate product code uniqueness
   */
  async validateProductCode(code: string, excludeId?: string): Promise<ApiResponse<{ available: boolean }>> {
    const params = new URLSearchParams({ code })
    if (excludeId) params.set('excludeId', excludeId)

    return apiClient.get<{ available: boolean }>(
      `/api/products/validate-code?${params.toString()}`
    )
  }

  /**
   * Get product statistics
   */
  async getProductStats(): Promise<ApiResponse<{
    total: number
    active: number
    inactive: number
    withParameters: number
    withoutParameters: number
  }>> {
    return apiClient.get<{
      total: number
      active: number
      inactive: number
      withParameters: number
      withoutParameters: number
    }>('/api/products/stats')
  }
}

export const productService = new ProductService()
