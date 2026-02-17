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

type ProfileTab = "profile" | "security" | "privacy" | "history";

export default function UserProfilePage() {
  const { user, isLoading: isAuthLoading, updateProfile, changePassword, deleteAccount, exportData, error } = useAuthStore();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [activeTab, setActiveTab] = useState<ProfileTab>("profile");

  // Profile edit state
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Export state
  const [isExporting, setIsExporting] = useState(false);

interface Consent {
  key: string;
  name: string;
  version: string;
  granted_at: string;
}

  // Consent state
  const [consents, setConsents] = useState<Consent[]>([]);
  const [loadingConsents, setLoadingConsents] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/");
    }
  }, [user, isAuthLoading, router]);

  useEffect(() => {
    if (user) {
      setEditName(user.full_name || "");
      setEditEmail(user.email);
    }
  }, [user]);

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

  useEffect(() => {
    if (activeTab === "privacy") {
      setLoadingConsents(true);
      api.get<{ granted: Consent[] }>("/consent/me")
        .then(data => setConsents(data.granted || []))
        .catch(console.error)
        .finally(() => setLoadingConsents(false));
    }
  }, [activeTab]);

  const handleProfileSave = async () => {
    try {
      setProfileSaved(false);
      await updateProfile({
        full_name: editName || undefined,
        email: editEmail !== user?.email ? editEmail : undefined,
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch {
      // Error shown by store
    }
  };

  const handlePasswordChange = async () => {
    setPasswordError("");
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    try {
      setPasswordChanged(false);
      await changePassword(currentPassword, newPassword);
      setPasswordChanged(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordChanged(false), 3000);
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : "Failed to change password");
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount();
      router.push("/");
    } catch {
      // Error shown by store
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      await exportData();
    } catch {
      // Error shown by store
    } finally {
      setIsExporting(false);
    }
  };

  if (isAuthLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  const tabs: { key: ProfileTab; label: string; icon: string }[] = [
    { key: "profile", label: "Profile", icon: "👤" },
    { key: "security", label: "Security", icon: "🔒" },
    { key: "privacy", label: "Privacy", icon: "🛡️" },
    { key: "history", label: "Sessions", icon: "💬" },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white selection:bg-cyan-900 selection:text-white">
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
        <div className="flex items-center gap-6 mb-8">
          <div className="w-20 h-20 rounded-full bg-cyan-900/30 border-2 border-cyan-500/50 flex items-center justify-center text-3xl font-bold text-cyan-200 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
            {user.full_name ? user.full_name[0].toUpperCase() : user.email[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              {user.full_name || "Your Profile"}
            </h1>
            <p className="text-gray-400 text-sm font-light">{user.email}</p>
            <div className="mt-2 flex gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-300 border border-gray-700 capitalize">
                {user.role}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-400 border border-green-800/50">
                {user.is_active ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-gray-900/50 border border-gray-800 rounded-xl p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-gray-800 text-white shadow-sm border border-gray-700"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/50"
              }`}
            >
              <span className="mr-1.5">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-800/50 rounded-xl text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="bg-gray-900/30 border border-gray-800/50 rounded-2xl p-8 backdrop-blur-md">
              <h2 className="text-xl font-bold text-white mb-6">Edit Profile</h2>
              <div className="space-y-5 max-w-md">
                <div>
                  <label htmlFor="editName" className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                    Full Name
                  </label>
                  <input
                    id="editName"
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-sm transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="editEmail" className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                    Email Address
                  </label>
                  <input
                    id="editEmail"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-sm transition-colors"
                  />
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleProfileSave}
                    disabled={isAuthLoading}
                    className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {isAuthLoading ? "Saving..." : "Save Changes"}
                  </button>
                  {profileSaved && (
                    <span className="text-green-400 text-sm animate-fade-in">✓ Profile updated</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <div className="bg-gray-900/30 border border-gray-800/50 rounded-2xl p-8 backdrop-blur-md">
              <h2 className="text-xl font-bold text-white mb-2">Change Password</h2>
              <p className="text-gray-400 text-sm mb-6">
                Password must be at least 8 characters with uppercase, lowercase, digit, and special character.
              </p>
              <div className="space-y-4 max-w-md">
                <div>
                  <label htmlFor="currentPassword" className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                    Current Password
                  </label>
                  <input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-sm transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="newPassword" className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-sm transition-colors"
                    minLength={8}
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-sm transition-colors"
                    minLength={8}
                  />
                </div>
                {passwordError && (
                  <div className="p-3 bg-red-900/20 border border-red-800/50 rounded-lg text-red-300 text-sm">
                    {passwordError}
                  </div>
                )}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handlePasswordChange}
                    disabled={isAuthLoading || !currentPassword || !newPassword || !confirmPassword}
                    className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {isAuthLoading ? "Changing..." : "Change Password"}
                  </button>
                  {passwordChanged && (
                    <span className="text-green-400 text-sm animate-fade-in">✓ Password changed</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Privacy Tab */}
          {activeTab === "privacy" && (
            <div className="space-y-6">
              {/* Consents Management */}
              <div className="bg-gray-900/30 border border-gray-800/50 rounded-2xl p-8 backdrop-blur-md">
                <h2 className="text-xl font-bold text-white mb-2">My Consents</h2>
                <p className="text-gray-400 text-sm mb-6">
                  Review the policies you have agreed to. Revoking required consents may restrict access to the application.
                </p>

                {loadingConsents ? (
                  <div className="text-sm text-gray-500">Loading consents...</div>
                ) : consents.length === 0 ? (
                  <div className="text-sm text-gray-500">No active consents found.</div>
                ) : (
                  <div className="space-y-3">
                    {consents.map((c) => (
                       <div key={c.key} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
                         <div>
                           <div className="font-medium text-white text-sm">{c.name}</div>
                           <div className="text-xs text-gray-500">v{c.version} • Granted: {new Date(c.granted_at).toLocaleDateString()}</div>
                         </div>
                         <div className="text-xs px-2 py-1 rounded bg-green-900/30 text-green-400 border border-green-800/30">
                           Active
                         </div>
                       </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Data Export */}
              <div className="bg-gray-900/30 border border-gray-800/50 rounded-2xl p-8 backdrop-blur-md">
                <h2 className="text-xl font-bold text-white mb-2">Export Your Data</h2>
                <p className="text-gray-400 text-sm mb-6">
                  Download all your data as a JSON file — profile, chat sessions, messages,
                  emotional trajectory, and clinical alerts.
                </p>
                <button
                  onClick={handleExportData}
                  disabled={isExporting}
                  className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors border border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {isExporting ? "Preparing download..." : "📦 Export My Data"}
                </button>
              </div>

              {/* Danger Zone */}
              <div className="bg-red-950/20 border border-red-900/40 rounded-2xl p-8">
                <h2 className="text-xl font-bold text-red-400 mb-2">Danger Zone</h2>
                <p className="text-gray-400 text-sm mb-6">
                  Deleting your account will deactivate it immediately. Your data will be retained
                  for a limited period before permanent deletion. This action can be reversed by
                  contacting an administrator within the retention window.
                </p>
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-6 py-2.5 bg-red-900/30 hover:bg-red-900/50 text-red-300 font-medium rounded-lg transition-colors border border-red-800/50 text-sm"
                  >
                    🗑️ Delete My Account
                  </button>
                ) : (
                  <div className="space-y-4 max-w-md">
                    <p className="text-red-300 text-sm font-medium">
                      Type <span className="font-mono bg-red-900/30 px-1.5 py-0.5 rounded">DELETE</span> to confirm:
                    </p>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="Type DELETE to confirm"
                      className="w-full bg-gray-900 border border-red-800/50 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 text-sm"
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmText !== "DELETE" || isAuthLoading}
                        className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {isAuthLoading ? "Deleting..." : "Permanently Delete"}
                      </button>
                      <button
                        onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); }}
                        className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg transition-colors text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sessions History Tab */}
          {activeTab === "history" && (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 backdrop-blur-sm">
                  <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">
                    Total Sessions
                  </div>
                  <div className="text-2xl font-bold text-white">{sessions.length}</div>
                </div>
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 backdrop-blur-sm">
                  <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">
                    Total Messages
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {sessions.reduce((acc, sess) => acc + (sess.message_count || 0), 0)}
                  </div>
                </div>
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 backdrop-blur-sm">
                  <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">
                    Member Since
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {new Date(user.created_at).getFullYear()}
                  </div>
                </div>
              </div>

              {/* Sessions List */}
              <div className="bg-gray-900/30 border border-gray-800/50 rounded-2xl overflow-hidden backdrop-blur-md">
                <div className="px-8 py-5 border-b border-gray-800">
                  <h2 className="text-lg font-bold text-white">Session History</h2>
                </div>

                {isLoadingSessions ? (
                  <div className="p-12 text-center text-gray-500">Loading history...</div>
                ) : sessions.length === 0 ? (
                  <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                    <p className="mb-4">No sessions found.</p>
                    <Link
                      href="/"
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors text-sm"
                    >
                      Start a Chat
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-800/50">
                    {sessions.map((session) => (
                      <div key={session.id} className="px-8 py-5 hover:bg-gray-800/20 transition-colors">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <div className="text-sm font-medium text-white">
                                {new Date(session.started_at).toLocaleDateString(undefined, {
                                  weekday: "long",
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })}
                              </div>
                              <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700 capitalize">
                                {session.tone_preference}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-4">
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
                              <span>💬 {session.message_count || 0} messages</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
