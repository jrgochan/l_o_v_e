"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import { AuthModal } from "@/components/auth/AuthModal";
import { Settings } from "@/components/Settings";
import { UserRole } from "@/types/auth";

interface HeaderProps {
  showAuth?: boolean;
}

export function Header({ showAuth = true }: HeaderProps) {
  const { user, logout } = useAuthStore();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
      {user ? (
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-900/80 hover:bg-gray-800 border border-gray-700/50 rounded-full transition-colors backdrop-blur-sm group"
          >
            <div className="w-6 h-6 rounded-full bg-cyan-900 flex items-center justify-center text-xs text-cyan-200 border border-cyan-700">
              {user.full_name ? user.full_name[0].toUpperCase() : user.email[0].toUpperCase()}
            </div>
            <span className="text-sm text-gray-300 group-hover:text-white max-w-[100px] truncate hidden sm:block">
              {user.full_name || user.email.split("@")[0]}
            </span>
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden py-1">
              <div className="px-4 py-2 border-b border-gray-800">
                <p className="text-xs text-gray-500">Signed in as</p>
                <p className="text-sm text-white truncate">{user.email}</p>
              </div>

              {user.role === UserRole.ADMIN && (
                <Link
                  href="/admin/users"
                  className="block px-4 py-2 text-sm text-cyan-400 hover:bg-gray-800 hover:text-cyan-300"
                  onClick={() => setIsProfileOpen(false)}
                >
                  ⚡ Admin Dashboard
                </Link>
              )}

              <Link
                href="/users/profile"
                className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                onClick={() => setIsProfileOpen(false)}
              >
                👤 Profile
              </Link>

              <button
                onClick={() => {
                  logout();
                  setIsProfileOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-800 hover:text-red-300"
              >
                🚪 Sign out
              </button>
            </div>
          )}
        </div>
      ) : showAuth ? (
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className="px-4 py-2 bg-cyan-600/90 hover:bg-cyan-500 text-white text-sm font-medium rounded-full shadow-lg backdrop-blur-sm transition-all"
        >
          Sign In
        </button>
      ) : null}

      {/* Settings Component (existing) - styled as icon button */}
      <div className="bg-gray-900/80 hover:bg-gray-800 border border-gray-700/50 rounded-full backdrop-blur-sm flex items-center justify-center w-10 h-10 transition-colors">
        <Settings />
      </div>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}
