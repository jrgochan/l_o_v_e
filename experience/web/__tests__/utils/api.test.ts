import { api, adminApi, API_BASE_URL } from "@/utils/api";
import { useAuthStore } from "@/stores/authStore";

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock Auth Store
jest.mock("@/stores/authStore", () => ({
  useAuthStore: {
    getState: jest.fn(() => ({
      token: "test-token",
      logout: jest.fn(),
    })),
  },
}));

describe("ApiClient", () => {
  const mockLogout = jest.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    mockLogout.mockReset();
    (useAuthStore.getState as jest.Mock).mockReturnValue({
      token: "test-token",
      logout: mockLogout,
    });
  });

  it("performs GET request with auth header", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: "success" }),
    });

    const result = await api.get("/test");

    expect(mockFetch).toHaveBeenCalledWith(`${API_BASE_URL}/test`, expect.objectContaining({
      method: "GET",
      headers: expect.objectContaining({
        "Authorization": "Bearer test-token",
        "Content-Type": "application/json",
      }),
    }));
    expect(result).toEqual({ data: "success" });
  });

  it("performs POST request", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1 }),
    });

    const payload = { name: "Test" };
    await api.post("/create", payload);

    expect(mockFetch).toHaveBeenCalledWith(`${API_BASE_URL}/create`, expect.objectContaining({
      method: "POST",
      body: JSON.stringify(payload),
    }));
  });

  it("handles 401 Unauthorized by logging out", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: async () => ({ detail: "Token expired" }),
    });

    await expect(api.get("/secure")).rejects.toThrow("Token expired");
    expect(mockLogout).toHaveBeenCalled();
  });

  it("handles other errors", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => ({}),
    });

    await expect(api.get("/error")).rejects.toThrow("API Error: Internal Server Error");
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it("handles empty authorization (no token)", async () => {
    (useAuthStore.getState as jest.Mock).mockReturnValue({
      token: null,
      logout: mockLogout,
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await api.get("/public");

    expect(mockFetch).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      headers: expect.not.objectContaining({ "Authorization": expect.any(String) })
    }));
  });

  it("handles request without leading slash", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });
    await api.get("no-slash");
    expect(mockFetch).toHaveBeenCalledWith(`${API_BASE_URL}/no-slash`, expect.anything());
  });

  it("handles 204 No Content", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => ({}) // Should not be called
    });

    const result = await api.del("/delete");
    expect(result).toBeNull();
  });
});

describe("Admin API Helpers", () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ([]),
    });
  });

  it("fetches sessions", async () => {
    await adminApi.getSessions(0, 10);
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/admin/sessions?skip=0&limit=10"), expect.anything());
  });

  it("fetches atlas emotions", async () => {
    await adminApi.getAtlasEmotions();
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/admin/atlas/emotions"), expect.anything());
  });

  // Smoke tests for other methods to ensure URL construction
  it("updateAtlasEmotion", async () => {
    await adminApi.updateAtlasEmotion("1", {} as any);
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/admin/atlas/emotions/1"), expect.objectContaining({ method: "PUT" }));
  });

  it("getClinicalAlerts with filters", async () => {
    await adminApi.getClinicalAlerts(1, 50, "high");
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("level=high"), expect.anything());
  });

  it("getBootstrapData with type", async () => {
    await adminApi.getBootstrapData("emotions");
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("type=emotions"), expect.anything());
  });

  // Strategies
  it("getStrategies", async () => {
    await adminApi.getStrategies();
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/admin/strategies"), expect.objectContaining({ method: "GET" }));
  });

  it("updateStrategy", async () => {
    await adminApi.updateStrategy("1", {} as any);
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/admin/strategies/1"), expect.objectContaining({ method: "PUT" }));
  });

  it("exportStrategies", async () => {
    await adminApi.exportStrategies();
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/admin/strategies/export"), expect.objectContaining({ method: "GET" }));
  });

  it("importStrategies", async () => {
    await adminApi.importStrategies({ strategies: [] });
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/admin/strategies/import"), expect.objectContaining({ method: "POST" }));
  });

  // Bootstrap
  it("createBootstrapData", async () => {
    await adminApi.createBootstrapData({} as any);
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/admin/bootstrap"), expect.objectContaining({ method: "POST" }));
  });

  it("updateBootstrapData", async () => {
    await adminApi.updateBootstrapData("1", {} as any);
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/admin/bootstrap/1"), expect.objectContaining({ method: "PUT" }));
  });

  it("deleteBootstrapData", async () => {
    await adminApi.deleteBootstrapData("1");
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/admin/bootstrap/1"), expect.objectContaining({ method: "DELETE" }));
  });

  // Prompts
  it("getPromptTemplates", async () => {
    await adminApi.getPromptTemplates();
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/admin/prompts"), expect.objectContaining({ method: "GET" }));

    await adminApi.getPromptTemplates("test-func");
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("function_name=test-func"), expect.anything());
  });

  it("createPromptTemplate", async () => {
    await adminApi.createPromptTemplate({} as any);
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/admin/prompts"), expect.objectContaining({ method: "POST" }));
  });

  it("updatePromptTemplate", async () => {
    await adminApi.updatePromptTemplate("1", {} as any);
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/admin/prompts/1"), expect.objectContaining({ method: "PUT" }));
  });

  it("testPromptTemplate", async () => {
    await adminApi.testPromptTemplate({} as any);
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/admin/prompts/test"), expect.objectContaining({ method: "POST" }));
  });

  // AI Models
  it("getAiModels", async () => {
    await adminApi.getAiModels();
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/admin/ai-models"), expect.objectContaining({ method: "GET" }));
  });

  it("updateAiModel", async () => {
    await adminApi.updateAiModel("func", {} as any);
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/admin/ai-models/func"), expect.objectContaining({ method: "PUT" }));
  });

  // Missing specific ones
  it("getSessionDetails", async () => {
    await adminApi.getSessionDetails("1");
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/admin/sessions/1"), expect.anything());
  });

  it("exportAtlasData", async () => {
    await adminApi.exportAtlasData();
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/admin/atlas/export"), expect.anything());
  });

  it("importAtlasData", async () => {
    await adminApi.importAtlasData({ emotions: [] });
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/admin/atlas/import"), expect.anything());
  });

  it("getBootstrapData without type", async () => {
    await adminApi.getBootstrapData();
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/admin/bootstrap"), expect.not.stringContaining("type="));
  });
});
