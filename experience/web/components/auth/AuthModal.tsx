"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthMode = "login" | "register";

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [consents, setConsents] = useState<string[]>([]);

  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, fullName, consents);
      }
      onClose();
    } catch {
      // Error is handled in store and displayed via error state
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-md p-6 shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">
            {mode === "login" ? "Welcome Back" : "Create Account"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close">
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex mb-6 bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setMode("login")}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
              mode === "login" ? "bg-gray-700 text-white shadow" : "text-gray-400 hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode("register")}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
              mode === "register"
                ? "bg-gray-700 text-white shadow"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-gray-400 mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
              required
            />
          </div>

          {mode === "register" && (
            <div>
              <label htmlFor="fullName" className="block text-xs font-medium text-gray-400 mb-1">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                required
              />
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-xs font-medium text-gray-400 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
              required
              minLength={8}
            />
          </div>

          {mode === "register" && (
            <div className="space-y-3 pt-2">
              <div className="flex items-start">
                <input
                  id="consent-tos"
                  type="checkbox"
                  checked={consents.includes("terms_of_service")}
                  onChange={() => {
                    const key = "terms_of_service";
                    setConsents((prev) =>
                      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
                    );
                  }}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                />
                <label htmlFor="consent-tos" className="ml-2 text-xs text-gray-400">
                  I agree to the{" "}
                  <a href="#" className="text-cyan-400 hover:underline">
                    Terms of Service
                  </a>
                </label>
              </div>
              <div className="flex items-start">
                <input
                  id="consent-privacy"
                  type="checkbox"
                  checked={consents.includes("privacy_policy")}
                  onChange={() => {
                    const key = "privacy_policy";
                    setConsents((prev) =>
                      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
                    );
                  }}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                />
                <label htmlFor="consent-privacy" className="ml-2 text-xs text-gray-400">
                  I agree to the{" "}
                  <a href="#" className="text-cyan-400 hover:underline">
                    Privacy Policy
                  </a>
                </label>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={
              isLoading ||
              (mode === "register" &&
                (!consents.includes("terms_of_service") || !consents.includes("privacy_policy")))
            }
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-2 rounded transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Loading..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
