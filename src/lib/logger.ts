type LogLevel = "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

function formatEntry(level: LogLevel, event: string, context?: LogContext) {
  const entry: Record<string, unknown> = {
    level,
    event,
    ts: new Date().toISOString(),
  };

  if (context) {
    for (const [key, value] of Object.entries(context)) {
      if (value instanceof Error) {
        entry[key] = value.message;
        entry[`${key}Stack`] = value.stack;
      } else {
        entry[key] = value;
      }
    }
  }

  return JSON.stringify(entry);
}

export const logger = {
  info(event: string, context?: LogContext) {
    console.log(formatEntry("info", event, context));
  },
  warn(event: string, context?: LogContext) {
    console.warn(formatEntry("warn", event, context));
  },
  error(event: string, context?: LogContext) {
    console.error(formatEntry("error", event, context));
  },
};
