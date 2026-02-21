/**
 * Clinical Portal — Complete clinician workspace.
 *
 * 4-tab interface:
 * - Overview: Caseload stats, priority alerts, activity feed
 * - Clients: Client list + drill-down detail view
 * - Alerts: Filterable alert feed with acknowledgment
 * - Analytics: Cross-client trends and patterns
 */

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";
import { useAuthStore } from "@/stores/authStore";
import {
  clinicianApi,
  type ClientSummary,
  type ClinicalAlertItem,
  type AlertSummary,
  type ClientSession,
  type TrajectoryPoint,
} from "@/utils/clinicianApi";
import { EmergencyStop } from "./EmergencyStop";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle,
  ChevronLeft,
  Clock,
  FileText,
  Filter,
  Heart,
  RefreshCw,
  Search,
  Shield,
  StickyNote,
  TrendingUp,
  User,
  Users,
  X,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabId = "overview" | "clients" | "alerts" | "analytics";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  { id: "overview", label: "Overview", icon: <Activity className="w-4 h-4" /> },
  { id: "clients", label: "Clients", icon: <Users className="w-4 h-4" /> },
  { id: "alerts", label: "Alerts", icon: <AlertTriangle className="w-4 h-4" /> },
  { id: "analytics", label: "Analytics", icon: <BarChart3 className="w-4 h-4" /> },
];

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ClinicalPortal() {
  const [theme] = useState(useAdminTheme());
  const user = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  // --- Data State ---
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [alerts, setAlerts] = useState<ClinicalAlertItem[]>([]);
  const [alertSummary, setAlertSummary] = useState<AlertSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Client Detail State ---
  const [selectedClient, setSelectedClient] = useState<ClientSummary | null>(null);
  const [clientSessions, setClientSessions] = useState<ClientSession[]>([]);
  const [clientTrajectory, setClientTrajectory] = useState<TrajectoryPoint[]>([]);
  const [clientLoading, setClientLoading] = useState(false);

  // --- Filters ---
  const [searchQuery, setSearchQuery] = useState("");
  const [alertFilter, setAlertFilter] = useState<string>("all");

  // --- Load Data ---
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [clientsData, alertsData, summaryData] = await Promise.all([
        clinicianApi.getClients(),
        clinicianApi.getAlerts(),
        clinicianApi.getAlertSummary(),
      ]);
      setClients(clientsData);
      setAlerts(alertsData);
      setAlertSummary(summaryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load clinical data");
      console.error("[ClinicalPortal] Load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- Client Detail ---
  const openClientDetail = useCallback(async (client: ClientSummary) => {
    setSelectedClient(client);
    setClientLoading(true);
    try {
      const [sessions, trajectory] = await Promise.all([
        clinicianApi.getClientSessions(client.id),
        clinicianApi.getClientTrajectory(client.id),
      ]);
      setClientSessions(sessions);
      setClientTrajectory(trajectory);
    } catch (err) {
      console.error("[ClinicalPortal] Client detail error:", err);
    } finally {
      setClientLoading(false);
    }
  }, []);

  const closeClientDetail = useCallback(() => {
    setSelectedClient(null);
    setClientSessions([]);
    setClientTrajectory([]);
  }, []);

  // --- Filtered Data ---
  const filteredClients = clients.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (c.full_name?.toLowerCase().includes(q) ?? false) || c.email.toLowerCase().includes(q);
  });

  const filteredAlerts = alerts.filter((a) => {
    if (alertFilter === "all") return true;
    return a.level === alertFilter;
  });

  const criticalAlerts = alerts.filter((a) => a.level === "critical");

  // --- Render ---
  return (
    <div className={`min-h-screen ${theme.colors.background} ${theme.colors.text.primary}`}>
      {/* Header */}
      <header
        className={`sticky top-0 z-50 border-b ${theme.colors.border} bg-black/50 ${theme.effects.backdropBlur}`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className={`text-lg font-bold ${theme.colors.text.primary}`}>Clinical Portal</h1>
              <p className={`text-xs ${theme.colors.text.secondary}`}>
                {user?.full_name || "Clinician"} · {clients.length} client
                {clients.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className={`p-2 rounded-lg border ${theme.colors.border} ${theme.colors.hover} bg-black/10 transition-colors disabled:opacity-50`}
            title="Refresh data"
          >
            <RefreshCw
              className={`w-4 h-4 ${theme.colors.text.secondary} ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-1 -mb-px">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
                  activeTab === tab.id
                    ? `${theme.colors.primary.replace("text-", "border-")} ${theme.colors.primary}`
                    : `border-transparent ${theme.colors.text.muted} ${theme.colors.hover}`
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.id === "alerts" && criticalAlerts.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-bold">
                    {criticalAlerts.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {error && (
          <div className="mb-6 p-4 rounded-lg border border-red-800 bg-red-900/20 text-red-300 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
            <button onClick={loadData} className="ml-auto text-sm underline hover:text-red-200">
              Retry
            </button>
          </div>
        )}

        {loading && !clients.length ? (
          <LoadingSkeleton />
        ) : (
          <>
            {activeTab === "overview" && (
              <OverviewTab
                clients={clients}
                alerts={alerts}
                alertSummary={alertSummary}
                criticalAlerts={criticalAlerts}
                onSwitchTab={setActiveTab}
              />
            )}
            {activeTab === "clients" && !selectedClient && (
              <ClientsTab
                clients={filteredClients}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onSelectClient={openClientDetail}
                alerts={alerts}
              />
            )}
            {activeTab === "clients" && selectedClient && (
              <ClientDetailView
                client={selectedClient}
                sessions={clientSessions}
                trajectory={clientTrajectory}
                loading={clientLoading}
                onClose={closeClientDetail}
                alerts={alerts.filter((a) => {
                  // Find alerts associated with this client's sessions
                  return clientSessions.some((s) => s.id === a.session_id);
                })}
              />
            )}
            {activeTab === "alerts" && (
              <AlertsTab
                alerts={filteredAlerts}
                filterLevel={alertFilter}
                onFilterChange={setAlertFilter}
                allAlerts={alerts}
              />
            )}
            {activeTab === "analytics" && (
              <AnalyticsTab clients={clients} alerts={alerts} alertSummary={alertSummary} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  const theme = useAdminTheme();
  return (
    <div className="grid grid-cols-4 gap-4 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <div key={i} className={`h-28 rounded-xl bg-black/20 border ${theme.colors.border}`} />
      ))}
      <div className={`col-span-4 h-64 rounded-xl bg-black/20 border ${theme.colors.border}`} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 1: Overview
// ---------------------------------------------------------------------------

function OverviewTab({
  clients,
  alerts,
  criticalAlerts,
  alertSummary,
  onSwitchTab,
}: {
  clients: ClientSummary[];
  alerts: ClinicalAlertItem[];
  alertSummary: AlertSummary | null;
  criticalAlerts: ClinicalAlertItem[];
  onSwitchTab: (tab: TabId) => void;
}) {
  const theme = useAdminTheme();
  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-5 h-5 text-teal-400" />}
          label="Total Clients"
          value={clients.length}
          accent="teal"
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
          label="Critical Alerts"
          value={alertSummary?.alerts_by_severity?.critical ?? 0}
          accent="red"
        />
        <StatCard
          icon={<Shield className="w-5 h-5 text-orange-400" />}
          label="Warnings"
          value={alertSummary?.alerts_by_severity?.warning ?? 0}
          accent="orange"
        />
        <StatCard
          icon={<Activity className="w-5 h-5 text-purple-400" />}
          label="Total Alerts"
          value={alertSummary?.total_alerts ?? 0}
          accent="purple"
        />
      </div>

      {/* Priority Section */}
      {criticalAlerts.length > 0 && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-5">
          <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Priority: Critical Alerts ({criticalAlerts.length})
          </h3>
          <div className="space-y-2">
            {criticalAlerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between p-3 rounded-lg bg-red-950/30 border border-red-900/30"
              >
                <div>
                  <p className={`text-sm ${theme.colors.text.primary} font-medium`}>
                    {alert.message}
                  </p>
                  <p className="text-xs text-red-400 mt-0.5">{alert.suggestion}</p>
                </div>
                <span
                  className={`text-xs ${theme.colors.text.muted} font-mono whitespace-nowrap ml-4`}
                >
                  {new Date(alert.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => onSwitchTab("alerts")}
          className={`flex items-center gap-3 p-4 rounded-xl border ${theme.colors.border} hover:border-teal-700 hover:bg-teal-950/20 transition-all group text-left`}
        >
          <div className="w-10 h-10 rounded-lg bg-teal-900/30 flex items-center justify-center group-hover:bg-teal-900/50 transition">
            <AlertTriangle className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <p className={`font-medium ${theme.colors.text.primary} text-sm`}>Review Alerts</p>
            <p className={`text-xs ${theme.colors.text.secondary}`}>
              {alerts.length} alert{alerts.length !== 1 ? "s" : ""} need your attention
            </p>
          </div>
        </button>
        <button
          onClick={() => onSwitchTab("clients")}
          className={`flex items-center gap-3 p-4 rounded-xl border ${theme.colors.border} hover:border-purple-700 hover:bg-purple-950/20 transition-all group text-left`}
        >
          <div className="w-10 h-10 rounded-lg bg-purple-900/30 flex items-center justify-center group-hover:bg-purple-900/50 transition">
            <Users className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <p className={`font-medium ${theme.colors.text.primary} text-sm`}>View Caseload</p>
            <p className={`text-xs ${theme.colors.text.secondary}`}>
              {clients.length} client{clients.length !== 1 ? "s" : ""} in your caseload
            </p>
          </div>
        </button>
      </div>

      {/* Recent Activity Feed */}
      <div className={`rounded-xl border ${theme.colors.border} bg-black/20`}>
        <div className={`px-5 py-4 border-b ${theme.colors.border}`}>
          <h3
            className={`text-sm font-bold ${theme.colors.text.secondary} uppercase tracking-wider flex items-center gap-2`}
          >
            <Clock className="w-4 h-4" />
            Recent Activity
          </h3>
        </div>
        <div className={`divide-y divide-black/20`}>
          {alerts.slice(0, 8).map((alert) => (
            <div key={alert.id} className="px-5 py-3 flex items-center gap-3">
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  alert.level === "critical"
                    ? "bg-red-500"
                    : alert.level === "warning"
                      ? "bg-orange-500"
                      : "bg-yellow-500"
                }`}
              />
              <p className={`text-sm ${theme.colors.text.secondary} flex-1 truncate`}>
                {alert.message}
              </p>
              <span className={`text-xs ${theme.colors.text.muted} font-mono whitespace-nowrap`}>
                {new Date(alert.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
          {alerts.length === 0 && (
            <div className={`px-5 py-8 text-center ${theme.colors.text.muted} text-sm`}>
              No recent activity
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: string;
}) {
  const theme = useAdminTheme();
  return (
    <div className={`rounded-xl border ${theme.colors.border} bg-black/20 p-5`}>
      <div className="flex items-center gap-3 mb-3">
        {icon}
        <span className={`text-xs font-medium ${theme.colors.text.muted} uppercase tracking-wider`}>
          {label}
        </span>
      </div>
      <p className={`text-3xl font-bold ${theme.colors.text.primary}`}>{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 2: Clients
// ---------------------------------------------------------------------------

function ClientsTab({
  clients,
  searchQuery,
  onSearchChange,
  onSelectClient,
}: {
  clients: ClientSummary[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectClient: (client: ClientSummary) => void;
  alerts: ClinicalAlertItem[];
}) {
  const theme = useAdminTheme();
  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search
          className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme.colors.text.muted}`}
        />
        <input
          type="text"
          placeholder="Search clients by name or email..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/20 border ${theme.colors.border} ${theme.colors.text.primary} text-sm placeholder-gray-600 focus:outline-none focus:border-teal-600 transition`}
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className={`w-4 h-4 ${theme.colors.text.muted} ${theme.colors.hover}`} />
          </button>
        )}
      </div>

      {/* Client Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((client) => (
          <button
            key={client.id}
            onClick={() => onSelectClient(client)}
            className="text-left p-5 rounded-xl border border-gray-800 bg-gray-900/50 hover:border-teal-700 hover:bg-teal-950/10 transition-all group"
            aria-label={`View details for ${client.full_name || client.email}`}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-medium ${theme.colors.text.primary} text-sm truncate`}>
                  {client.full_name || "Unknown"}
                </p>
                <p className={`text-xs ${theme.colors.text.secondary} truncate`}>{client.email}</p>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  client.is_active
                    ? "bg-green-900/30 text-green-400"
                    : `bg-black/40 ${theme.colors.text.muted}`
                }`}
              >
                {client.is_active ? "Active" : "Inactive"}
              </span>
            </div>
            <div className={`mt-3 flex items-center gap-4 text-xs ${theme.colors.text.muted}`}>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Joined {new Date(client.created_at).toLocaleDateString()}
              </span>
            </div>
          </button>
        ))}
      </div>

      {clients.length === 0 && (
        <div className={`text-center py-16 ${theme.colors.text.muted}`}>
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            {searchQuery ? "No clients match your search" : "No clients assigned"}
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Client Detail View
// ---------------------------------------------------------------------------

function ClientDetailView({
  client,
  sessions,
  trajectory,
  loading,
  onClose,
  alerts,
}: {
  client: ClientSummary;
  sessions: ClientSession[];
  trajectory: TrajectoryPoint[];
  loading: boolean;
  onClose: () => void;
  alerts: ClinicalAlertItem[];
}) {
  const theme = useAdminTheme();
  const [detailTab, setDetailTab] = useState<"sessions" | "trajectory" | "alerts" | "notes">(
    "sessions"
  );

  // --- Clinical Notes (localStorage-backed until backend model is ready) ---
  const notesKey = `clinical_notes_${client.id}`;
  const [notes, setNotes] = useState(() => localStorage.getItem(notesKey) || "");
  const [notesSaved, setNotesSaved] = useState(false);

  const saveNotes = useCallback(() => {
    localStorage.setItem(notesKey, notes);
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  }, [notes, notesKey]);

  // Check if any session is currently active (no ended_at)
  const activeSession = sessions.find((s) => !s.ended_at);

  // Compute trajectory insights
  const latestEmotion = trajectory.length > 0 ? trajectory[0] : null;
  const avgValence = trajectory.length
    ? trajectory.reduce((sum, t) => sum + (t.valence ?? 0), 0) / trajectory.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Back button + Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onClose}
          className={`p-2 rounded-lg border ${theme.colors.border} ${theme.colors.hover} bg-black/10 transition`}
          aria-label="Back to client list"
        >
          <ChevronLeft className={`w-4 h-4 ${theme.colors.text.secondary}`} />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className={`text-lg font-bold ${theme.colors.text.primary}`}>
              {client.full_name || "Unknown Client"}
            </h2>
            <p className={`text-sm ${theme.colors.text.secondary}`}>{client.email}</p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`rounded-lg border ${theme.colors.border} bg-black/20 p-3 text-center`}>
          <p className={`text-2xl font-bold ${theme.colors.text.primary}`}>{sessions.length}</p>
          <p className={`text-xs ${theme.colors.text.muted}`}>Sessions</p>
        </div>
        <div className={`rounded-lg border ${theme.colors.border} bg-black/20 p-3 text-center`}>
          <p className={`text-2xl font-bold ${theme.colors.text.primary}`}>{trajectory.length}</p>
          <p className={`text-xs ${theme.colors.text.muted}`}>Data Points</p>
        </div>
        <div className={`rounded-lg border ${theme.colors.border} bg-black/20 p-3 text-center`}>
          <p className={`text-2xl font-bold ${theme.colors.text.primary}`}>
            {latestEmotion?.emotion_name || "—"}
          </p>
          <p className={`text-xs ${theme.colors.text.muted}`}>Latest Emotion</p>
        </div>
        <div className={`rounded-lg border ${theme.colors.border} bg-black/20 p-3 text-center`}>
          <p
            className={`text-2xl font-bold ${avgValence >= 0 ? "text-green-400" : "text-red-400"}`}
          >
            {avgValence.toFixed(2)}
          </p>
          <p className={`text-xs ${theme.colors.text.muted}`}>Avg. Valence</p>
        </div>
      </div>

      {/* Detail tabs */}
      <div
        className={`flex gap-1 border-b ${theme.colors.border}`}
        role="tablist"
        aria-label="Client detail tabs"
      >
        {[
          { id: "sessions" as const, label: "Sessions", count: sessions.length },
          { id: "trajectory" as const, label: "Trajectory", count: trajectory.length },
          { id: "alerts" as const, label: "Alerts", count: alerts.length },
          { id: "notes" as const, label: "Notes", count: null },
        ].map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={detailTab === tab.id}
            onClick={() => setDetailTab(tab.id)}
            data-testid={`client-detail-tab-${tab.id}`}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition flex items-center gap-1.5 ${
              detailTab === tab.id
                ? `${theme.colors.primary.replace("text-", "border-")} ${theme.colors.primary}`
                : `border-transparent ${theme.colors.text.muted} ${theme.colors.hover}`
            }`}
          >
            {tab.id === "notes" && <StickyNote className="w-3.5 h-3.5" />}
            {tab.label}
            {tab.count !== null && (
              <span className={`text-xs ${theme.colors.text.muted}`}>({tab.count})</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className={`w-6 h-6 ${theme.colors.text.secondary} animate-spin`} />
        </div>
      ) : (
        <>
          {detailTab === "sessions" && <SessionsList sessions={sessions} />}
          {detailTab === "trajectory" && <TrajectoryView trajectory={trajectory} />}
          {detailTab === "alerts" && (
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <div className={`text-center py-12 ${theme.colors.text.muted}`}>
                  <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No alerts for this client</p>
                </div>
              ) : (
                alerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)
              )}
            </div>
          )}
          {detailTab === "notes" && (
            <ClinicalNotesTab
              notes={notes}
              onNotesChange={setNotes}
              onSave={saveNotes}
              saved={notesSaved}
              clientName={client.full_name || "this client"}
            />
          )}
        </>
      )}

      {/* Emergency Stop — only visible when client has an active session */}
      <EmergencyStop
        clientName={client.full_name || "this client"}
        sessionId={activeSession?.id}
        isSessionActive={!!activeSession}
        onActivate={(sessionId) => {
          console.warn(`[EmergencyStop] Activated for session ${sessionId}`);
          // TODO: POST to backend emergency-stop endpoint + WebSocket
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sessions List
// ---------------------------------------------------------------------------

function SessionsList({ sessions }: { sessions: ClientSession[] }) {
  const theme = useAdminTheme();
  if (sessions.length === 0) {
    return (
      <div className={`text-center py-12 ${theme.colors.text.muted}`}>
        <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No sessions found</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sessions.map((session) => (
        <div
          key={session.id}
          className={`p-4 rounded-lg border ${theme.colors.border} bg-black/20 flex items-center justify-between`}
        >
          <div>
            <p className={`text-sm ${theme.colors.text.primary} font-medium`}>
              Session on {new Date(session.started_at).toLocaleDateString()}
            </p>
            <div className={`flex items-center gap-4 mt-1 text-xs ${theme.colors.text.muted}`}>
              <span>{session.message_count} messages</span>
              <span>
                {session.ended_at
                  ? `Ended ${new Date(session.ended_at).toLocaleTimeString()}`
                  : "In progress"}
              </span>
              <span className="capitalize">Tone: {session.tone_preference}</span>
            </div>
          </div>
          <div className={`text-xs ${theme.colors.text.muted} font-mono`}>
            {session.id.slice(0, 8)}...
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trajectory View
// ---------------------------------------------------------------------------

function TrajectoryView({ trajectory }: { trajectory: TrajectoryPoint[] }) {
  const theme = useAdminTheme();
  if (trajectory.length === 0) {
    return (
      <div className={`text-center py-12 ${theme.colors.text.muted}`}>
        <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No trajectory data yet</p>
      </div>
    );
  }

  // Simple timeline-style trajectory display
  const emotionGroups = new Map<string, number>();
  trajectory.forEach((t) => {
    const cat = t.emotion_category || "Unknown";
    emotionGroups.set(cat, (emotionGroups.get(cat) || 0) + 1);
  });
  const sortedCategories = [...emotionGroups.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      {/* Category distribution */}
      <div className={`rounded-xl border ${theme.colors.border} bg-black/20 p-5`}>
        <h4
          className={`text-sm font-bold ${theme.colors.text.muted} uppercase tracking-wider mb-4`}
        >
          Emotion Category Distribution
        </h4>
        <div className="space-y-2">
          {sortedCategories.slice(0, 8).map(([category, count]) => {
            const pct = (count / trajectory.length) * 100;
            return (
              <div key={category} className="flex items-center gap-3">
                <span className={`text-xs ${theme.colors.text.secondary} w-40 truncate`}>
                  {category}
                </span>
                <div
                  className={`flex-1 h-2 rounded-full ${theme.colors.border.replace("border", "bg")} overflow-hidden`}
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-600 to-cyan-500 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className={`text-xs ${theme.colors.text.muted} w-12 text-right`}>
                  {pct.toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* VAC timeline mini-chart */}
      <div className={`rounded-xl border ${theme.colors.border} bg-black/20 p-5`}>
        <h4
          className={`text-sm font-bold ${theme.colors.text.muted} uppercase tracking-wider mb-4`}
        >
          Recent Emotional States
        </h4>
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {trajectory.slice(0, 20).map((point) => (
            <div
              key={point.id}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg ${theme.colors.hover} transition`}
            >
              <Heart
                className="w-3 h-3 flex-shrink-0"
                style={{
                  color: (point.valence ?? 0) >= 0 ? "#4ade80" : "#f87171",
                }}
              />
              <span className={`text-sm ${theme.colors.text.primary} flex-1 truncate`}>
                {point.emotion_name || "Unknown"}
              </span>
              <span className={`text-xs ${theme.colors.text.muted} font-mono`}>
                V:{(point.valence ?? 0).toFixed(1)} A:{(point.arousal ?? 0).toFixed(1)} C:
                {(point.connection ?? 0).toFixed(1)}
              </span>
              <span className={`text-xs ${theme.colors.text.muted} whitespace-nowrap`}>
                {new Date(point.timestamp).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Clinical Notes Tab
// ---------------------------------------------------------------------------

function ClinicalNotesTab({
  notes,
  onNotesChange,
  onSave,
  saved,
  clientName,
}: {
  notes: string;
  onNotesChange: (value: string) => void;
  onSave: () => void;
  saved: boolean;
  clientName: string;
}) {
  const theme = useAdminTheme();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-teal-400" />
          <h3
            className={`text-sm font-bold ${theme.colors.text.secondary} uppercase tracking-wider`}
          >
            Clinical Notes — {clientName}
          </h3>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-xs text-green-400 flex items-center gap-1 animate-in fade-in">
              <CheckCircle className="w-3 h-3" /> Saved
            </span>
          )}
          <button
            onClick={onSave}
            className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium transition-colors"
          >
            Save Notes
          </button>
        </div>
      </div>

      <textarea
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        placeholder="Add clinical observations, treatment notes, or follow-up actions for this client..."
        className={`w-full h-64 p-4 rounded-xl bg-black/20 border ${theme.colors.border} ${theme.colors.text.primary} text-sm placeholder-gray-600 focus:outline-none focus:border-teal-600 transition resize-y font-mono leading-relaxed`}
        aria-label={`Clinical notes for ${clientName}`}
      />

      <p className={`text-xs ${theme.colors.text.muted} flex items-center gap-1.5`}>
        <StickyNote className="w-3 h-3" />
        Notes are saved locally. They will sync to the server once the clinical notes backend is
        connected.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Alert Card
// ---------------------------------------------------------------------------

function AlertCard({ alert }: { alert: ClinicalAlertItem }) {
  const theme = useAdminTheme();
  const [acknowledged, setAcknowledged] = useState(false);

  const severityStyles = {
    critical: "border-red-800 bg-red-950/20",
    warning: "border-orange-800 bg-orange-950/20",
    attention: "border-yellow-800 bg-yellow-950/20",
    stable: `${theme.colors.border.replace("border-", "")} bg-black/20`,
  };
  const levelColors = {
    critical: "text-red-400 bg-red-900/30",
    warning: "text-orange-400 bg-orange-900/30",
    attention: "text-yellow-400 bg-yellow-900/30",
    stable: `${theme.colors.text.secondary.replace("text-", "")} bg-black/40`,
  };

  const handleAcknowledge = () => {
    setAcknowledged(true);
    // TODO: POST to backend /clinician/alerts/:id/acknowledge when endpoint exists
  };

  return (
    <div
      data-testid={`alert-card-${alert.id}`}
      className={`p-4 rounded-lg border ${severityStyles[alert.level]} ${acknowledged ? "opacity-60" : ""} transition-opacity`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${levelColors[alert.level]}`}
          >
            {alert.level}
          </span>
          {acknowledged && (
            <span className="text-xs text-green-400 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Reviewed
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${theme.colors.text.muted} font-mono`}>
            {new Date(alert.timestamp).toLocaleString()}
          </span>
          {!acknowledged && (
            <button
              onClick={handleAcknowledge}
              className={`text-xs px-2 py-1 rounded border ${theme.colors.border} ${theme.colors.text.secondary} ${theme.colors.hover} transition-colors`}
              title="Mark as reviewed"
            >
              Acknowledge
            </button>
          )}
        </div>
      </div>
      <p className={`text-sm ${theme.colors.text.primary} font-medium`}>{alert.message}</p>
      {alert.suggestion && (
        <p className={`text-xs ${theme.colors.text.secondary} mt-1`}>{alert.suggestion}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 3: Alerts
// ---------------------------------------------------------------------------

function AlertsTab({
  alerts,
  filterLevel,
  onFilterChange,
  allAlerts,
}: {
  alerts: ClinicalAlertItem[];
  filterLevel: string;
  onFilterChange: (level: string) => void;
  allAlerts: ClinicalAlertItem[];
}) {
  const theme = useAdminTheme();
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className={`text-lg font-bold ${theme.colors.text.primary} flex items-center gap-2`}>
          <AlertTriangle className="w-5 h-5 text-red-400" />
          Clinical Risk Alerts
        </h2>
        <div
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 bg-black/20 border ${theme.colors.border}`}
        >
          <Filter className={`w-4 h-4 ${theme.colors.text.muted}`} />
          <select
            value={filterLevel}
            onChange={(e) => onFilterChange(e.target.value)}
            className={`bg-transparent text-sm ${theme.colors.text.primary} outline-none border-none`}
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="attention">Attention</option>
          </select>
        </div>
      </div>

      {/* Severity summary bar */}
      <div className="flex gap-3">
        {(["critical", "warning", "attention"] as const).map((level) => {
          const count = allAlerts.filter((a) => a.level === level).length;
          const colors = {
            critical: "bg-red-900/20 border-red-900/30 text-red-400",
            warning: "bg-orange-900/20 border-orange-900/30 text-orange-400",
            attention: "bg-yellow-900/20 border-yellow-900/30 text-yellow-400",
          };
          return (
            <button
              key={level}
              onClick={() => onFilterChange(filterLevel === level ? "all" : level)}
              className={`flex-1 px-4 py-3 rounded-lg border text-center transition ${
                filterLevel === level
                  ? `${colors[level]} ring-1 ring-white/10`
                  : `${colors[level]} opacity-60 hover:opacity-100`
              }`}
            >
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs uppercase font-medium">{level}</p>
            </button>
          );
        })}
      </div>

      {/* Alert list */}
      <div className="space-y-3">
        {alerts.map((alert) => (
          <AlertCard key={alert.id} alert={alert} />
        ))}
        {alerts.length === 0 && (
          <div className={`text-center py-12 ${theme.colors.text.muted}`}>
            <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No alerts matching your filter</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 4: Analytics
// ---------------------------------------------------------------------------

function AnalyticsTab({
  clients,
  alerts,
  alertSummary,
}: {
  clients: ClientSummary[];
  alerts: ClinicalAlertItem[];
  alertSummary: AlertSummary | null;
}) {
  const theme = useAdminTheme();
  // Compute analytics from available data
  const activeClients = clients.filter((c) => c.is_active).length;
  const inactiveClients = clients.length - activeClients;

  // Alert type distribution
  const alertTypes = new Map<string, number>();
  alerts.forEach((a) => {
    alertTypes.set(a.alert_type, (alertTypes.get(a.alert_type) || 0) + 1);
  });
  const sortedAlertTypes = [...alertTypes.entries()].sort((a, b) => b[1] - a[1]);

  // Weekly alert distribution (last 7 days)
  const [today, setToday] = useState(0);

  useEffect(() => {
    setToday(Date.now()); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  const weeklyAlerts = React.useMemo(() => {
    if (!today) return []; // Wait for hydration
    return Array.from({ length: 7 }, (_, i) => {
      const dayStart = new Date(today - (6 - i) * 86400000);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 86400000);
      const count = alerts.filter((a) => {
        const t = new Date(a.timestamp).getTime();
        return t >= dayStart.getTime() && t < dayEnd.getTime();
      }).length;
      return {
        day: dayStart.toLocaleDateString("en", { weekday: "short" }),
        count,
      };
    });
  }, [alerts, today]);
  const maxDailyAlerts = Math.max(...weeklyAlerts.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Caseload Health */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`rounded-xl border ${theme.colors.border} bg-black/20 p-5`}>
          <h4
            className={`text-xs font-bold ${theme.colors.text.muted} uppercase tracking-wider mb-3`}
          >
            Caseload Status
          </h4>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className={`text-sm ${theme.colors.text.secondary}`}>Active</span>
                <span className={`ml-auto font-bold ${theme.colors.text.primary}`}>
                  {activeClients}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${theme.colors.text.muted.replace("text-", "bg-")}`}
                />
                <span className={`text-sm ${theme.colors.text.secondary}`}>Inactive</span>
                <span className={`ml-auto font-bold ${theme.colors.text.primary}`}>
                  {inactiveClients}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className={`rounded-xl border ${theme.colors.border} bg-black/20 p-5`}>
          <h4
            className={`text-xs font-bold ${theme.colors.text.muted} uppercase tracking-wider mb-3`}
          >
            Alert Severity Breakdown
          </h4>
          <div className="space-y-2">
            {Object.entries(alertSummary?.alerts_by_severity || {}).map(([level, count]) => {
              const colors: Record<string, string> = {
                critical: "bg-red-500",
                warning: "bg-orange-500",
                attention: "bg-yellow-500",
                stable: "bg-gray-600",
              };
              const totalAlerts = alertSummary?.total_alerts || 1;
              return (
                <div key={level} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${colors[level] || "bg-gray-600"}`} />
                  <span className={`text-sm ${theme.colors.text.secondary} capitalize flex-1`}>
                    {level}
                  </span>
                  <span className={`text-xs font-mono ${theme.colors.text.muted}`}>{count}</span>
                  <div className="w-16 h-1.5 rounded-full bg-black/40 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${colors[level] || "bg-gray-600"}`}
                      style={{ width: `${(count / totalAlerts) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`rounded-xl border ${theme.colors.border} bg-black/20 p-5`}>
          <h4
            className={`text-xs font-bold ${theme.colors.text.muted} uppercase tracking-wider mb-3`}
          >
            Alert Types
          </h4>
          <div className="space-y-2">
            {sortedAlertTypes.slice(0, 5).map(([type, count]) => (
              <div key={type} className="flex items-center gap-2">
                <span
                  className={`text-sm ${theme.colors.text.secondary} flex-1 truncate capitalize`}
                >
                  {type.replace(/_/g, " ")}
                </span>
                <span className={`text-xs font-mono ${theme.colors.text.muted}`}>{count}</span>
              </div>
            ))}
            {sortedAlertTypes.length === 0 && (
              <p className={`text-xs ${theme.colors.text.muted}`}>No alert data</p>
            )}
          </div>
        </div>
      </div>

      {/* Weekly Activity Chart */}
      <div className={`rounded-xl border ${theme.colors.border} bg-black/20 p-5`}>
        <h4
          className={`text-xs font-bold ${theme.colors.text.muted} uppercase tracking-wider mb-4`}
        >
          Alerts — Last 7 Days
        </h4>
        <div className="flex items-end gap-2 h-32">
          {weeklyAlerts.map((day) => (
            <div key={day.day} className="flex-1 flex flex-col items-center gap-1">
              <span className={`text-xs ${theme.colors.text.muted} font-mono`}>{day.count}</span>
              <div className="w-full rounded-t-md bg-black/20 relative" style={{ height: "100%" }}>
                <div
                  className="absolute bottom-0 left-0 right-0 rounded-t-md bg-gradient-to-t from-teal-600 to-cyan-500 transition-all"
                  style={{
                    height: `${(day.count / maxDailyAlerts) * 100}%`,
                    minHeight: day.count > 0 ? "4px" : "0",
                  }}
                />
              </div>
              <span className={`text-xs ${theme.colors.text.muted}`}>{day.day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
