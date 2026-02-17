import { act } from "@testing-library/react";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/utils/api";
import { UserRole } from "@/types/auth"; // Import UserRole

// Mock api utils
jest.mock("@/utils/api", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    del: jest.fn(),
  },
}));

// Mock API_URL
jest.mock("@/config/environment", () => ({
  API_URL: "http://test-api.com",
}));

describe("authStore", () => {
  const mockUser = {
    id: "user-1",
    email: "test@example.com",
    role: UserRole.USER, // Use enum
    full_name: "Test User",
    is_active: true,
    created_at: "2023-01-01",
    updated_at: "2023-01-01",
  };

  beforeEach(() => {
    useAuthStore.getState().logout();
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  it("initial state is unauthenticated", () => {
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().isAuthenticated()).toBe(false);
  });

  it("login success sets token and fetches user", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: "fake-token" }),
    });
    (api.get as jest.Mock).mockResolvedValueOnce(mockUser);

    await act(async () => {
      await useAuthStore.getState().login("test@example.com", "password");
    });

    expect(useAuthStore.getState().token).toBe("fake-token");
    expect(useAuthStore.getState().user).toEqual(mockUser);
    expect(useAuthStore.getState().isAuthenticated()).toBe(true);
    expect(api.get).toHaveBeenCalledWith("/users/me");
  });

  it("login failure sets error", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    });

    await act(async () => {
      try {
        await useAuthStore.getState().login("test@example.com", "wrong");
      } catch (e) {
        expect(e).toBeDefined();
      }
    });

    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().error).toBe("Login failed");
  });

  it("login failure with non-Error object sets default error", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce("Network error string");

    await act(async () => {
      try {
        await useAuthStore.getState().login("test@example.com", "wrong");
      } catch (e) {
        expect(e).toBeDefined();
      }
    });

    expect(useAuthStore.getState().error).toBe("Login failed");
  });

  it("logout clears state", () => {
    useAuthStore.setState({ token: "token", user: mockUser });
    expect(useAuthStore.getState().isAuthenticated()).toBe(true);

    act(() => {
      useAuthStore.getState().logout();
    });

    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("register calls api and then logs in", async () => {
    (api.post as jest.Mock).mockResolvedValueOnce({});
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: "fake-token" }),
    });
    (api.get as jest.Mock).mockResolvedValueOnce(mockUser);

    await act(async () => {
      await useAuthStore.getState().register("new@example.com", "password", "New User");
    });

    expect(api.post).toHaveBeenCalledWith("/auth/register", expect.any(Object), false);
    expect(useAuthStore.getState().token).toBe("fake-token");
  });

  it("register failure sets error", async () => {
    (api.post as jest.Mock).mockRejectedValueOnce(new Error("Register failed"));

    await act(async () => {
      try {
        await useAuthStore.getState().register("fail@test.com", "pw");
      } catch {}
    });

    expect(useAuthStore.getState().error).toBe("Register failed");
  });

  it("register failure with non-Error object", async () => {
    (api.post as jest.Mock).mockRejectedValueOnce("Some string error");

    await act(async () => {
      try {
        await useAuthStore.getState().register("fail@test.com", "pw");
      } catch {}
    });

    expect(useAuthStore.getState().error).toBe("Registration failed");
  });

  describe("refreshToken", () => {
    it("refreshes token successfully and dispatches event", async () => {
      useAuthStore.setState({ token: "old-token" });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "new-token" }),
      });

      const dispatchSpy = jest.spyOn(window, "dispatchEvent");

      let result;
      await act(async () => {
        result = await useAuthStore.getState().refreshToken();
      });

      expect(result).toBe(true);
      expect(useAuthStore.getState().token).toBe("new-token");
      expect(dispatchSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
      dispatchSpy.mockRestore();
    });

    it("logs out on refresh failure", async () => {
      useAuthStore.setState({ token: "old-token" });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      let result;
      await act(async () => {
        result = await useAuthStore.getState().refreshToken();
      });

      expect(result).toBe(false);
      expect(useAuthStore.getState().token).toBeNull();
    });

    it("returns false if no token", async () => {
      useAuthStore.setState({ token: null });
      const result = await useAuthStore.getState().refreshToken();
      expect(result).toBe(false);
    });

    it("handles network error", async () => {
      useAuthStore.setState({ token: "old-token" });
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

      let result;
      await act(async () => {
        result = await useAuthStore.getState().refreshToken();
      });

      expect(result).toBe(false);
      expect(useAuthStore.getState().token).toBeNull();
    });

    it("deduplicates concurrent calls", async () => {
      useAuthStore.setState({ token: "old-token" });

      let resolveRequest: (v: any) => void;
      const requestPromise = new Promise((resolve) => {
        resolveRequest = resolve;
      });

      (global.fetch as jest.Mock).mockReturnValue(requestPromise);

      const p1 = useAuthStore.getState().refreshToken();
      const p2 = useAuthStore.getState().refreshToken();

      // expect(p1).toBe(p2); // Removed because async function wraps return in new promise

      resolveRequest!({ ok: true, json: async () => ({ access_token: "new" }) });
      await p1;
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
    it("does not dispatch event if window is undefined", async () => {
      useAuthStore.setState({ token: "old-token" });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "new-token" }),
      });

      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      await act(async () => {
        await useAuthStore.getState().refreshToken();
      });

      // Restore window
      global.window = originalWindow;

      // No assertion needed other than no crash, but coverage should pick it up.
      expect(useAuthStore.getState().token).toBe("new-token");
    });
  });

  describe("Account Management", () => {
    it("hasRole checks user role", () => {
      useAuthStore.setState({ user: { ...mockUser, role: UserRole.ADMIN } });
      expect(useAuthStore.getState().hasRole(UserRole.ADMIN)).toBe(true);
      expect(useAuthStore.getState().hasRole(UserRole.USER)).toBe(false);
    });

    it("updateProfile updates user", async () => {
      const updatedUser = { ...mockUser, full_name: "Updated" };
      (api.put as jest.Mock).mockResolvedValueOnce(updatedUser);

      await act(async () => {
        await useAuthStore.getState().updateProfile({ full_name: "Updated" });
      });

      expect(api.put).toHaveBeenCalledWith("/users/me", { full_name: "Updated" });
      expect(useAuthStore.getState().user).toEqual(updatedUser);
    });

    it("updateProfile failure", async () => {
      (api.put as jest.Mock).mockRejectedValueOnce(new Error("Update failed"));
      try {
        await act(async () => await useAuthStore.getState().updateProfile({}));
      } catch {}
      expect(useAuthStore.getState().error).toBe("Update failed");
    });

    it("updateProfile failure with non-Error", async () => {
      (api.put as jest.Mock).mockRejectedValueOnce("fail");
      try {
        await act(async () => await useAuthStore.getState().updateProfile({}));
      } catch {}
      expect(useAuthStore.getState().error).toBe("Failed to update profile");
    });

    it("changePassword calls api", async () => {
      (api.put as jest.Mock).mockResolvedValueOnce({});
      await act(async () => {
        await useAuthStore.getState().changePassword("old", "new");
      });
      expect(api.put).toHaveBeenCalledWith("/users/me/password", {
        current_password: "old",
        new_password: "new",
      });
    });

    it("changePassword failure", async () => {
      (api.put as jest.Mock).mockRejectedValueOnce(new Error("Password fail"));
      try {
        await act(async () => await useAuthStore.getState().changePassword("old", "new"));
      } catch {}
      expect(useAuthStore.getState().error).toBe("Password fail");
    });

    it("changePassword failure with non-Error", async () => {
      (api.put as jest.Mock).mockRejectedValueOnce("fail");
      try {
        await act(async () => await useAuthStore.getState().changePassword("old", "new"));
      } catch {}
      expect(useAuthStore.getState().error).toBe("Failed to change password");
    });

    it("deleteAccount calls api and logs out", async () => {
      (api.del as jest.Mock).mockResolvedValueOnce({});
      useAuthStore.setState({ token: "token" });

      await act(async () => {
        await useAuthStore.getState().deleteAccount();
      });

      expect(api.del).toHaveBeenCalledWith("/users/me");
      expect(useAuthStore.getState().token).toBeNull();
    });

    it("deleteAccount failure", async () => {
      (api.del as jest.Mock).mockRejectedValueOnce(new Error("Delete fail"));
      try {
        await act(async () => await useAuthStore.getState().deleteAccount());
      } catch {}
      expect(useAuthStore.getState().error).toBe("Delete fail");
    });

    it("deleteAccount failure with non-Error", async () => {
      (api.del as jest.Mock).mockRejectedValueOnce("fail");
      try {
        await act(async () => await useAuthStore.getState().deleteAccount());
      } catch {}
      expect(useAuthStore.getState().error).toBe("Failed to delete account");
    });

    it("exportData triggers download", async () => {
      const data = { foo: "bar" };
      (api.get as jest.Mock).mockResolvedValueOnce(data);

      // Mock DOM dependencies
      const mockUrl = "blob:url";
      global.URL.createObjectURL = jest.fn(() => mockUrl);
      global.URL.revokeObjectURL = jest.fn();

      const mockAnchor = { click: jest.fn(), href: "", download: "" };
      const createElementSpy = jest
        .spyOn(document, "createElement")
        .mockReturnValue(mockAnchor as any);
      const appendChildSpy = jest.spyOn(document.body, "appendChild").mockImplementation();
      const removeChildSpy = jest.spyOn(document.body, "removeChild").mockImplementation();

      await act(async () => {
        await useAuthStore.getState().exportData();
      });

      expect(api.get).toHaveBeenCalledWith("/users/me/export");
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl);

      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });

    it("exportData failure", async () => {
      (api.get as jest.Mock).mockRejectedValueOnce(new Error("Export fail"));
      try {
        await act(async () => await useAuthStore.getState().exportData());
      } catch {} // Expected
      expect(useAuthStore.getState().error).toBe("Export fail");
    });

    it("exportData failure with non-Error", async () => {
      (api.get as jest.Mock).mockRejectedValueOnce("fail");
      try {
        await act(async () => await useAuthStore.getState().exportData());
      } catch {} // Expected
      expect(useAuthStore.getState().error).toBe("Failed to export data");
    });
  });

  it("setUser sets user directly", () => {
    act(() => useAuthStore.getState().setUser(mockUser));
    expect(useAuthStore.getState().user).toEqual(mockUser);
  });

  it("setToken sets token directly", () => {
    act(() => useAuthStore.getState().setToken("direct-token"));
    expect(useAuthStore.getState().token).toBe("direct-token");
  });

  it("fetchUser handles error gracefully", async () => {
    useAuthStore.setState({ token: "token" });
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    (api.get as jest.Mock).mockRejectedValueOnce(new Error("Fetch fail"));

    await act(async () => {
      await useAuthStore.getState().fetchUser();
    });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("fetchUser returns early if no token", async () => {
    useAuthStore.setState({ token: null });
    await act(async () => {
      await useAuthStore.getState().fetchUser();
    });
    expect(api.get).not.toHaveBeenCalled();
  });
});
