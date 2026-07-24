"use client";

/**
 * IntegrationSettings — Connect and manage external data sources.
 *
 * Lists available adapters (iCal, weather, daylight) with connect buttons,
 * shows active integrations with sync status, and provides an iCal file
 * upload dropzone.
 */

import { useEffect, useCallback, useRef, useState } from "react";
import {
  Cloud,
  Sun,
  Calendar,
  Link2,
  Unlink,
  RefreshCw,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useJournalStore } from "@/stores/useJournalStore";
import type { IntegrationAdapter, ActiveIntegration } from "@/types/journal";

/** Icon for adapter categories. */
function AdapterIcon({ category }: { category: string }) {
  switch (category) {
    case "calendar":
      return <Calendar size={16} className="text-blue-400" />;
    case "environment":
      return <Cloud size={16} className="text-amber-400" />;
    default:
      return <Link2 size={16} className="text-white/40" />;
  }
}

/** Status badge for active integrations. */
function SyncStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "success":
      return (
        <span className="flex items-center gap-1 text-[10px] text-green-400">
          <CheckCircle2 size={10} /> Synced
        </span>
      );
    case "error":
      return (
        <span className="flex items-center gap-1 text-[10px] text-red-400">
          <AlertCircle size={10} /> Error
        </span>
      );
    case "connected":
      return (
        <span className="flex items-center gap-1 text-[10px] text-cyan-400">
          <CheckCircle2 size={10} /> Connected
        </span>
      );
    default:
      return (
        <span className="text-[10px] text-white/30">{status}</span>
      );
  }
}

function ActiveIntegrationCard({
  integration,
}: {
  integration: ActiveIntegration;
}) {
  const disconnectIntegration = useJournalStore((s) => s.disconnectIntegration);
  const syncIntegration = useJournalStore((s) => s.syncIntegration);
  const isLoading = useJournalStore((s) => s.isLoading);

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03]
        border border-white/5 hover:border-white/10 transition-all"
    >
      <AdapterIcon category={integration.category || "unknown"} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/80 font-medium truncate">
            {integration.display_name || integration.adapter_id}
          </span>
          <SyncStatusBadge status={integration.sync_status} />
        </div>
        {integration.last_sync_at && (
          <p className="text-[10px] text-white/25 mt-0.5">
            Last sync:{" "}
            {new Date(integration.last_sync_at).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        )}
        {integration.sync_error && (
          <p className="text-[10px] text-red-400/60 mt-0.5 truncate">
            {integration.sync_error}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-1">
        {integration.adapter_id !== "ical_import" && (
          <button
            onClick={() => syncIntegration(integration.adapter_id)}
            disabled={isLoading}
            className="p-1.5 rounded-lg hover:bg-white/5 text-white/30
              hover:text-cyan-400 transition-all"
            title="Sync now"
          >
            <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
          </button>
        )}
        <button
          onClick={() => disconnectIntegration(integration.adapter_id)}
          className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30
            hover:text-red-400 transition-all"
          title="Disconnect"
        >
          <Unlink size={12} />
        </button>
      </div>
    </div>
  );
}

function AvailableAdapterCard({
  adapter,
  isConnected,
}: {
  adapter: IntegrationAdapter;
  isConnected: boolean;
}) {
  const connectIntegration = useJournalStore((s) => s.connectIntegration);
  const [apiKey, setApiKey] = useState("");
  const [showConnect, setShowConnect] = useState(false);

  const handleConnect = async () => {
    if (adapter.auth_type === "api_key" && !apiKey.trim()) return;

    const creds =
      adapter.auth_type === "api_key"
        ? { api_key: apiKey.trim() }
        : {};

    await connectIntegration(adapter.adapter_id, creds);
    setShowConnect(false);
    setApiKey("");
  };

  if (isConnected) return null; // Don't show already-connected adapters

  return (
    <div
      className="p-3 rounded-xl bg-white/[0.02] border border-white/5
        hover:border-white/10 transition-all"
    >
      <div className="flex items-start gap-3">
        <AdapterIcon category={adapter.category} />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm text-white/80 font-medium">
            {adapter.display_name}
          </h4>
          <p className="text-xs text-white/35 mt-0.5 line-clamp-2">
            {adapter.description}
          </p>
        </div>

        {adapter.auth_type === "file" ? (
          <span className="text-[10px] text-white/20 shrink-0">
            File upload
          </span>
        ) : (
          <button
            onClick={() => setShowConnect(!showConnect)}
            className="shrink-0 px-2.5 py-1 rounded-lg text-xs
              bg-cyan-500/10 border border-cyan-500/20 text-cyan-300
              hover:bg-cyan-500/20 transition-all"
          >
            {adapter.auth_type === "none" ? "Enable" : "Connect"}
          </button>
        )}
      </div>

      {/* API key input (for api_key auth) */}
      {showConnect && adapter.auth_type === "api_key" && (
        <div className="mt-2 flex gap-2">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="API Key"
            className="flex-1 px-2 py-1.5 rounded-md bg-white/5 border border-white/10
              text-white placeholder-white/30 text-xs
              focus:outline-none focus:border-cyan-500/50 transition-all"
          />
          <button
            onClick={handleConnect}
            disabled={!apiKey.trim()}
            className="px-3 py-1.5 rounded-md text-xs bg-cyan-500/20
              text-cyan-300 disabled:opacity-30 transition-all"
          >
            Save
          </button>
        </div>
      )}

      {/* Auto-connect for no-auth adapters */}
      {showConnect && adapter.auth_type === "none" && (
        <div className="mt-2">
          <button
            onClick={handleConnect}
            className="w-full py-1.5 rounded-md text-xs bg-cyan-500/20
              text-cyan-300 transition-all"
          >
            Enable {adapter.display_name}
          </button>
        </div>
      )}
    </div>
  );
}

function FileUploadZone() {
  const importFile = useJournalStore((s) => s.importFile);
  const isLoading = useJournalStore((s) => s.isLoading);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith(".ics")) {
        await importFile(file);
      }
    },
    [importFile]
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        await importFile(file);
        e.target.value = ""; // Reset input
      }
    },
    [importFile]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer
        transition-all duration-200
        ${
          isDragging
            ? "border-cyan-500/50 bg-cyan-500/5"
            : "border-white/10 hover:border-white/20 bg-white/[0.01]"
        }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".ics"
        onChange={handleFileSelect}
        className="hidden"
      />
      {isLoading ? (
        <Loader2 size={20} className="mx-auto text-cyan-400 animate-spin" />
      ) : (
        <Upload size={20} className="mx-auto text-white/20" />
      )}
      <p className="text-xs text-white/40 mt-2">
        Drop .ics file or click to browse
      </p>
      <p className="text-[10px] text-white/20 mt-0.5">
        Google Calendar, Apple Calendar, Outlook
      </p>
    </div>
  );
}

