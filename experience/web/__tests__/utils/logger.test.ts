import { logger, initLogger, LogLevel, LogCategory } from "@/utils/logger";

describe("Unified Logging System", () => {
  // Save original console methods
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  let mockLog: jest.Mock;
  let mockWarn: jest.Mock;
  let mockError: jest.Mock;

  beforeEach(() => {
    // Reset logger state
    logger.init({
      enabled: true,
      level: "debug",
      categories: new Set(["general", "user-interaction"] as LogCategory[]),
      buffer: [],
      maxBufferSize: 10,
    });
    logger.clearBuffer();

    // Mock console methods
    mockLog = jest.fn();
    mockWarn = jest.fn();
    mockError = jest.fn();
    console.log = mockLog;
    console.warn = mockWarn;
    console.error = mockError;
  });

  afterEach(() => {
    // Restore console methods
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  });

  it("should not log when disabled", () => {
    logger.setEnabled(false);
    logger.info("general", "Test message");
    expect(mockLog).not.toHaveBeenCalled();
    expect(logger.getBuffer()).toHaveLength(0);
  });

  it("should filter by log level", () => {
    logger.setLevel("warn");

    logger.debug("general", "Debug message");
    logger.info("general", "Info message");
    logger.warn("general", "Warn message");
    logger.error("general", "Error message");

    expect(mockLog).not.toHaveBeenCalled(); // Debug and Info use console.log
    expect(mockWarn).toHaveBeenCalledTimes(1);
    expect(mockError).toHaveBeenCalledTimes(1);
    expect(logger.getBuffer()).toHaveLength(2);
  });

  it("should filter by category", () => {
    logger.setCategory("api", false);

    logger.info("api", "API message");
    logger.info("general", "General message");

    expect(mockLog).toHaveBeenCalledTimes(1);
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("GENERAL"), expect.anything());
    expect(logger.getBuffer()).toHaveLength(1);
  });

  it("should manage buffer size", () => {
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

  it("should export logs correctly", () => {
    // Mock Date to ensure consistent timestamp in export
    const mockDate = new Date("2023-01-01T12:00:00Z");
    jest.spyOn(global, "Date").mockImplementation(() => mockDate);

    logger.info("general", "Export test", { data: 123 });

    const exported = logger.exportLogs();
    // [2023-01-01T12:00:00.000Z] [INFO] [GENERAL] Export test [{"data":123}]
    // Adjust expectation based on implementation details of format
    expect(exported).toContain("[INFO] [GENERAL] Export test");
    expect(exported).toContain('{"data":123}');

    jest.restoreAllMocks();
  });

  it("should initialize from object config", () => {
    initLogger({
      enabled: false,
      level: "error",
      categories: {
        general: true,
        api: false,
        websocket: true,
        hooks: false,
        rendering: false,
        state: false,
        "user-interaction": false
      }
    });

    const config = logger.getConfig();
    expect(config.enabled).toBe(false);
    expect(config.level).toBe("error");
    expect(config.categories.has("general")).toBe(true);
    expect(config.categories.has("websocket")).toBe(true);
    expect(config.categories.has("api")).toBe(false);
  });

  it("should update config dynamically", () => {
    logger.updateConfig({ level: "error" });
    expect(logger.getConfig().level).toBe("error");
  });

  it("handles setCategory enabling", () => {
    logger.setCategory("api", true);
    expect(logger.getConfig().categories.has("api")).toBe(true);

    logger.setCategory("api", false);
    expect(logger.getConfig().categories.has("api")).toBe(false);
  });

  it("should log debug messages when enabled", () => {
    logger.setLevel("debug");
    logger.debug("general", "Debug test");
    expect(mockLog).toHaveBeenCalled();
    expect(logger.getBuffer()).toHaveLength(1);
    expect(logger.getBuffer()[0].level).toBe("debug");
  });
});
