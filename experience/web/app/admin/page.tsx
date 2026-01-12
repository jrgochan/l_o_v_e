"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to users page by default
    router.replace("/admin/users");
  }, [router]);

  return (
    <AdminLayout>
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Redirecting to dashboard...</div>
      </div>
    </AdminLayout>
  );
}
