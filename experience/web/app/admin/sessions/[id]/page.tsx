"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { adminApi } from "@/utils/api";
import { AdminSession } from "@/types/admin";
import { Loader2, ArrowLeft, Mic, AlertTriangle } from "lucide-react";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";

export default function AdminSessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSession() {
      try {
        const data = await adminApi.getSessionDetails(id);
        setSession(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load session details");
      } finally {
        setLoading(false);
      }
    }
    fetchSession();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/sessions"
          className="flex items-center text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Sessions
        </Link>
        <div className="p-8 text-red-400 bg-red-900/10 rounded-lg border border-red-500/20">
          Error: {error || "Session not found"}
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Link
              href="/admin/sessions"
              className="flex items-center text-sm text-gray-400 hover:text-white transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sessions
            </Link>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              Session Details
              <span className="text-sm font-normal text-gray-500 px-3 py-1 bg-gray-800 rounded-full font-mono">
                {session.id.slice(0, 8)}
              </span>
            </h1>
          </div>
          <div className="text-right text-sm text-gray-400">
            <div>{format(new Date(session.started_at), "MMMM d, yyyy")}</div>
            <div>{format(new Date(session.started_at), "h:mm a")}</div>
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <div className="text-xs text-gray-500 uppercase font-semibold mb-1">User</div>
            {session.user ? (
              <div>
                <div className="font-medium text-white">
                  {session.user.full_name || "Unknown Name"}
                </div>
                <div className="text-sm text-gray-400">{session.user.email}</div>
              </div>
            ) : (
              <div className="text-gray-400 italic">Guest Session</div>
            )}
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Context</div>
            <div className="flex items-center gap-3">
              <div
                className={`px-2 py-1 rounded text-xs font-medium uppercase ${
                  session.tone_preference === "warm"
                    ? "bg-amber-900/30 text-amber-300"
                    : "bg-cyan-900/30 text-cyan-300"
                }`}
              >
                {session.tone_preference} Tone
              </div>
              <div className="text-sm text-gray-400">{session.message_count} messages</div>
            </div>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <div className="text-xs text-gray-500 uppercase font-semibold mb-1">
              Clinical Status
            </div>
            {/* Placeholder for future clinical status/risk level */}
            <div className="text-sm text-green-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              No Alerts
            </div>
          </div>
        </div>

        {/* Transcript */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white border-b border-gray-800 pb-2">
            Transcript
          </h2>

          <div className="space-y-4">
            {session.messages?.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col max-w-3xl ${
                  msg.message_type.startsWith("user") ? "ml-auto items-end" : "mr-auto items-start"
                }`}
              >
                <div
                  className={`rounded-xl p-4 max-w-2xl ${
                    msg.message_type.startsWith("user")
                      ? "bg-cyan-900/20 border border-cyan-800/30 text-cyan-50"
                      : "bg-gray-800/50 border border-gray-700/50 text-gray-100"
                  }`}
                >
                  {/* Content */}
                  <div className="mb-2 whitespace-pre-wrap">
                    {msg.content}
                    {msg.message_type === "user_audio" && (
                      <div className="flex items-center gap-2 text-xs text-cyan-400 mt-1 italic">
                        <Mic className="w-3 h-3" /> Voice Message
                        {msg.transcription && (
                          <div className="not-italic text-gray-300 border-l-2 border-cyan-700 pl-2 ml-1">
                            {msg.transcription}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* AI Analysis Data */}
                  {msg.emotion && (
                    <div className="mt-3 pt-3 border-t border-gray-700/50 text-xs grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-gray-500 uppercase tracking-wider block mb-0.5">
                          Emotion
                        </span>
                        <span className="text-pink-300 font-medium">{msg.emotion.name}</span>
                        <span className="text-gray-500 ml-1">({msg.emotion.category})</span>
                      </div>
                      <div>
                        <span className="text-gray-500 uppercase tracking-wider block mb-0.5">
                          Certainty
                        </span>
                        <span className="text-gray-300">
                          {Math.round((msg.confidence || 0) * 100)}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* AI Insights */}
                  {msg.insights && (
                    <div className="mt-3 pt-2 bg-indigo-900/20 rounded p-2 text-xs border border-indigo-500/20">
                      <span className="text-indigo-300 font-medium block mb-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Insight
                      </span>
                      <span className="text-indigo-100/80 italic">{msg.insights.summary}</span>
                    </div>
                  )}
                </div>

                <div className="text-xs text-gray-600 mt-1 px-1">
                  {format(new Date(msg.timestamp), "h:mm:ss a")}
                </div>
              </div>
            ))}

            {(!session.messages || session.messages.length === 0) && (
              <div className="text-center py-12 text-gray-500 italic">
                No messages recorded in this session.
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
