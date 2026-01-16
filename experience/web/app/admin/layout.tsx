"use client";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { UserRole } from "@/types/auth"; // Ensure this type exists or use "admin" string

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard requiredRole={UserRole.ADMIN}>{children}</AuthGuard>;
}
