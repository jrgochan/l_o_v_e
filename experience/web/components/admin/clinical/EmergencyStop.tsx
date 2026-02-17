/**
 * Emergency Stop — Safety-critical button for clinician session intervention.
 *
 * A floating action button (FAB) that allows a clinician to immediately pause
 * a client's active session. Requires a confirmation dialog to prevent
 * accidental activation.
 *
 * When activated:
 * 1. Displays a calming overlay to the client in the Zen viewer
 * 2. Logs the event to the audit trail
 * 3. Sends a WebSocket message to pause the session
 */

"use client";

import React, { useCallback, useState } from "react";
import { AlertOctagon, X, ShieldAlert, Phone } from "lucide-react";

interface EmergencyStopProps {
  /** The client's display name (for the confirmation dialog) */
  clientName?: string;
  /** The session ID to pause */
  sessionId?: string;
  /** Whether a session is currently active */
  isSessionActive?: boolean;
  /** Called when the clinician confirms the emergency stop */
  onActivate?: (sessionId: string) => void;
}

export function EmergencyStop({
  clientName = "this client",
  sessionId,
  isSessionActive = false,
  onActivate,
}: EmergencyStopProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isActivated, setIsActivated] = useState(false);

  const handleActivate = useCallback(() => {
    // sessionId check removed as it is guarded by render logic below
    setIsActivated(true);
    setShowConfirm(false);
    onActivate?.(sessionId!);
    // Auto-reset after 30 seconds
    setTimeout(() => setIsActivated(false), 30000);
  }, [sessionId, onActivate]);

  // Don't show if no active session
  if (!isSessionActive || !sessionId) return null;

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setShowConfirm(true)}
        disabled={isActivated}
        className={`
          fixed bottom-8 right-8 z-[100]
          w-16 h-16 rounded-full
          flex items-center justify-center
          shadow-2xl
          transition-all duration-300
          ${
            isActivated
              ? "bg-gray-700 cursor-not-allowed opacity-60"
              : "bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 hover:scale-110 hover:shadow-red-900/50"
          }
          active:scale-95
          group
        `}
        title="Emergency Stop — Pause active session"
      >
        {isActivated ? (
          <ShieldAlert className="w-7 h-7 text-gray-400" />
        ) : (
          <>
            <AlertOctagon className="w-7 h-7 text-white" />
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-full animate-ping bg-red-500 opacity-20" />
          </>
        )}
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-red-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-red-950 to-red-900/50 border-b border-red-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                    <AlertOctagon className="w-5 h-5 text-red-400" />
                  </div>
                  <h2 className="text-lg font-bold text-white">Emergency Session Pause</h2>
                </div>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="p-1 rounded-lg hover:bg-red-800/50 transition"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-300">
                This will immediately pause the active session for{" "}
                <strong className="text-white">{clientName}</strong>. The client will see a
                supportive message:
              </p>
              <div className="p-4 rounded-lg bg-teal-950/30 border border-teal-800/30 text-sm text-teal-200 italic">
                &quot;Your clinician has paused this session. Please take a moment to breathe. You
                are safe, and they will reach out to you shortly.&quot;
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-950/20 border border-yellow-800/30">
                <Phone className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                <p className="text-xs text-yellow-300">
                  Consider following up with a direct call if the client appears distressed.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleActivate}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white transition text-sm font-bold flex items-center justify-center gap-2"
              >
                <AlertOctagon className="w-4 h-4" />
                Activate Emergency Stop
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
