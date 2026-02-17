"use client";

import { ClinicalPortal } from "@/components/admin/clinical/ClinicalPortal";

/**
 * Clinical Portal page — accessible to both clinicians and admins.
 * The admin layout.tsx AuthGuard already enforces role checks.
 */
export default function ClinicalPage() {
  return <ClinicalPortal />;
}
