"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/utils/api";
import { Header } from "@/components/layout/Header";

interface Session {
  id: string;
  started_at: string;
  ended_at?: string;
  tone_preference: string;
  message_count: number;
}

export default function UserProfilePage() {
  const { user, isLoading: isAuthLoading } = useAuthStore();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);

  useEffect(() => {
    // Redirect if not logged in
    if (!isAuthLoading && !user) {
      router.push("/");
    }
  }, [user, isAuthLoading, router]);

  useEffect(() => {
    if (!user) return;

    async function fetchSessions() {
      try {
        const data = await api.get<Session[]>("/users/me/sessions");
        setSessions(data);
      } catch (err: unknown) {
        console.error("Failed to load sessions:", err);
      } finally {
        setIsLoadingSessions(false);
      }
    }

    fetchSessions();
  }, [user]);

  if (isAuthLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white selection:bg-cyan-900 selection:text-white">
      {/* Shared Header */}
      <Header />

      <main className="max-w-4xl mx-auto px-6 py-24">
        {/* Back Navigation */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-gray-400 hover:text-cyan-400 flex items-center gap-2 transition-colors text-sm font-medium"
          >
            ← Back to Experience
          </Link>
        </div>

        {/* Profile Header */}
        <div className="flex items-center gap-6 mb-12">
          <div className="w-24 h-24 rounded-full bg-cyan-900/30 border-2 border-cyan-500/50 flex items-center justify-center text-3xl font-bold text-cyan-200 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
            {user.full_name ? user.full_name[0].toUpperCase() : user.email[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
              {user.full_name || "User Profile"}
            </h1>
            <p className="text-gray-400 text-lg font-light">{user.email}</p>
            <div className="mt-3 flex gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-300 border border-gray-700 capitalize">
                {user.role} Account
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-400 border border-green-800/50">
                {user.is_active ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm">
            <div className="text-sm text-gray-500 uppercase tracking-wider font-semibold mb-1">
              Total Sessions
            </div>
            <div className="text-3xl font-bold text-white">{sessions.length}</div>
          </div>
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm">
            <div className="text-sm text-gray-500 uppercase tracking-wider font-semibold mb-1">
              Total Messages
            </div>
            <div className="text-3xl font-bold text-white">
              {sessions.reduce((acc, sess) => acc + (sess.message_count || 0), 0)}
            </div>
          </div>
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm">
            <div className="text-sm text-gray-500 uppercase tracking-wider font-semibold mb-1">
              Member Since
            </div>
            <div className="text-3xl font-bold text-white">
              {new Date(user.created_at).getFullYear()}
            </div>
          </div>
        </div>

        {/* Sessions History */}
        <div className="bg-gray-900/30 border border-gray-800/50 rounded-2xl overflow-hidden backdrop-blur-md">
          <div className="px-8 py-6 border-b border-gray-800 flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">Session History</h2>
          </div>

          {isLoadingSessions ? (
            <div className="p-12 text-center text-gray-500">Loading history...</div>
          ) : sessions.length === 0 ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center">
              <p className="mb-4">No sessions found.</p>
              <Link
                href="/"
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
              >
                Start a Chat
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {sessions.map((session) => (
                <div key={session.id} className="p-6 hover:bg-gray-800/30 transition-colors group">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <div className="text-lg font-medium text-white">
                          {new Date(session.started_at).toLocaleDateString(undefined, {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700 capitalize">
                          {session.tone_preference} Mode
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-4">
                        <span>
                          🕒{" "}
                          {new Date(session.started_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span>
                          ⏱️{" "}
                          {session.ended_at
                            ? Math.ceil(
                                (new Date(session.ended_at).getTime() -
                                  new Date(session.started_at).getTime()) /
                                  60000
                              ) + " min"
                            : "Ongoing"}
                        </span>
                        <span>💬 {session.message_count} messages</span>
                      </div>
                    </div>

                    {/* Placeholder for View Chat */}
                    {/* 
                                <button className="opacity-0 group-hover:opacity-100 px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 text-white rounded transition-all">
                                    View Chat
                                </button>
                                */}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
