/**
 * Simple structured logger for Marten.
 *
 * In production, swap this out for a proper observability SDK (e.g. Pino,
 * OpenTelemetry). For now it writes JSON lines to stdout.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const CURRENT_LEVEL: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) || "info";

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[CURRENT_LEVEL];
}

function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      message: err.message,
      stack: err.stack,
      name: err.name,
    };
  }
  return { message: String(err) };
}

function write(
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>,
): void {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };

  const output = JSON.stringify(entry);

  if (level === "error") {
    process.stderr.write(output + "\n");
  } else {
    process.stdout.write(output + "\n");
  }
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) =>
    write("debug", message, meta),

  info: (message: string, meta?: Record<string, unknown>) =>
    write("info", message, meta),

  warn: (message: string, meta?: Record<string, unknown>) =>
    write("warn", message, meta),

  error: (
    messageOrMeta: string | ({ err: unknown } & Record<string, unknown>),
    message?: string,
  ) => {
    if (!shouldLog("error")) return;

    if (typeof messageOrMeta === "string") {
      // Simple: logger.error("message")
      write("error", messageOrMeta);
    } else {
      // Structured: logger.error({ err, investigationId }, "descriptive message")
      const { err, ...rest } = messageOrMeta;
      const errorObj = err ? serializeError(err) : undefined;
      write("error", message ?? "An error occurred", {
        ...rest,
        ...(errorObj ? { error: errorObj } : {}),
      });
    }
  },
};
