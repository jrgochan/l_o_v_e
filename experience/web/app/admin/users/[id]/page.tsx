"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { api } from "@/utils/api";
import { User, UserRole } from "@/types/auth";
import { ChatSession, VACHistoryPoint } from "@/types/chat";
import { TrajectoryChart } from "@/components/admin/users/TrajectoryChart";

export default function AdminUserDetailsPage() {
  const { id } = useParams();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [trajectory, setTrajectory] = useState<VACHistoryPoint[]>([]);

  const [activeTab, setActiveTab] = useState<"profile" | "sessions" | "trajectory">("profile");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [role, setRole] = useState<UserRole>(UserRole.USER);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!id) return;

    async function fetchData() {
      setIsLoading(true);
      try {
        // Fetch User
        const userData = await api.get<User>(`/admin/users/${id}`);
        if (!userData) throw new Error("User not found");
        setUser(userData);
        setRole(userData.role);
        setIsActive(userData.is_active);

        // Fetch Sessions
        const sessionsData = await api.get<ChatSession[]>(`/admin/users/${id}/sessions`);
        setSessions(sessionsData);

        // Fetch Trajectory
        const trajectoryData = await api.get<VACHistoryPoint[]>(`/admin/users/${id}/trajectory`);
        setTrajectory(trajectoryData);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Failed to load user data");
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [id]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.put(`/admin/users/${user!.id}`, {
        role,
        is_active: isActive,
      });
      // Refresh user data (or just update local state?)
      const updated = { ...user!, role, is_active: isActive };
      setUser(updated);
      alert("User updated successfully");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert("Failed to update user: " + msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64 text-gray-500">
          Loading user details...
        </div>
      </AdminLayout>
    );
  }

  if (error || !user) {
    return (
      <AdminLayout>
        <div className="p-4 bg-red-900/30 border border-red-800 rounded text-red-200">
          {error ? error : /* istanbul ignore next */ "User not found"}
        </div>
        <button onClick={() => router.back()} className="mt-4 text-cyan-400 hover:text-white">
          ← Back to Users
        </button>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/admin/users"
          className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
        >
          ←
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            {user.full_name || "Unknown User"}
            <span
              className={`text-xs px-2 py-1 rounded border ${user.is_active ? "border-green-800 text-green-400 bg-green-900/20" : "border-red-800 text-red-400 bg-red-900/20"}`}
            >
              {user.is_active ? "Active" : "Inactive"}
            </span>
          </h1>
          <p className="text-gray-400 text-sm">
            {user.email} • ID: {user.id}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 mb-6">
        <button
          onClick={() => setActiveTab("profile")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === "profile" ? "border-cyan-500 text-cyan-400" : "border-transparent text-gray-400 hover:text-white"}`}
        >
          Profile & Access
        </button>
        <button
          onClick={() => setActiveTab("sessions")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === "sessions" ? "border-cyan-500 text-cyan-400" : "border-transparent text-gray-400 hover:text-white"}`}
        >
          Sessions ({sessions.length})
        </button>
        <button
          onClick={() => setActiveTab("trajectory")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === "trajectory" ? "border-cyan-500 text-cyan-400" : "border-transparent text-gray-400 hover:text-white"}`}
        >
          Trajectory Points ({trajectory.length})
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-2xl">
          <h3 className="text-lg font-semibold text-white mb-4">Edit User Access</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="user">User</option>
                <option value="clinician">Clinician</option>
                <option value="admin">Administrator</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Admins have full access. Clinicians can view patient data. Users can only access
                their own data.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setIsActive(!isActive)}
                className={`relative w-12 h-6 rounded-full transition-colors ${isActive ? "bg-green-600" : "bg-gray-700"}`}
                aria-label="Toggle account active"
              >
                <div
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${isActive ? "transform translate-x-6" : ""}`}
                />
              </button>
              <span className="text-sm text-gray-300">Account Active</span>
            </div>

            <div className="pt-4 border-t border-gray-800 flex justify-end">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-medium disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sessions Tab */}
      {activeTab === "sessions" && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-800/50 border-b border-gray-700 text-gray-400 uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Started At</th>
                <th className="px-6 py-3">Duration</th>
                <th className="px-6 py-3">Messages</th>
                <th className="px-6 py-3">Tone</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-gray-300">
              {sessions.map((session) => (
                <tr key={session.id} className="hover:bg-gray-800/30">
                  <td className="px-6 py-3">{new Date(session.started_at).toLocaleString()}</td>
                  <td className="px-6 py-3">
                    {session.ended_at
                      ? Math.round(
                        (new Date(session.ended_at).getTime() -
                          new Date(session.started_at).getTime()) /
                        60000
                      ) + " min"
                      : "Active"}
                  </td>
                  <td className="px-6 py-3">{session.message_count}</td>
                  <td className="px-6 py-3 capitalize">{session.tone_preference}</td>
                  <td className="px-6 py-3 text-right">
                    <span className="text-gray-500 text-xs">View Chat (Coming Soon)</span>
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No sessions recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Trajectory Tab */}
      {activeTab === "trajectory" && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Emotional Trajectory Data</h3>
          <p className="text-gray-400 text-sm mb-6">
            Visualizing emotional state over time (Valence vs Arousal).
          </p>

          {trajectory.length > 0 ? (
            <TrajectoryChart data={trajectory} />
          ) : (
            <div className="text-center py-12 text-gray-500 border border-dashed border-gray-800 rounded-lg">
              No trajectory data available.
            </div>
          )}

          <div className="mt-8">
            <h4 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider">
              Raw Data Sample
            </h4>
            <div className="h-32 overflow-y-auto border border-gray-800 rounded bg-black/50 p-4 font-mono text-xs text-green-400">
              {JSON.stringify(trajectory.slice(0, 10), null, 2)}
              {trajectory.length > 10 && (
                <div className="text-gray-500 mt-2">
                  ... and {trajectory.length - 10} more items
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
