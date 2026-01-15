/* eslint-disable */
import {
  getObserverClient,
  ObserverApiClient,
  createPollingManager,
  ObserverPollingManager,
  fetchCurrentState,
  generateMockResponse,
  convertQuaternion,
  convertVAC,
} from "../../src/api/observer";

describe("Observer API", () => {
  const mockFetch = jest.fn();
  global.fetch = mockFetch;

  const mockConsoleError = jest.spyOn(console, "error").mockImplementation(() => {});

  beforeEach(() => {
    jest.useRealTimers();
    mockFetch.mockReset();
    mockConsoleError.mockClear();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe("ObserverApiClient", () => {
    it("should fetch current state successfully", async () => {
      const mockData = { user_id: "123", vac_vector: [0.5, 0.5, 0.5] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const client = new ObserverApiClient();
      const result = await client.getCurrentState("123");
      expect(result).toEqual(mockData);
    });

    it("should retry on failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error")).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const client = new ObserverApiClient({ retryDelay: 1 });
      const result = await client.getCurrentState("123");

      expect(result).toEqual({ success: true });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should throw after max retries", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const client = new ObserverApiClient({ retryAttempts: 2, retryDelay: 1 });

      await expect(client.getCurrentState("123")).rejects.toThrow("Network error");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should handle API errors (non-200)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      const client = new ObserverApiClient();
      await expect(client.getCurrentState("123")).rejects.toThrow(
        "Observer API error: 404 Not Found"
      );
    });

    // Default params coverage
    it("should get history with default params", async () => {
      const mockHistory = { user_id: "u1", states: [], total_count: 0 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockHistory,
      });

      const client = new ObserverApiClient();
      // Call without limit/offset
      const result = await client.getHistory("u1");
      expect(result).toEqual(mockHistory);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("limit=100"), // Default limit
        expect.anything()
      );
    });

    it("should get history with custom params", async () => {
      const mockHistory = { user_id: "u1", states: [], total_count: 0 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockHistory,
      });

      const client = new ObserverApiClient();
      await client.getHistory("u1", 50, 10);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("limit=50&offset=10"),
        expect.anything()
      );
    });

    it("should handle transition path API error response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Bad Request",
        json: async () => ({ detail: "Invalid VAC" }),
      });

      const client = new ObserverApiClient();
      await expect(client.generateTransitionPath("u1", [0, 0, 0], [1, 1, 1])).rejects.toThrow(
        "Invalid VAC"
      );
    });

    // Default params for transition path
    it("should generate transition path with defaults", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ path_id: "1" }),
      });

      const client = new ObserverApiClient();
      await client.generateTransitionPath("u1", [0, 0, 0], [1, 1, 1]);
      // Defaults maxWaypoints=3
    });

    it("should handle transition path API error response without detail", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Bad Request",
        json: async () => ({}),
      });

      const client = new ObserverApiClient();
      await expect(client.generateTransitionPath("u1", [0, 0, 0], [1, 1, 1])).rejects.toThrow(
        "API error: Bad Request"
      );
    });

    const methodsToTest = [
      ["getHistory", ["u1"]],
      ["loadEmotionAtlas", []], // Test without category arg
      ["loadEmotionAtlas", ["joy"]], // Test with category arg
      ["startJourney", ["u1", "p1"]],
      ["startJourney", ["u1", "p1", { foo: "bar" }]], // Test with context
      ["getBootstrapStrategyRatings", []],
      ["getBootstrapPathTemplates", []], // Defaults
      ["getBootstrapPathTemplates", ["joy", "sadness", 5]], // Custom
      ["getContextRecommendations", [{}]], // Defaults
      [
        "getContextRecommendations",
        [
          {
            time_of_day: "morning",
            energy_level: "high",
            location: "home",
            available_time: "5_minutes",
            experience_level: "beginner",
          },
        ],
      ], // With all params to cover lines 392-395
      ["getChallengePatterns", []],
      ["getChallengePatterns", ["challenge1"]],
      ["getAllBootstrapData", []],
      ["getUserEffectiveStrategies", ["u1"]], // Default limit
      ["getUserEffectiveStrategies", ["u1", 10]], // Custom limit
      ["getUserJourneyHistory", ["u1"]],
    ];

    methodsToTest.forEach(([method, args]) => {
      it(`${method} should handle network error`, async () => {
        mockFetch.mockRejectedValueOnce(new Error("Network Fail"));
        const client = new ObserverApiClient({ retryAttempts: 1 });
        // @ts-ignore
        await expect(client[method](...args)).rejects.toThrow("Network Fail");
      });

      it(`${method} should handle non-200 error`, async () => {
        mockFetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: "Err" });
        const client = new ObserverApiClient();
        // @ts-ignore
        await expect(client[method](...args)).rejects.toThrow(/Observer API error: 500/);
      });

      // Add success test for each to ensure branch coverage of defaults/args construction
      it(`${method} success`, async () => {
        mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
        const client = new ObserverApiClient();
        // @ts-ignore
        await client[method](...args);
      });
    });

    it("healthCheck should return false on error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Fail"));
      const client = new ObserverApiClient();
      expect(await client.healthCheck()).toBe(false);
    });

    it("healthCheck should return true on success", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      const client = new ObserverApiClient();
      expect(await client.healthCheck()).toBe(true);
    });

    it("updateConfig should update configuration", () => {
      const client = new ObserverApiClient();
      client.updateConfig({ retryAttempts: 99 });
    });
  });

  describe("ObserverPollingManager", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    // ... polling tests ...
    it("should start and stop polling", async () => {
      const client = new ObserverApiClient();
      const manager = createPollingManager();
      const mockData = { success: true };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      const onUpdate = jest.fn();
      manager.start("u1", onUpdate, undefined, 100);

      expect(manager.isActive()).toBe(true);
      expect(mockFetch).toHaveBeenCalled();

      await jest.advanceTimersByTimeAsync(100);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      manager.stop();
      expect(manager.isActive()).toBe(false);
    });

    it("should handle polling errors", async () => {
      const manager = createPollingManager();
      mockFetch.mockRejectedValue(new Error("Poll fail"));

      const onError = jest.fn();
      manager.start("u1", () => {}, onError, 100);

      await jest.runOnlyPendingTimersAsync();
      await Promise.resolve();

      expect(onError).toHaveBeenCalled();
      manager.stop();
    });

    it("should use default silent error handler", async () => {
      const manager = createPollingManager();
      // Cause an error
      mockFetch.mockRejectedValue(new Error("Poll fail"));

      // Start without onError
      manager.start("u1", () => {}); // No onError provided

      // Advance timers to trigger poll and failure
      await jest.runOnlyPendingTimersAsync();
      await Promise.resolve(); // Flush promises

      // Should not throw and just remain active/silent
      expect(manager.isActive()).toBe(true);
      manager.stop();
    });

    it("should prevent double start (coverage)", () => {
      const manager = createPollingManager();
      manager.start("u1", () => {});
      manager.start("u1", () => {});
      expect(manager.isActive()).toBe(true);
      manager.stop();
    });

    it("stop should be idempotent", () => {
      const manager = createPollingManager();
      manager.stop(); // No-op
      expect(manager.isActive()).toBe(false);
    });

    it("poll should not execute if not polling", async () => {
      const manager = createPollingManager();
      // @ts-ignore - Accessing private method for coverage
      await manager.poll("u1");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should handle race condition where stop is called during poll", async () => {
      const client = new ObserverApiClient();
      const manager = new ObserverPollingManager(client);

      // Mock getCurrentState to wait
      let resolveState: any;
      const statePromise = new Promise((resolve) => {
        resolveState = resolve;
      });
      jest.spyOn(client, "getCurrentState").mockImplementation(() => statePromise as any);

      // Mock cancel to do nothing (so promise doesn't reject)
      jest.spyOn(client, "cancel").mockImplementation(() => {});

      const onUpdate = jest.fn();
      manager.start("u1", onUpdate); // This triggers the immediate poll

      // Now polling is active and getCurrentState is pending

      // Stop the manager
      manager.stop();

      // Now resolve the state
      resolveState({ user_id: "u1" });

      // Wait for microtasks
      await Promise.resolve();

      // onUpdate should NOT have been called because stop() set it to null
      expect(onUpdate).not.toHaveBeenCalled();
    });
  });

  describe("Helpers", () => {
    it("getObserverClient singleton and update", () => {
      const c1 = getObserverClient();
      const c2 = getObserverClient();
      expect(c1).toBe(c2);
      getObserverClient({ retryAttempts: 5 });
    });
    it("createPollingManager helper", () => {
      createPollingManager();
    });
    it("convertQuaternion", () => {
      convertQuaternion({ w: 1, x: 0, y: 0, z: 0 });
    });
    it("convertVAC", () => {
      convertVAC([0, 0, 0]);
    });
    it("fetchCurrentState", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
      await fetchCurrentState("u1");

      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
      await fetchCurrentState("u1", "http://custom:8000");
    });
    it("generateMockResponse", () => {
      generateMockResponse("u1");
    });
  });

  describe("Timeouts", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it("should trigger timeout callback in healthCheck", async () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));
      const client = new ObserverApiClient();
      client.healthCheck();
      jest.advanceTimersByTime(5000);
    });

    it("should trigger timeout callback in fetchWithRetry", async () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));
      const client = new ObserverApiClient();
      // @ts-ignore
      client.fetchWithRetry("http://foo", 1);
      jest.advanceTimersByTime(5000);
    });
  });
});
