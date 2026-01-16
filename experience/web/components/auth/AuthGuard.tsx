"use client";

import { useEffect, useState } from "react";
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
    const { user, token, isLoading } = useAuthStore();
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        // Determine auth status
        const isAuth = !!token;

        if (!isAuth) {
            // If not authenticated, redirect to home (which has login modal)
            // We could also redirect to specific /login page if we had one
            if (process.env.NODE_ENV === "development") {
                console.log(`[AuthGuard] Unauthenticated access attempt to ${pathname}`);
            }
            router.push("/");
            setChecking(false);
            return;
        }

        // Role check
        if (requiredRole && user?.role !== requiredRole) {
            if (process.env.NODE_ENV === "development") {
                console.log(
                    `[AuthGuard] Unauthorized role access attempt to ${pathname}. Needed ${requiredRole}, got ${user?.role}`
                );
            }
            setIsAuthorized(false);
        } else {
            setIsAuthorized(true);
        }

        setChecking(false);
    }, [token, user, requiredRole, router, pathname]);

    // Loading state
    if (isLoading || checking) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-black">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
            </div>
        );
    }

    // Fallback for unauthorized access (e.g. 403 Forbidden)
    if (!isAuthenticated) {
        return null; // Should have redirected
    }

    if (!isAuthorized) {
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
