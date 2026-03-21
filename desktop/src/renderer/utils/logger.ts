/**
 * Logger utility that writes to both console and a log file
 * Logs are written to the app's user data directory
 */

// Always enable logging (logs will be written if API is available)
const LOG_DIR = true;

interface LogEntry {
  timestamp: string;
  level: 'log' | 'warn' | 'error' | 'info';
  message: string;
}

let logBuffer: LogEntry[] = [];
let isWriting = false;

/**
 * Format a log message with timestamp
 */
function formatLogEntry(level: string, args: any[]): LogEntry {
  const timestamp = new Date().toISOString();
  const message = args
    .map((arg) => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    })
    .join(' ');

  return { timestamp, level: level as any, message };
}

/**
 * Flush logs to file (batched for performance)
 */
async function flushLogs() {
  if (isWriting || logBuffer.length === 0) {
    return;
  }

  isWriting = true;
  const entriesToWrite = [...logBuffer];
  logBuffer = [];

  try {
    // Send logs to main process to write to file
    const api = (window as any).api;
    if (api?.logger?.writeLogs) {
      api.logger.writeLogs(entriesToWrite).catch((err: any) => {
        console.error('Failed to write logs:', err);
      });
    }
  } finally {
    isWriting = false;
  }
}

// Flush logs periodically
setInterval(flushLogs, 5000);

// Flush on page unload
window.addEventListener('beforeunload', flushLogs);

/**
 * Logger with file output support
 */
export const logger = {
  log: (...args: any[]) => {
    console.log(...args);
    if (LOG_DIR) {
      const entry = formatLogEntry('log', args);
      logBuffer.push(entry);
      if (logBuffer.length > 100) flushLogs();
    }
  },

  info: (...args: any[]) => {
    console.info(...args);
    if (LOG_DIR) {
      const entry = formatLogEntry('info', args);
      logBuffer.push(entry);
      if (logBuffer.length > 100) flushLogs();
    }
  },

  warn: (...args: any[]) => {
    console.warn(...args);
    if (LOG_DIR) {
      const entry = formatLogEntry('warn', args);
      logBuffer.push(entry);
      if (logBuffer.length > 100) flushLogs();
    }
  },

  error: (...args: any[]) => {
    console.error(...args);
    if (LOG_DIR) {
      const entry = formatLogEntry('error', args);
      logBuffer.push(entry);
      if (logBuffer.length > 100) flushLogs();
    }
  },
};

// Override global console to capture debug logs
if (true) {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  // Keep originals but also log to file for debug logs
  // (logs with emojis are our debug logs)
  const isDebugLog = (args: any[]) => {
    return args.some(
      (arg) =>
        typeof arg === 'string' &&
        /[🎮📊💾🔍✅❌⚠️]/u.test(arg)
    );
  };

  console.log = (...args: any[]) => {
    originalLog(...args);
    if (isDebugLog(args)) {
      const entry = formatLogEntry('log', args);
      logBuffer.push(entry);
      if (logBuffer.length > 100) flushLogs();
    }
  };

  console.warn = (...args: any[]) => {
    originalWarn(...args);
    const entry = formatLogEntry('warn', args);
    logBuffer.push(entry);
    if (logBuffer.length > 100) flushLogs();
  };

  console.error = (...args: any[]) => {
    originalError(...args);
    const entry = formatLogEntry('error', args);
    logBuffer.push(entry);
    if (logBuffer.length > 100) flushLogs();
  };
}
