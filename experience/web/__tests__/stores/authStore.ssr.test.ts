/**
 * @jest-environment node
 */
import { act } from "@testing-library/react";
import { useAuthStore } from "@/stores/authStore";

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

describe("authStore SSR", () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
    jest.clearAllMocks();
    // Mock global fetch manually since we are in node env
    global.fetch = jest.fn();
  });

  it("refreshToken does not crash or dispatch event when window is undefined", async () => {
    useAuthStore.setState({ token: "old-token" });
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: "new-token" }),
    });

    // Verify window is indeed undefined
    expect(typeof window).toBe("undefined");

    let result;
    await act(async () => {
      result = await useAuthStore.getState().refreshToken();
    });

    expect(result).toBe(true);
    expect(useAuthStore.getState().token).toBe("new-token");
  });
});
