"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { AdminGuard } from "@/components/admin/layout/AdminGuard";

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

  const navItems = [
    { label: "Users", href: "/admin/users", icon: "👥" },
    { label: "Sessions", href: "/admin/sessions", icon: "💬" },
    { label: "Atlas Visualization", href: "/admin/atlas", icon: "🌌" },
    { label: "Data Management", href: "/admin/data", icon: "💾" },
  ];

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
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
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-cyan-900/30 text-cyan-400 border border-cyan-800/50"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="mb-4 px-4">
            <p className="text-xs text-gray-500">Logged in as</p>
            <p className="text-sm text-white font-medium truncate">{user?.email}</p>
          </div>
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors text-sm"
          >
            <span>🚪</span> Exit Admin
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-8">{children}</div>
      </main>
    </div>
  );
}
