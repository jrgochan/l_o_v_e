"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import { UserRole } from "@/types/auth";
import { AuthModal } from "@/components/auth/AuthModal";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const theme = useAdminTheme();
  const { user, isLoading: isAuthLoading, setUser, setToken } = useAuthStore();
  const [isClient, setIsClient] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsClient(true), 0);
  }, []);

  if (!isClient) return null;

  if (isAuthLoading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center text-white ${theme.colors.background}`}
      >
        Loading...
      </div>
    );
  }

  if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.CLINICIAN)) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center text-white space-y-4 ${theme.colors.background}`}
      >
        <h1 className="text-2xl font-bold text-cyan-500">Clinical Access</h1>
        <p className={theme.colors.text.muted}>Please sign in to access the portal.</p>
        <div className="flex gap-4 flex-wrap justify-center">
          <Link
            href="/"
            className={`px-4 py-2 rounded transition-colors ${theme.colors.background} ${theme.colors.hover}`}
          >
            Return Home
          </Link>
          <button
            onClick={() => {
              setUser({
                id: "dev-admin-id",
                email: "dev@admin.com",
                full_name: "Dev Admin",
                role: UserRole.ADMIN,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });
              setToken("dev-token-bypass");
            }}
            className="px-4 py-2 bg-purple-900/50 hover:bg-purple-800/50 text-purple-200 border border-purple-700/50 rounded transition-colors text-sm"
            title="Sets a fake admin session for UI testing"
          >
            🧙 Dev Admin
          </button>
          <button
            onClick={() => {
              setUser({
                id: "dev-clinician-id",
                email: "dev@clinician.com",
                full_name: "Dev Clinician",
                role: UserRole.CLINICIAN,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });
              setToken("dev-token-bypass");
            }}
            className="px-4 py-2 bg-teal-900/50 hover:bg-teal-800/50 text-teal-200 border border-teal-700/50 rounded transition-colors text-sm"
            title="Sets a fake clinician session for UI testing"
          >
            🩺 Dev Clinician
          </button>
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded transition-colors font-medium"
          >
            Sign In
          </button>
        </div>
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      </div>
    );
  }

  return <>{children}</>;
}
