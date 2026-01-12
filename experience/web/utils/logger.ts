/**
 * Unified Logging System
 *
 * Centralized logging utility with category-based filtering and level control.
 * Integrates with settings store for user-configurable logging.
 *
 * Features:
 * - Category-based filtering (websocket, api, hooks, rendering, state, user-interaction)
 * - Log level filtering (debug, info, warn, error)
 * - Master enable/disable toggle
 * - Color-coded console output
 * - Log buffering for export/debugging
 * - Zero overhead when disabled
 */

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogCategory =
  | "websocket"
  | "api"
  | "hooks"
  | "rendering"
  | "state"
  | "user-interaction"
  | "general";

interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  category: LogCategory;
  message: string;
  args: unknown[];
}

/**
 * Logger Configuration
 */
interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
  categories: Set<LogCategory>;
  buffer: LogEntry[];
  maxBufferSize: number;
}

/**
 * Log levels in priority order (lower number = higher priority)
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

/**
 * Category display names and colors
 */
const CATEGORY_CONFIG: Record<LogCategory, { name: string; color: string }> = {
  websocket: { name: "WS", color: "#00bcd4" }, // Cyan
  api: { name: "API", color: "#4caf50" }, // Green
  hooks: { name: "HOOK", color: "#ff9800" }, // Orange
  rendering: { name: "RENDER", color: "#9c27b0" }, // Purple
  state: { name: "STATE", color: "#2196f3" }, // Blue
  "user-interaction": { name: "USER", color: "#e91e63" }, // Pink
  general: { name: "GENERAL", color: "#607d8b" }, // Grey
};

/**
 * Logger Class
 */
class Logger {
  private config: LoggerConfig = {
    enabled: false, // Default OFF for clean console
    level: "info",
    categories: new Set(["user-interaction"]), // Only user interactions when enabled
    buffer: [],
    maxBufferSize: 500,
  };

  /**
   * Initialize logger with settings
   */
  init(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Update logger configuration
   */
  updateConfig(updates: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Enable/disable logging
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Enable/disable a specific category
   */
  setCategory(category: LogCategory, enabled: boolean): void {
    if (enabled) {
      this.config.categories.add(category);
    } else {
      this.config.categories.delete(category);
    }
  }

  /**
   * Check if logging should occur for this level and category
   */
  private shouldLog(level: LogLevel, category: LogCategory): boolean {
    if (!this.config.enabled) return false;
    if (!this.config.categories.has(category)) return false;
    if (LOG_LEVEL_PRIORITY[level] > LOG_LEVEL_PRIORITY[this.config.level]) return false;
    return true;
  }

  /**
   * Add entry to log buffer
   */
  private addToBuffer(entry: LogEntry): void {
    this.config.buffer.push(entry);

    // Trim buffer if it exceeds max size
    if (this.config.buffer.length > this.config.maxBufferSize) {
      this.config.buffer.shift();
    }
  }

  /**
   * Format log message with timestamp and category
   */
  private formatMessage(category: LogCategory, message: string): string {
    const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
    const categoryInfo = CATEGORY_CONFIG[category];
    return `[${timestamp}] [${categoryInfo.name}] ${message}`;
  }

  /**
   * Log a debug message
   */
  debug(category: LogCategory, message: string, ...args: unknown[]): void {
    if (!this.shouldLog("debug", category)) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level: "debug",
      category,
      message,
      args,
    };

    this.addToBuffer(entry);

    const formatted = this.formatMessage(category, message);
    const categoryColor = CATEGORY_CONFIG[category].color;

    // eslint-disable-next-line no-console
    console.log(`%c${formatted}`, `color: ${categoryColor}`, ...args);
  }

  /**
   * Log an info message
   */
  info(category: LogCategory, message: string, ...args: unknown[]): void {
    if (!this.shouldLog("info", category)) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level: "info",
      category,
      message,
      args,
    };

    this.addToBuffer(entry);

    const formatted = this.formatMessage(category, message);
    const categoryColor = CATEGORY_CONFIG[category].color;

    // eslint-disable-next-line no-console
    console.log(`%c${formatted}`, `color: ${categoryColor}; font-weight: bold`, ...args);
  }

  /**
   * Log a warning message
   */
  warn(category: LogCategory, message: string, ...args: unknown[]): void {
    if (!this.shouldLog("warn", category)) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level: "warn",
      category,
      message,
      args,
    };

    this.addToBuffer(entry);

    const formatted = this.formatMessage(category, message);

    console.warn(formatted, ...args);
  }

  /**
   * Log an error message
   */
  error(category: LogCategory, message: string, ...args: unknown[]): void {
    if (!this.shouldLog("error", category)) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level: "error",
      category,
      message,
      args,
    };

    this.addToBuffer(entry);

    const formatted = this.formatMessage(category, message);

    console.error(formatted, ...args);
  }

  /**
   * Get log buffer
   */
  getBuffer(): LogEntry[] {
    return [...this.config.buffer];
  }

  /**
   * Clear log buffer
   */
  clearBuffer(): void {
    this.config.buffer = [];
  }

  /**
   * Export logs as formatted text
   */
  exportLogs(): string {
    return this.config.buffer
      .map((entry) => {
        const timestamp = entry.timestamp.toISOString();
        const categoryName = CATEGORY_CONFIG[entry.category].name;
        const argsStr = entry.args.length > 0 ? " " + JSON.stringify(entry.args) : "";
        return `[${timestamp}] [${entry.level.toUpperCase()}] [${categoryName}] ${entry.message}${argsStr}`;
      })
      .join("\n");
  }

  /**
   * Get current configuration
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }
}

/**
 * Singleton logger instance
 */
export const logger = new Logger();

/**
 * Initialize logger with settings from store
 * Call this from a React effect when the app starts
 */
export function initLogger(config: {
  enabled: boolean;
  level: LogLevel;
  categories: Record<LogCategory, boolean>;
}): void {
  const enabledCategories = new Set<LogCategory>(
    (Object.entries(config.categories) as [LogCategory, boolean][])
      .filter(([, enabled]) => enabled)
      .map(([category]) => category)
  );

  logger.init({
    enabled: config.enabled,
    level: config.level,
    categories: enabledCategories,
  });
}
