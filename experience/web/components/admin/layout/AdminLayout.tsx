"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { AdminGuard } from "@/components/admin/layout/AdminGuard";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AdminGuard>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminGuard>
  );
}

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const pathname = usePathname();
  const theme = useAdminTheme();

  const navItems = [
    { label: "Users", href: "/admin/users", icon: "👥" },
    { label: "Sessions", href: "/admin/sessions", icon: "💬" },
    { label: "Atlas Visualization", href: "/admin/atlas", icon: "🌌" },
    { label: "Data Management", href: "/admin/data", icon: "💾" },
  ];

  return (
    <div className={`min-h-screen flex transition-colors duration-500 ${theme.colors.background}`}>
      {/* Sidebar */}
      <aside className={`w-64 border-r flex flex-col transition-colors duration-500 ${theme.colors.background} ${theme.colors.border}`}>
        <div className={`p-6 border-b ${theme.colors.border}`}>
          <h1 className={`text-xl font-bold flex items-center gap-2 ${theme.colors.text.primary}`}>
            <span>⚡</span> Admin
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive
                    ? `${theme.colors.primary} ${theme.colors.border} border bg-white/5`
                    : `${theme.colors.text.secondary} hover:bg-white/5 hover:${theme.colors.text.primary}`
                  }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className={`p-4 border-t ${theme.colors.border}`}>
          <div className="mb-4 px-4">
            <p className={`text-xs ${theme.colors.text.muted}`}>Logged in as</p>
            <p className={`text-sm font-medium truncate ${theme.colors.text.primary}`}>{user?.email}</p>
          </div>
          <Link
            href="/"
            className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${theme.colors.text.secondary} hover:${theme.colors.text.primary} hover:bg-white/5`}
          >
            <span>🚪</span> Exit Admin
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className={`max-w-7xl mx-auto p-8 ${theme.colors.text.primary}`}>{children}</div>
      </main>
    </div>
  );
}
