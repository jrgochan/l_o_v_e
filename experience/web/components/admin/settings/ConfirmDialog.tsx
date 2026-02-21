/**
 * Confirm Dialog Component
 *
 * Reusable confirmation dialog for destructive or important actions.
 */

"use client";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
}

import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "info",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const theme = useAdminTheme();

  if (!isOpen) return null;

  const variantStyles = {
    danger: "bg-red-600 hover:bg-red-500 border-red-500",
    warning: "bg-yellow-600 hover:bg-yellow-500 border-yellow-500",
    info: "bg-cyan-600 hover:bg-cyan-500 border-cyan-500",
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${theme.effects.backdropBlur} ${theme.effects.glass}`}
    >
      <div
        className={`${theme.colors.background} ${theme.layout.borderRadius} p-6 max-w-md w-full mx-4 border ${theme.colors.border}`}
      >
        <h3 className={`text-lg font-bold ${theme.colors.text.primary} mb-3`}>{title}</h3>
        <p className={`${theme.colors.text.secondary} text-sm mb-6 leading-relaxed`}>{message}</p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className={`flex-1 px-4 py-2 bg-black/40 hover:bg-black/60 ${theme.colors.text.primary} border ${theme.colors.border} rounded transition`}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 text-white rounded transition ${variantStyles[variant]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
