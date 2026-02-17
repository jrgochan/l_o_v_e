"use client";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { UserRole } from "@/types/auth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard requiredRole={[UserRole.ADMIN, UserRole.CLINICIAN]}>{children}</AuthGuard>;
}
