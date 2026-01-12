/**
 * Zen Session Indicator
 *
 * Shows connection status for the Zen Experience viewer,
 * indicating when it's receiving updates from the admin/atlas page.
 */

"use client";

import { useState, useEffect } from "react";

interface Props {
  lastSync: number;
  visible: boolean;
}

export function ZenSessionIndicator({ lastSync, visible }: Props) {
  const [timeSinceSync, setTimeSinceSync] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastSync;
      setTimeSinceSync(Math.floor(elapsed / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [lastSync]);

  if (!visible) return null;

  const isStale = timeSinceSync > 10;
  const isWaiting = timeSinceSync > 30;

  return (
    <div
      className={`
        absolute top-4 left-4 
        px-3 py-1.5 rounded-full text-xs font-medium
        backdrop-blur-md transition-all duration-300
        ${
          isWaiting
            ? "bg-gray-500/30 border border-gray-400 text-gray-200"
            : isStale
              ? "bg-orange-500/30 border border-orange-400 text-orange-200"
              : "bg-cyan-500/20 border border-cyan-400 text-cyan-200"
        }
      `}
      style={{ zIndex: 100 }}
    >
      <div className="flex items-center gap-2">
        {/* Status Dot */}
        <div
          className={`w-2 h-2 rounded-full ${
            isWaiting
              ? "bg-gray-400"
              : isStale
                ? "bg-orange-400 animate-pulse"
                : "bg-cyan-400 animate-pulse"
          }`}
        />

        {/* Status Text */}
        <span>
          {isWaiting
            ? "Waiting for Admin Session..."
            : timeSinceSync === 0
              ? "Following Admin Session"
              : isStale
                ? `No updates for ${timeSinceSync}s`
                : `Updated ${timeSinceSync}s ago`}
        </span>
      </div>
    </div>
  );
}
