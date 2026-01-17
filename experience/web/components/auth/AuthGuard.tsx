"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { UserRole } from "@/types/auth";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  fallback?: React.ReactNode;
}

export function AuthGuard({ children, requiredRole, fallback }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuthStore();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  // Derived state (no useState needed)
  const isAuthorized = !requiredRole || user?.role === requiredRole;

  useEffect(() => {
    // Only redirect if not loading and not authenticated
    if (!isLoading && !isAuthenticated) {
      if (process.env.NODE_ENV === "development") {
        console.log(`[AuthGuard] Unauthenticated access attempt to ${pathname}`);
      }
      router.push("/");
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  // Fallback for unauthorized access (e.g. 403 Forbidden)
  // If not authenticated, we rely on the effect to redirect, but we return null here to prevent flashing content
  if (!isAuthenticated) {
    return null;
  }

  if (!isAuthorized) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[AuthGuard] Unauthorized role access. Required: ${requiredRole}, Current: ${user?.role}`);
    }
    if (fallback) return <>{fallback}</>;

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
        <h1 className="text-4xl font-bold text-red-500 mb-4">403 Forbidden</h1>
        <p className="text-gray-400 mb-8">You do not have permission to access this area.</p>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
        >
          Return Home
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
