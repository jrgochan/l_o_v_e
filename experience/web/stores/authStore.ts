import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User, LoginResponse } from "../types/auth";
import { api } from "../utils/api";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;

  setToken: (token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;

  // Async actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  fetchUser: () => Promise<void>;

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

          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/auth/login`,
            {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: formData,
            }
          );

          if (!response.ok) {
            throw new Error("Login failed");
          }

          const data: LoginResponse = await response.json();
          set({ token: data.access_token });

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

      register: async (email, password, fullName) => {
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

      hasRole: (role: string) => {
        const user = get().user;
        return !!user && user.role === role;
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ token: state.token, user: state.user }), // Persist token and user
    }
  )
);
