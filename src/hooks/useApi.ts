'use client'

import { useState, useCallback } from 'react'
import { useApp } from '@/contexts/AppContext'

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  body?: unknown
  showSuccessNotification?: boolean
  showErrorNotification?: boolean
  successMessage?: string
  errorMessage?: string
}

interface ApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

interface ApiResponse<T> {
  data: T | null
  error: string | null
  success: boolean
}

export function useApi<T = unknown>() {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null
  })
  
  const { addNotification } = useApp()

  const request = useCallback(async (
    url: string, 
    options: ApiOptions = {}
  ): Promise<ApiResponse<T>> => {
    const {
      method = 'GET',
      headers = {},
      body,
      showSuccessNotification = false,
      showErrorNotification = true,
      successMessage,
      errorMessage
    } = options

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const config: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      }

      if (body && method !== 'GET') {
        config.body = JSON.stringify(body)
      }

      const response = await fetch(url, config)
      const responseData = await response.json()

      if (!response.ok) {
        const error = responseData.error || `Error ${response.status}: ${response.statusText}`
        
        setState(prev => ({ ...prev, loading: false, error }))
        
        if (showErrorNotification) {
          addNotification({
            type: 'error',
            title: 'Error',
            message: errorMessage || error
          })
        }
        
        return { data: null, error, success: false }
      }

      setState(prev => ({ ...prev, loading: false, data: responseData, error: null }))
      
      if (showSuccessNotification && successMessage) {
        addNotification({
          type: 'success',
          title: 'Éxito',
          message: successMessage
        })
      }
      
      return { data: responseData, error: null, success: true }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error de conexión'
      
      setState(prev => ({ ...prev, loading: false, error: errorMsg }))
      
      if (showErrorNotification) {
        addNotification({
          type: 'error',
          title: 'Error de conexión',
          message: errorMessage || errorMsg
        })
      }
      
      return { data: null, error: errorMsg, success: false }
    }
  }, [addNotification])

  const get = useCallback((url: string, options?: Omit<ApiOptions, 'method' | 'body'>) => {
    return request(url, { ...options, method: 'GET' })
  }, [request])

  const post = useCallback((url: string, body?: unknown, options?: Omit<ApiOptions, 'method'>) => {
    return request(url, { ...options, method: 'POST', body })
  }, [request])

  const put = useCallback((url: string, body?: unknown, options?: Omit<ApiOptions, 'method'>) => {
    return request(url, { ...options, method: 'PUT', body })
  }, [request])

  const del = useCallback((url: string, options?: Omit<ApiOptions, 'method' | 'body'>) => {
    return request(url, { ...options, method: 'DELETE' })
  }, [request])

  const patch = useCallback((url: string, body?: unknown, options?: Omit<ApiOptions, 'method'>) => {
    return request(url, { ...options, method: 'PATCH', body })
  }, [request])

  return {
    ...state,
    request,
    get,
    post,
    put,
    delete: del,
    patch
  }
}

export default useApi