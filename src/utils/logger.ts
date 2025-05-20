// Logger utility for centralized logging control
const LOG_PREFIX = 'SUM-AI';

// Environment-based logging configuration
const logLevel = process.env.REACT_APP_LOG_LEVEL || 'INFO';
const isLoggingEnabled = logLevel !== 'NONE';

// Log levels
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  NONE = 'NONE'
}

// Logger interface
interface Logger {
  debug: (message: string, ...args: any[]) => void;
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
}

// Create a logger instance for a specific context
export function createLogger(context: string): Logger {
  const formatMessage = (level: LogLevel, message: string) => 
    `${LOG_PREFIX} - ${context} [${level}]: ${message}`;

  const shouldLog = (level: LogLevel) => {
    if (!isLoggingEnabled) return false;
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    return levels.indexOf(level) >= levels.indexOf(logLevel as LogLevel);
  };

  return {
    debug: (message: string, ...args: any[]) => {
      if (shouldLog(LogLevel.DEBUG)) {
        console.debug(formatMessage(LogLevel.DEBUG, message), ...args);
      }
    },
    info: (message: string, ...args: any[]) => {
      if (shouldLog(LogLevel.INFO)) {
        console.log(formatMessage(LogLevel.INFO, message), ...args);
      }
    },
    warn: (message: string, ...args: any[]) => {
      if (shouldLog(LogLevel.WARN)) {
        console.warn(formatMessage(LogLevel.WARN, message), ...args);
      }
    },
    error: (message: string, ...args: any[]) => {
      if (shouldLog(LogLevel.ERROR)) {
        console.error(formatMessage(LogLevel.ERROR, message), ...args);
      }
    }
  };
}

// Export a default logger for general use
export const logger = createLogger('General'); 