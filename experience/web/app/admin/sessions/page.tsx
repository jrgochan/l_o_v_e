"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { adminApi } from "@/utils/api";
import { AdminSession } from "@/types/admin";
import { Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSessions() {
      try {
        const response = await adminApi.getSessions();
        setSessions(response.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load sessions");
      } finally {
        setLoading(false);
      }
    }
    fetchSessions();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-red-400 bg-red-900/10 rounded-lg border border-red-500/20">
        Error: {error}
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-400">
            Chat Sessions
          </h1>
          <div className="text-sm text-gray-400">{sessions.length} sessions found</div>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left bg-transparent">
              <thead>
                <tr className="bg-gray-900/80 border-b border-gray-800">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Messages
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Tone
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {format(new Date(session.started_at), "MMM d, yyyy h:mm a")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {session.user ? (
                        <div>
                          <div className="font-medium text-white">
                            {session.user.full_name || session.user.email}
                          </div>
                          <div className="text-xs text-gray-500">{session.user.email}</div>
                        </div>
                      ) : (
                        <span className="text-gray-500 italic">Guest ({session.user_id})</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-300">
                        {session.message_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          session.tone_preference === "warm"
                            ? "bg-amber-900/30 text-amber-300"
                            : "bg-cyan-900/30 text-cyan-300"
                        }`}
                      >
                        {session.tone_preference}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <Link
                        href={`/admin/sessions/${session.id}`}
                        className="text-cyan-400 hover:text-cyan-300 hover:underline font-medium"
                      >
                        View Transcript
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
