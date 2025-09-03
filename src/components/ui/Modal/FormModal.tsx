"use client";

import { ReactNode } from "react";
import Button from "../Button";
import { Modal } from "./Modal";

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  title: string;
  children: ReactNode;
  submitText?: string;
  cancelText?: string;
  loading?: boolean;
  disabled?: boolean;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showCancelButton?: boolean;
}

export function FormModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  children,
  submitText = "Guardar",
  cancelText = "Cancelar",
  loading = false,
  disabled = false,
  size = "md",
  showCancelButton = true,
}: FormModalProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(e);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
      closeOnOverlayClick={!loading}
      closeOnEscape={!loading}
    >
      <form onSubmit={handleSubmit}>
        <div className="p-6">{children}</div>

        <div className="flex justify-end space-x-3 px-6 py-4 bg-gray-50 border-t border-gray-200">
          {showCancelButton && (
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
            >
              {cancelText}
            </Button>
          )}
          <Button type="submit" loading={loading} disabled={disabled}>
            {submitText}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default FormModal;
