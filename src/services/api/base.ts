'use client'

// Base API client with common functionality
export interface ApiResponse<T = unknown> {
  data: T | null
  error: string | null
  success: boolean
}

export interface ApiOptions {
  headers?: Record<string, string>
  showSuccessNotification?: boolean
  showErrorNotification?: boolean
  successMessage?: string
  errorMessage?: string
}

export class ApiClient {
  private baseUrl: string
  private defaultHeaders: Record<string, string>

  constructor(baseUrl = '', defaultHeaders: Record<string, string> = {}) {
    this.baseUrl = baseUrl
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...defaultHeaders
    }
  }

  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    body?: unknown,
    options: ApiOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      headers = {}
    } = options

    try {
      const config: RequestInit = {
        method,
        headers: {
          ...this.defaultHeaders,
          ...headers
        }
      }

      if (body && method !== 'GET') {
        config.body = JSON.stringify(body)
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, config)
      const responseData = await response.json()

      if (!response.ok) {
        const error = responseData.error || `Error ${response.status}: ${response.statusText}`
        return { data: null, error, success: false }
      }

      return { data: responseData, error: null, success: true }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error de conexión'
      return { data: null, error: errorMsg, success: false }
    }
  }

  async get<T>(endpoint: string, options?: ApiOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, 'GET', undefined, options)
  }

  async post<T>(endpoint: string, body?: unknown, options?: ApiOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, 'POST', body, options)
  }

  async put<T>(endpoint: string, body?: unknown, options?: ApiOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, 'PUT', body, options)
  }

  async delete<T>(endpoint: string, options?: ApiOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, 'DELETE', undefined, options)
  }

  async patch<T>(endpoint: string, body?: unknown, options?: ApiOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, 'PATCH', body, options)
  }
}

// Default API client instance
export const apiClient = new ApiClient()