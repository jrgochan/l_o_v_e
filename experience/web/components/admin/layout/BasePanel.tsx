/**
 * Base Panel Component
 *
 * Reusable panel wrapper with consistent styling.
 * Provides header/content/footer sections and standard borders.
 *
 * @example
 * ```tsx
 * <BasePanel title="Statistics" className="w-96">
 *   <div>Panel content</div>
 * </BasePanel>
 * ```
 */

"use client";

interface BasePanelProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  variant?: "default" | "primary" | "secondary";
}

/**
 * BasePanel - Consistent panel wrapper
 */
export function BasePanel({
  title,
  subtitle,
  actions,
  children,
  footer,
  className = "",
  variant = "default",
}: BasePanelProps) {
  const variantClasses = {
    default: "bg-gray-800 border-gray-700",
    primary: "bg-cyan-900/30 border-cyan-500/30",
    secondary: "bg-purple-900/30 border-purple-500/30",
  };

  return (
    <div className={`rounded-lg border ${variantClasses[variant]} ${className}`}>
      {/* Header */}
      {(title || actions) && (
        <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
          <div>
            {title && <h3 className="text-lg font-semibold text-white">{title}</h3>}
            {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      {/* Content */}
      <div className="p-4">{children}</div>

      {/* Footer */}
      {footer && <div className="px-4 py-3 border-t border-gray-700 bg-gray-900/50">{footer}</div>}
    </div>
  );
}

/**
 * PanelSection - Sectioned content within panels
 */
export function PanelSection({
  title,
  collapsible = false,
  defaultOpen = true,
  children,
  className = "",
}: {
  title?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <div className={`space-y-2 ${className}`}>
      {title && (
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">{title}</h4>
          {collapsible && (
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-400 hover:text-white transition text-sm"
            >
              {isOpen ? "▼" : "▶"}
            </button>
          )}
        </div>
      )}
      {(!collapsible || isOpen) && <div>{children}</div>}
    </div>
  );
}

// Need to import React for useState
import React from "react";
