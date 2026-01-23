"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import { AuthModal } from "@/components/auth/AuthModal";
import { Settings } from "@/components/Settings";
import { UserRole } from "@/types/auth";

import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

interface HeaderProps {
  showAuth?: boolean;
}

export function Header({ showAuth = true }: HeaderProps) {
  const { user, logout } = useAuthStore();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const theme = useAdminTheme();

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
            className={`flex items-center gap-2 px-3 py-2 border rounded-full transition-colors backdrop-blur-sm group ${theme.colors.border} ${theme.colors.background}`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border ${theme.colors.primary} ${theme.colors.border}`}
            >
              {user.full_name ? user.full_name[0].toUpperCase() : user.email[0].toUpperCase()}
            </div>
            <span
              className={`text-sm max-w-[100px] truncate hidden sm:block ${theme.colors.text.secondary} group-hover:${theme.colors.text.primary}`}
            >
              {user.full_name || user.email.split("@")[0]}
            </span>
          </button>

          {isProfileOpen && (
            <div
              className={`absolute right-0 mt-2 w-48 border rounded-lg shadow-xl overflow-hidden py-1 ${theme.colors.background} ${theme.colors.border}`}
            >
              <div className={`px-4 py-2 border-b ${theme.colors.border}`}>
                <p className={`text-xs ${theme.colors.text.muted}`}>Signed in as</p>
                <p className={`text-sm truncate ${theme.colors.text.primary}`}>{user.email}</p>
              </div>



              <Link
                href="/users/profile"
                className={`block px-4 py-2 text-sm hover:bg-white/10 ${theme.colors.text.secondary} hover:${theme.colors.text.primary}`}
                onClick={() => setIsProfileOpen(false)}
              >
                👤 Profile
              </Link>

              <button
                onClick={() => {
                  logout();
                  setIsProfileOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/10 hover:text-red-300"
              >
                🚪 Sign out
              </button>
            </div>
          )}
        </div>
      ) : showAuth ? (
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className={`px-4 py-2 text-sm font-medium rounded-full shadow-lg backdrop-blur-sm transition-all ${theme.colors.primary} ${theme.effects.glass}`}
        >
          Sign In
        </button>
      ) : null}

      {user?.role === UserRole.ADMIN && (
        <Link
          href="/admin/visualization"
          className={`hidden md:flex items-center gap-2 px-4 h-10 border rounded-full backdrop-blur-sm transition-colors ${theme.colors.background} ${theme.colors.border} hover:bg-white/10`}
        >
          <span className="text-lg">⚡</span>
          <span className={`text-sm font-medium ${theme.colors.text.primary}`}>Admin Panel</span>
        </Link>
      )}

      {/* Settings Component (existing) - styled as icon button */}
      <div
        className={`border rounded-full backdrop-blur-sm flex items-center justify-center w-10 h-10 transition-colors ${theme.colors.background} ${theme.colors.border} hover:bg-white/10`}
      >
        <Settings />
      </div>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}
