"use client";

/**
 * Admin Journal Page — Life Journal management dashboard.
 *
 * Four tabs: Events Explorer, Correlation Dashboard,
 * Integrations Admin, and Event Stream Monitor.
 */

import { useState } from "react";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { JournalEventsTab } from "@/components/admin/data/JournalEventsTab";
import { JournalCorrelationsTab } from "@/components/admin/data/JournalCorrelationsTab";
import { JournalIntegrationsTab } from "@/components/admin/data/JournalIntegrationsTab";
import { JournalStreamTab } from "@/components/admin/data/JournalStreamTab";
import { CalendarDays, Sparkles, Link2, Radio } from "lucide-react";

type JournalAdminTab = "events" | "correlations" | "integrations" | "stream";

export default function AdminJournalPage() {
  const [activeTab, setActiveTab] = useState<JournalAdminTab>("events");

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Life Journal</h1>
          <p className="text-gray-400 text-sm">
            Monitor and manage life events, discovered correlations, integration
            health, and event stream infrastructure across all users.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-800 overflow-x-auto pb-1">
          <TabButton
            active={activeTab === "events"}
            onClick={() => setActiveTab("events")}
            icon={<CalendarDays className="w-4 h-4" />}
            label="Events Explorer"
            color="purple"
          />
          <TabButton
            active={activeTab === "correlations"}
            onClick={() => setActiveTab("correlations")}
            icon={<Sparkles className="w-4 h-4" />}
            label="Correlations"
            color="cyan"
          />
          <TabButton
            active={activeTab === "integrations"}
            onClick={() => setActiveTab("integrations")}
            icon={<Link2 className="w-4 h-4" />}
            label="Integrations"
            color="green"
          />
          <TabButton
            active={activeTab === "stream"}
            onClick={() => setActiveTab("stream")}
            icon={<Radio className="w-4 h-4" />}
            label="Event Stream"
            color="amber"
          />
        </div>

        {/* Content */}
        <div className="min-h-[600px]">
          {activeTab === "events" && <JournalEventsTab />}
          {activeTab === "correlations" && <JournalCorrelationsTab />}
          {activeTab === "integrations" && <JournalIntegrationsTab />}
          {activeTab === "stream" && <JournalStreamTab />}
        </div>
      </div>
    </AdminLayout>
  );
}

// ---------------------------------------------------------------------------
// Tab Button (matching Data Management page pattern)
// ---------------------------------------------------------------------------

function TabButton({
  active,
  onClick,
  icon,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  color: string;
}) {
  const colorMap: Record<string, { active: string; inactive: string }> = {
    purple: { active: "border-purple-500 text-purple-400", inactive: "" },
    cyan: { active: "border-cyan-500 text-cyan-400", inactive: "" },
    green: { active: "border-green-500 text-green-400", inactive: "" },
    amber: { active: "border-amber-500 text-amber-400", inactive: "" },
  };

  const colors = colorMap[color] || colorMap.purple;

  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
        active
          ? colors.active
          : "border-transparent text-gray-500 hover:text-gray-300"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
