import { renderHook, act } from "@testing-library/react";
import { useAuthStore } from "../../stores/authStore";
import { api } from "../../utils/api";

// Mock dependencies
jest.mock("../../utils/api", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

// Mock fetch for login
global.fetch = jest.fn();

describe("useAuthStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state
    useAuthStore.setState({
      user: null,
      token: null,
      isLoading: false,
      error: null,
    });
  });

  it("should initialize with default state", () => {
    const { result } = renderHook(() => useAuthStore());
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  describe("login", () => {
    it("should handle successful login", async () => {
      const { result } = renderHook(() => useAuthStore());

      // Mock fetch response for login
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "test-token" }),
      });

      // Mock api.get response for fetchUser
      (api.get as jest.Mock).mockResolvedValueOnce({ id: "1", email: "test@example.com" });

      await act(async () => {
        await result.current.login("test@example.com", "password");
      });

      expect(result.current.token).toBe("test-token");
      expect(result.current.user).toEqual({ id: "1", email: "test@example.com" });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should handle login failure", async () => {
      const { result } = renderHook(() => useAuthStore());

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: "Unauthorized",
      });

      await act(async () => {
        try {
          await result.current.login("test@example.com", "wrong-password");
        } catch (e) {
          // Expected error
        }
      });

      expect(result.current.token).toBeNull();
      expect(result.current.error).toBe("Login failed");
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("register", () => {
    it("should handle successful registration and auto-login", async () => {
      const { result } = renderHook(() => useAuthStore());

      // Mock api.post for register
      (api.post as jest.Mock).mockResolvedValueOnce({});

      // Mock fetch for auto-login
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "test-token" }),
      });

      // Mock api.get for fetchUser
      (api.get as jest.Mock).mockResolvedValueOnce({ id: "1", email: "new@example.com" });

      await act(async () => {
        await result.current.register("new@example.com", "password", "New User");
      });

      expect(api.post).toHaveBeenCalledWith(
        "/auth/register",
        expect.objectContaining({ email: "new@example.com", is_active: true }),
        false
      );
      expect(result.current.token).toBe("test-token");
    });
  });

  describe("logout", () => {
    it("should clear state on logout", () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        useAuthStore.setState({
          token: "token",
          user: { id: "1", email: "test" } as any,
        });
      });

      act(() => {
        result.current.logout();
      });

      expect(result.current.token).toBeNull();
      expect(result.current.user).toBeNull();
    });
  });
  describe("fetchUser", () => {
    it("should return early if no token", async () => {
      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.fetchUser();
      });

      expect(api.get).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it("should handle fetch error", async () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setToken("existing-token");
      });

      // Mock console.error
      const mockError = jest.spyOn(console, "error").mockImplementation(() => {});
      (api.get as jest.Mock).mockRejectedValueOnce(new Error("Network"));

      await act(async () => {
        await result.current.fetchUser();
      });

      expect(result.current.user).toBeNull();
      expect(mockError).toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
      mockError.mockRestore();
    });
  });

  describe("direct setters", () => {
    it("should update token and user directly", () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setToken("manual-token");
        result.current.setUser({ id: "99", email: "manual" } as any);
      });

      expect(result.current.token).toBe("manual-token");
      expect(result.current.user?.id).toBe("99");
    });
  });

  describe("failures", () => {
    it("should handle registration failure", async () => {
      const { result } = renderHook(() => useAuthStore());
      (api.post as jest.Mock).mockRejectedValueOnce(new Error("Email taken"));

      await act(async () => {
        try {
          await result.current.register("taken@example.com", "pass");
        } catch (e) {
          expect(e).toEqual(new Error("Email taken"));
        }
      });

      expect(result.current.error).toBe("Email taken");
      expect(result.current.isLoading).toBe(false);
    });

    it("should handle login with non-Error object", async () => {
      const { result } = renderHook(() => useAuthStore());
      (global.fetch as jest.Mock).mockRejectedValueOnce("String Error");

      await act(async () => {
        try {
          await result.current.login("test", "pass");
        } catch (e) {
          expect(e).toBe("String Error");
        }
      });
      expect(result.current.error).toBe("Login failed");
    });

    it("should handle registration with non-Error object", async () => {
      const { result } = renderHook(() => useAuthStore());
      (api.post as jest.Mock).mockRejectedValueOnce("String Error");

      await act(async () => {
        try {
          await result.current.register("test", "pass");
        } catch (e) {
          expect(e).toBe("String Error");
        }
      });
      expect(result.current.error).toBe("Registration failed");
    });
  });
  describe("selectors", () => {
    it("should check authentication", () => {
      const { result } = renderHook(() => useAuthStore());
      expect(result.current.isAuthenticated()).toBe(false);

      act(() => result.current.setToken("token"));
      expect(result.current.isAuthenticated()).toBe(true);
    });

    it("should check role", () => {
      const { result } = renderHook(() => useAuthStore());
      expect(result.current.hasRole("admin")).toBe(false);

      act(() => result.current.setUser({ role: "user" } as any));
      expect(result.current.hasRole("user")).toBe(true);
      expect(result.current.hasRole("admin")).toBe(false);
    });
  });
});
