import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User, LoginResponse } from "../types/auth";
import { api } from "../utils/api";
import { API_URL } from "@/config/environment";

// Singleton promise to deduplicate concurrent refresh attempts
let _refreshPromise: Promise<boolean> | null = null;

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  consentRequired: boolean;
  outstandingPolicies: Array<{ key: string; title: string; description: string; required: boolean; version: string }>;

  setToken: (token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;

  // Async actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string, consents?: string[]) => Promise<void>;
  fetchUser: () => Promise<void>;
  refreshToken: () => Promise<boolean>;

  // Self-service account management
  updateProfile: (data: { full_name?: string; email?: string }) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  exportData: () => Promise<void>;

  // Selectors
  isAuthenticated: () => boolean;
  hasRole: (role: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,

      isLoading: false,
      error: null,
      consentRequired: false,
      outstandingPolicies: [],

      setToken: (token: string) => set({ token }),
      setUser: (user: User) => set({ user }),

      logout: () => {
        set({ user: null, token: null, error: null });
        // Optional: clear other stores or redirect
      },

      login: async (username, password) => {
        set({ isLoading: true, error: null });
        try {
          // FormData login for OAuth2 compatibility
          const formData = new URLSearchParams();
          formData.append("username", username);
          formData.append("password", password);

          const response = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData,
          });

          if (!response.ok) {
            throw new Error("Login failed");
          }

          const data: LoginResponse = await response.json();
          set({
            token: data.access_token,
            consentRequired: !!data.consent_required,
            outstandingPolicies: data.outstanding_policies || []
          });

          // Fetch user details immediately after login
          await get().fetchUser();
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Login failed";
          set({ error: message });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (email, password, fullName, consents = []) => {
        set({ isLoading: true, error: null });
        try {
          await api.post(
            "/auth/register",
            {
              email,
              password,
              full_name: fullName,
              role: "user", // Default role for self-registration
              is_active: true,
              consents: consents,
            },
            false
          ); // false = unauthenticated request

          // Auto-login after register? Or just redirect?
          // Let's auto-login for better UX
          await get().login(email, password);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Registration failed";
          set({ error: message });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      fetchUser: async () => {
        // Don't fetch if no token
        if (!get().token) return;

        set({ isLoading: true });
        try {
          const user = await api.get<User>("/users/me");
          set({ user });
        } catch (error) {
          console.error("Failed to fetch user profile", error);
          // If fetch fails (e.g. 401), api wrapper might call logout,
          // but we can also handle it here.
          // But let's leave it to api wrapper's 401 handling or specific UI error.
        } finally {
          set({ isLoading: false });
        }
      },

      isAuthenticated: () => !!get().token,

      refreshToken: async () => {
        const token = get().token;
        if (!token) return false;

        // Deduplicate concurrent refresh attempts
        if (_refreshPromise) return _refreshPromise;

        _refreshPromise = (async () => {
          try {
            const response = await fetch(`${API_URL}/auth/refresh`, {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
              get().logout();
              return false;
            }

            const data: LoginResponse = await response.json();
            set({ token: data.access_token });

            // Notify other hooks (e.g. WebSocket) that the token changed
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("token-refreshed"));
            }

            return true;
          } catch {
            get().logout();
            return false;
          } finally {
            _refreshPromise = null;
          }
        })();

        return _refreshPromise;
      },

      hasRole: (role: string) => {
        const user = get().user;
        return !!user && user.role === role;
      },

      // === Self-Service Account Management ===

      updateProfile: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const updatedUser = await api.put<User>("/users/me", data);
          set({ user: updatedUser });
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Failed to update profile";
          set({ error: message });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      changePassword: async (currentPassword, newPassword) => {
        set({ isLoading: true, error: null });
        try {
          await api.put("/users/me/password", {
            current_password: currentPassword,
            new_password: newPassword,
          });
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Failed to change password";
          set({ error: message });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      deleteAccount: async () => {
        set({ isLoading: true, error: null });
        try {
          await api.del("/users/me");
          // After deletion, log the user out
          get().logout();
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Failed to delete account";
          set({ error: message });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      exportData: async () => {
        set({ isLoading: true, error: null });
        try {
          const data = await api.get<Record<string, unknown>>("/users/me/export");
          // Trigger browser download of the JSON data
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `love-data-export-${new Date().toISOString().split("T")[0]}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Failed to export data";
          set({ error: message });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        consentRequired: state.consentRequired,
        outstandingPolicies: state.outstandingPolicies
      }), // Persist token, user, and consent status
    }
  )
);
