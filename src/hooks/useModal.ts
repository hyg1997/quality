'use client'

import { useState, useCallback } from 'react'

interface ModalState {
  isOpen: boolean
  data?: unknown
}

export function useModal<T = unknown>() {
  const [state, setState] = useState<ModalState>({ isOpen: false })

  const open = useCallback((data?: T) => {
    setState({ isOpen: true, data })
  }, [])

  const close = useCallback(() => {
    setState({ isOpen: false, data: undefined })
  }, [])

  const toggle = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: !prev.isOpen }))
  }, [])

  return {
    isOpen: state.isOpen,
    data: state.data as T | undefined,
    open,
    close,
    toggle
  }
}

// Hook for confirmation modals
export function useConfirmModal() {
  const [state, setState] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
    type?: 'danger' | 'warning' | 'info' | 'success'
    confirmText?: string
    cancelText?: string
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  })

  const confirm = useCallback((options: {
    title: string
    message: string
    onConfirm: () => void
    type?: 'danger' | 'warning' | 'info' | 'success'
    confirmText?: string
    cancelText?: string
  }) => {
    setState({
      isOpen: true,
      ...options
    })
  }, [])

  const close = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }))
  }, [setState])

  const handleConfirm = useCallback(() => {
    state.onConfirm()
    close()
  }, [state, close])

  return {
    isOpen: state.isOpen,
    title: state.title,
    message: state.message,
    type: state.type,
    confirmText: state.confirmText,
    cancelText: state.cancelText,
    confirm,
    close,
    handleConfirm
  }
}

export default useModal