export function IntegrationSettings() {
  const activeIntegrations = useJournalStore((s) => s.activeIntegrations);
  const availableAdapters = useJournalStore((s) => s.availableAdapters);
  const fetchAvailableAdapters = useJournalStore(
    (s) => s.fetchAvailableAdapters
  );
  const fetchIntegrations = useJournalStore((s) => s.fetchIntegrations);

  useEffect(() => {
    fetchAvailableAdapters();
    fetchIntegrations();
  }, [fetchAvailableAdapters, fetchIntegrations]);

  const connectedIds = new Set(
    activeIntegrations.map((i) => i.adapter_id)
  );

  return (
    <div className="space-y-4">
      {/* Active integrations */}
      {activeIntegrations.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-white/50 tracking-wider uppercase">
            Active
          </h3>
          {activeIntegrations.map((integration) => (
            <ActiveIntegrationCard
              key={integration.id}
              integration={integration}
            />
          ))}
        </div>
      )}

      {/* File upload */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-white/50 tracking-wider uppercase">
          Import Calendar
        </h3>
        <FileUploadZone />
      </div>

      {/* Available (not yet connected) */}
      {availableAdapters.filter((a) => !connectedIds.has(a.adapter_id) && a.auth_type !== "file").length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-white/50 tracking-wider uppercase">
            Available
          </h3>
          {availableAdapters
            .filter(
              (a) => !connectedIds.has(a.adapter_id) && a.auth_type !== "file"
            )
            .map((adapter) => (
              <AvailableAdapterCard
                key={adapter.adapter_id}
                adapter={adapter}
                isConnected={connectedIds.has(adapter.adapter_id)}
              />
            ))}
        </div>
      )}
    </div>
  );
}
