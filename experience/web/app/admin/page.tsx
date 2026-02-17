"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";

export default function AdminPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    // Clinicians go to Clinical Portal; admins go to Users by default
    if (user?.role === "clinician") {
      router.replace("/admin/clinical");
    } else {
      router.replace("/admin/users");
    }
  }, [router, user?.role]);

  return (
    <AdminLayout>
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Redirecting to dashboard...</div>
      </div>
    </AdminLayout>
  );
}
