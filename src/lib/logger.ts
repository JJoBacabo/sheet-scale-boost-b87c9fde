// Conditional logger - only logs in development
const isDevelopment = import.meta.env.DEV;

type LogLevel = 'log' | 'error' | 'warn' | 'info' | 'debug';

class Logger {
  private log(level: LogLevel, ...args: unknown[]) {
    if (isDevelopment) {
      console[level](...args);
    }
  }

  info(...args: unknown[]) {
    this.log('info', ...args);
  }

  error(...args: unknown[]) {
    this.log('error', ...args);
  }

  warn(...args: unknown[]) {
    this.log('warn', ...args);
  }

  debug(...args: unknown[]) {
    this.log('debug', ...args);
  }
}

export const logger = new Logger();
