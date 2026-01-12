import { logger, initLogger } from "../../utils/logger";

describe("Logger", () => {
  // Spy on console methods
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Reset singleton state
    logger.init({
      enabled: true,
      level: "debug",
      categories: new Set([
        "general",
        "api",
        "state",
        "websocket",
        "hooks",
        "rendering",
        "user-interaction",
      ]),
      buffer: [],
      maxBufferSize: 10,
    });
    logger.clearBuffer();

    // Mocks
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic Logging", () => {
    it("should log debug messages when enabled", () => {
      logger.debug("general", "test debug");
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("test debug"),
        expect.any(String)
      );
      expect(logger.getBuffer()).toHaveLength(1);
    });

    it("should log info messages", () => {
      logger.info("general", "test info");
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("test info"),
        expect.any(String)
      );
    });

    it("should log warnings", () => {
      logger.warn("general", "test warn");
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("test warn"));
      expect(logger.getBuffer()[0].level).toBe("warn");
    });

    it("should log errors", () => {
      logger.error("general", "test error");
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("test error"));
      expect(logger.getBuffer()[0].level).toBe("error");
    });
  });

  describe("Filtering", () => {
    it("should respect enabled flag", () => {
      logger.setEnabled(false);
      logger.info("general", "should not log");
      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(logger.getBuffer()).toHaveLength(0);
    });

    it("should respect log categories", () => {
      logger.setCategory("api", false);
      logger.info("api", "api log");
      logger.info("general", "general log");

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("general log"),
        expect.any(String)
      );
    });

    it("should respect log levels", () => {
      // Priority: error(0) > warn(1) > info(2) > debug(3)
      logger.setLevel("warn");

      logger.debug("general", "debug msg"); // 3 > 1 -> skip
      logger.info("general", "info msg"); // 2 > 1 -> skip
      logger.warn("general", "warn msg"); // 1 <= 1 -> log
      logger.error("general", "error msg"); // 0 <= 1 -> log

      expect(consoleLogSpy).not.toHaveBeenCalled(); // debug/info use console.log
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("Buffer Management", () => {
    it("should respect max buffer size", () => {
      logger.init({ maxBufferSize: 3 });

      logger.info("general", "1");
      logger.info("general", "2");
      logger.info("general", "3");
      logger.info("general", "4");

      const buffer = logger.getBuffer();
      expect(buffer).toHaveLength(3);
      expect(buffer[0].message).toBe("2");
      expect(buffer[2].message).toBe("4");
    });

    it("should clear buffer", () => {
      logger.info("general", "test");
      expect(logger.getBuffer()).toHaveLength(1);

      logger.clearBuffer();
      expect(logger.getBuffer()).toHaveLength(0);
    });

    it("should export logs correctly", () => {
      logger.init({ maxBufferSize: 10 });
      logger.clearBuffer();

      // Freeze time for consistent timestamp testing if needed,
      // but for now we just check content existence
      logger.info("general", "export me", { extra: 123 });

      const exportData = logger.exportLogs();
      expect(exportData).toContain("[INFO] [GENERAL] export me");
      expect(exportData).toContain('{"extra":123}');
    });
  });

  describe("Configuration", () => {
    it("should update config incrementally", () => {
      logger.updateConfig({ level: "error" });
      expect(logger.getConfig().level).toBe("error");
      expect(logger.getConfig().enabled).toBe(true); // preserved
    });

    it("should initialize from settings object", () => {
      initLogger({
        enabled: false,
        level: "warn",
        categories: {
          api: true,
          general: false,
          websocket: true,
          hooks: false,
          rendering: false,
          state: false,
          "user-interaction": false,
        },
      });

      const config = logger.getConfig();
      expect(config.enabled).toBe(false);
      expect(config.level).toBe("warn");
      expect(config.categories.has("api")).toBe(true);
      expect(config.categories.has("general")).toBe(false);
    });
  });
});
