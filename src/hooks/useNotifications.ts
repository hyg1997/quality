'use client'

import { useCallback } from 'react'
import { useApp } from '@/contexts/AppContext'

interface NotificationOptions {
  title: string
  message?: string
  duration?: number
  persistent?: boolean
}



export function useNotifications() {
  const { addNotification, removeNotification, state } = useApp()

  // Base notification function
  const notify = useCallback((type: 'success' | 'error' | 'warning' | 'info', options: NotificationOptions) => {
    const duration = options.persistent ? 0 : (options.duration ?? getDefaultDuration(type))
    
    addNotification({
      type,
      title: options.title,
      message: options.message,
      duration
    })
  }, [addNotification])

  // Preset notification functions
  const success = useCallback((title: string, message?: string, options: Partial<NotificationOptions> = {}) => {
    notify('success', { title, message, ...options })
  }, [notify])

  const error = useCallback((title: string, message?: string, options: Partial<NotificationOptions> = {}) => {
    notify('error', { title, message, ...options })
  }, [notify])

  const warning = useCallback((title: string, message?: string, options: Partial<NotificationOptions> = {}) => {
    notify('warning', { title, message, ...options })
  }, [notify])

  const info = useCallback((title: string, message?: string, options: Partial<NotificationOptions> = {}) => {
    notify('info', { title, message, ...options })
  }, [notify])

  // Utility functions
  const clearAll = useCallback(() => {
    state.notifications.forEach(notification => {
      removeNotification(notification.id)
    })
  }, [state.notifications, removeNotification])

  const clearByType = useCallback((type: 'success' | 'error' | 'warning' | 'info') => {
    state.notifications
      .filter(notification => notification.type === type)
      .forEach(notification => {
        removeNotification(notification.id)
      })
  }, [state.notifications, removeNotification])

  // Common notification patterns
  const apiSuccess = useCallback((message = 'Operación completada exitosamente') => {
    success('Éxito', message)
  }, [success])

  const apiError = useCallback((message = 'Ha ocurrido un error inesperado') => {
    error('Error', message, { persistent: true })
  }, [error])

  const validationError = useCallback((message = 'Por favor, verifica los datos ingresados') => {
    warning('Datos inválidos', message)
  }, [warning])

  const networkError = useCallback((message = 'Error de conexión. Verifica tu conexión a internet.') => {
    error('Sin conexión', message, { persistent: true })
  }, [error])

  const permissionError = useCallback((message = 'No tienes permisos para realizar esta acción') => {
    warning('Acceso denegado', message)
  }, [warning])

  const loadingComplete = useCallback((message = 'Datos cargados correctamente') => {
    info('Carga completa', message, { duration: 2000 })
  }, [info])

  return {
    // Base functions
    notify,
    remove: removeNotification,
    
    // Preset functions
    success,
    error,
    warning,
    info,
    
    // Utility functions
    clearAll,
    clearByType,
    
    // Common patterns
    apiSuccess,
    apiError,
    validationError,
    networkError,
    permissionError,
    loadingComplete,
    
    // State
    notifications: state.notifications,
    count: state.notifications.length
  }
}

// Helper function to get default duration based on type
function getDefaultDuration(type: 'success' | 'error' | 'warning' | 'info'): number {
  switch (type) {
    case 'success':
      return 4000
    case 'error':
      return 0 // Persistent by default
    case 'warning':
      return 6000
    case 'info':
      return 5000
    default:
      return 5000
  }
}

export default useNotifications