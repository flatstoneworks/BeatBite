type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

const currentLevel: LogLevel = (typeof __LOG_LEVEL__ !== 'undefined' ? __LOG_LEVEL__ : 'debug') as LogLevel;

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= LEVELS[currentLevel];
}

export const logger = {
  debug: (...args: unknown[]) => { if (shouldLog('debug')) console.log(...args); },
  info: (...args: unknown[]) => { if (shouldLog('info')) console.log(...args); },
  warn: (...args: unknown[]) => { if (shouldLog('warn')) console.warn(...args); },
  error: (...args: unknown[]) => { if (shouldLog('error')) console.error(...args); },
};
