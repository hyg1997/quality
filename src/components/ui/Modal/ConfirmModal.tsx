'use client'

import { AlertTriangle, Info, Check, Plus } from 'lucide-react'
import Button from '../Button'
import { Modal } from './Modal'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  type?: 'danger' | 'warning' | 'info' | 'success'
  confirmText?: string
  cancelText?: string
  loading?: boolean
}

const typeConfig = {
  danger: {
    icon: Plus,
    iconColor: 'text-red-500',
    confirmVariant: 'danger' as const
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-yellow-500',
    confirmVariant: 'primary' as const
  },
  info: {
    icon: Info,
    iconColor: 'text-blue-500',
    confirmVariant: 'primary' as const
  },
  success: {
    icon: Check,
    iconColor: 'text-green-500',
    confirmVariant: 'primary' as const
  }
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'info',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  loading = false
}: ConfirmModalProps) {
  const config = typeConfig[type]
  const Icon = config.icon

  const handleConfirm = () => {
    onConfirm()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      showCloseButton={false}
      closeOnOverlayClick={!loading}
      closeOnEscape={!loading}
    >
      <div className="p-6">
        <div className="flex items-start space-x-4">
          <div className={`flex-shrink-0 ${config.iconColor}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {title}
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              {message}
            </p>
            <div className="flex space-x-3 justify-end">
              <Button
                variant="secondary"
                onClick={onClose}
                disabled={loading}
              >
                {cancelText}
              </Button>
              <Button
                variant={config.confirmVariant}
                onClick={handleConfirm}
                loading={loading}
              >
                {confirmText}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default ConfirmModal