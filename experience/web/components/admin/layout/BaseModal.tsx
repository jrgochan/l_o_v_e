/**
 * Base Modal Component
 *
 * Reusable modal wrapper with consistent styling and behavior.
 * Provides backdrop, close button, escape key handling, and animations.
 *
 * @example
 * ```tsx
 * <BaseModal
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   title="Settings"
 *   size="lg"
 * >
 *   <div>Modal content here</div>
 * </BaseModal>
 * ```
 */

"use client";

import { useEffect } from "react";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

export type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: ModalSize;
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  children: React.ReactNode;
  className?: string;
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-7xl",
};

/**
 * BaseModal - Consistent modal wrapper
 */
export function BaseModal({
  isOpen,
  onClose,
  title,
  size = "md",
  showCloseButton = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  children,
  className = "",
}: BaseModalProps) {
  const theme = useAdminTheme();
  // Escape key handling
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={closeOnBackdrop ? onClose : undefined}
      />

      {/* Modal Content */}
      <div
        className={`
          relative bg-gray-900 border-2 ${theme.colors.border} ${theme.layout.borderRadius} shadow-2xl
          ${sizeClasses[size]} w-full
          max-h-[90vh] overflow-y-auto
          animate-scale-in transition-colors duration-500
          ${className}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className={`sticky top-0 z-10 bg-gray-900 border-b ${theme.colors.border} px-6 py-4 flex items-center justify-between`}>
            {title && <h2 className={`text-xl font-bold ${theme.colors.text.primary}`}>{title}</h2>}
            {showCloseButton && (
              <button
                onClick={onClose}
                className={`${theme.colors.text.secondary} hover:${theme.colors.text.primary} transition text-2xl leading-none`}
                title="Close (Esc)"
              >
                ×
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

/**
 * Confirmation Dialog - Pre-configured modal for confirmations
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "danger";
}) {
  const theme = useAdminTheme();
  const variantClasses = {
    default: "bg-cyan-600 hover:bg-cyan-500",
    danger: "bg-red-600 hover:bg-red-500",
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        <p className={theme.colors.text.secondary}>{message}</p>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className={`px-4 py-2 bg-black/30 border ${theme.colors.border} ${theme.colors.hover} ${theme.colors.text.primary} ${theme.layout.borderRadius} transition`}
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 text-white rounded transition ${variantClasses[variant]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
