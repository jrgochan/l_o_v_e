import { api, adminApi } from "../../utils/api";
import { useAuthStore } from "../../stores/authStore";
import fetchMock from "jest-fetch-mock";

// Enable fetch mocks
fetchMock.enableMocks();

// Mock store
jest.mock("../../stores/authStore");

describe("API Utils", () => {
  const mockToken = "test-token";
  const mockLogout = jest.fn();

  beforeEach(() => {
    fetchMock.resetMocks();
    jest.clearAllMocks();

    // Setup store mock
    (useAuthStore.getState as jest.Mock).mockReturnValue({
      token: mockToken,
      logout: mockLogout,
    });
  });

  describe("ApiClient", () => {
    it("should add authorization header when authenticated is true", async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ data: "test" }));

      await api.get("/test-endpoint");

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/test-endpoint"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("should NOT add authorization header when authenticated is false", async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ data: "test" }));

      await api.get("/public-endpoint", false);

      const call = fetchMock.mock.calls[0];
      const options = call[1] as RequestInit;
      const headers = options.headers as Record<string, string>;

      expect(headers["Authorization"]).toBeUndefined();
    });

    it("should handle 401 Unauthorized by calling logout", async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ detail: "Unauthorized" }), { status: 401 });

      await expect(api.get("/protected")).rejects.toThrow();

      expect(mockLogout).toHaveBeenCalled();
    });

    it("should return null for 204 No Content", async () => {
      fetchMock.mockResponseOnce("", { status: 204 });

      const result = await api.del("/resource");

      expect(result).toBeNull();
    });

    it("should throw error with detail message on failure", async () => {
      const errorMessage = "Custom error message";
      fetchMock.mockResponseOnce(JSON.stringify({ detail: errorMessage }), { status: 400 });

      await expect(api.get("/error")).rejects.toThrow(errorMessage);
    });

    it("should throw generic error if no detail provided", async () => {
      fetchMock.mockResponseOnce(JSON.stringify({}), {
        status: 500,
        statusText: "Internal Server Error",
      });

      await expect(api.get("/error")).rejects.toThrow("API Error: Internal Server Error");
    });
  });

  describe("REST Methods", () => {
    it("should perform POST requests with body", async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ success: true }));
      const payload = { name: "test" };

      await api.post("/create", payload);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(payload),
        })
      );
    });

    it("should perform PUT requests with body", async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ success: true }));
      const payload = { name: "updated" };

      await api.put("/update/1", payload);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify(payload),
        })
      );
    });
  });

  describe("Admin API Helpers", () => {
    it("getSessions should format query params correctly", async () => {
      fetchMock.mockResponseOnce(JSON.stringify([]));

      await adminApi.getSessions(10, 20);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/admin/sessions?skip=10&limit=20"),
        expect.anything()
      );
    });

    it("getClinicalAlerts should handle optional level param", async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ items: [], total: 0 }));

      await adminApi.getClinicalAlerts(1, 50, "critical");

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("level=critical"),
        expect.anything()
      );
    });

    it("getBootstrapData should handle optional type param", async () => {
      fetchMock.mockResponseOnce(JSON.stringify([]));

      await adminApi.getBootstrapData("initial");

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("type=initial"),
        expect.anything()
      );
    });

    it("should call getSessionDetails with correct ID", async () => {
      fetchMock.mockResponseOnce(JSON.stringify({}));
      await adminApi.getSessionDetails("123");
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/admin/sessions/123"),
        expect.anything()
      );
    });

    it("should call getAtlasEmotions", async () => {
      fetchMock.mockResponseOnce(JSON.stringify([]));
      await adminApi.getAtlasEmotions();
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/admin/atlas/emotions"),
        expect.anything()
      );
    });

    it("should call updateAtlasEmotion", async () => {
      fetchMock.mockResponseOnce(JSON.stringify({}));
      await adminApi.updateAtlasEmotion("e1", { definition: "test" });
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/admin/atlas/emotions/e1"),
        expect.objectContaining({ method: "PUT", body: expect.stringContaining("test") })
      );
    });

    it("should call exportAtlasData", async () => {
      fetchMock.mockResponseOnce(JSON.stringify({}));
      await adminApi.exportAtlasData();
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/admin/atlas/export"),
        expect.anything()
      );
    });

    it("should call importAtlasData", async () => {
      fetchMock.mockResponseOnce(JSON.stringify({}));
      await adminApi.importAtlasData({ emotions: [] });
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/admin/atlas/import"),
        expect.objectContaining({ method: "POST" })
      );
    });

    it("should call getAiModels", async () => {
      fetchMock.mockResponseOnce(JSON.stringify([]));
      await adminApi.getAiModels();
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/admin/ai-models"),
        expect.anything()
      );
    });

    it("should call updateAiModel", async () => {
      fetchMock.mockResponseOnce(JSON.stringify({}));
      await adminApi.updateAiModel("chat", { ai_model_name: "gpt" });
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/admin/ai-models/chat"),
        expect.objectContaining({ method: "PUT" })
      );
    });

    it("should call getStrategies", async () => {
      fetchMock.mockResponseOnce(JSON.stringify([]));
      await adminApi.getStrategies();
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/admin/strategies"),
        expect.anything()
      );
    });

    it("should call updateStrategy", async () => {
      fetchMock.mockResponseOnce(JSON.stringify({}));
      await adminApi.updateStrategy("s1", { description: "New" });
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/admin/strategies/s1"),
        expect.objectContaining({ method: "PUT" })
      );
    });

    it("should call exportStrategies", async () => {
      fetchMock.mockResponseOnce(JSON.stringify({}));
      await adminApi.exportStrategies();
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/admin/strategies/export"),
        expect.anything()
      );
    });

    it("should call importStrategies", async () => {
      fetchMock.mockResponseOnce(JSON.stringify({}));
      await adminApi.importStrategies({ strategies: [] });
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/admin/strategies/import"),
        expect.objectContaining({ method: "POST" })
      );
    });

    it("should call createBootstrapData", async () => {
      fetchMock.mockResponseOnce(JSON.stringify({}));
      await adminApi.createBootstrapData({ data_type: "test", content: {} });
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/admin/bootstrap"),
        expect.objectContaining({ method: "POST" })
      );
    });

    it("should call updateBootstrapData", async () => {
      fetchMock.mockResponseOnce(JSON.stringify({}));
      await adminApi.updateBootstrapData("b1", { content: { foo: "bar" } });
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/admin/bootstrap/b1"),
        expect.objectContaining({ method: "PUT" })
      );
    });

    it("should call deleteBootstrapData", async () => {
      fetchMock.mockResponseOnce(JSON.stringify({}));
      await adminApi.deleteBootstrapData("b1");
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/admin/bootstrap/b1"),
        expect.objectContaining({ method: "DELETE" })
      );
    });

    it("should call getPromptTemplates", async () => {
      fetchMock.mockResponseOnce(JSON.stringify([]));
      await adminApi.getPromptTemplates();
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/admin/prompts"),
        expect.anything()
      );

      fetchMock.mockResponseOnce(JSON.stringify([]));
      await adminApi.getPromptTemplates("chat");
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("function_name=chat"),
        expect.anything()
      );
    });

    it("should call createPromptTemplate", async () => {
      fetchMock.mockResponseOnce(JSON.stringify({}));
      const data: any = { function_name: "test", template_type: "system", content: "test" };
      await adminApi.createPromptTemplate(data);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/admin/prompts"),
        expect.objectContaining({ method: "POST" })
      );
    });

    it("should call updatePromptTemplate", async () => {
      fetchMock.mockResponseOnce(JSON.stringify({}));
      await adminApi.updatePromptTemplate("p1", { template_content: "updated" });
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/admin/prompts/p1"),
        expect.objectContaining({ method: "PUT" })
      );
    });

    it("should call testPromptTemplate", async () => {
      fetchMock.mockResponseOnce(JSON.stringify({}));
      const req: any = { template_id: "p1", variables: {} };
      await adminApi.testPromptTemplate(req);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/admin/prompts/test"),
        expect.objectContaining({ method: "POST" })
      );
    });
  });
});
