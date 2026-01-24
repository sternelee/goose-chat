// Stub for electron-log
export default {
  info: (...args: unknown[]) => console.log('[electron-log]', ...args),
  error: (...args: unknown[]) => console.error('[electron-log]', ...args),
  warn: (...args: unknown[]) => console.warn('[electron-log]', ...args),
  debug: (...args: unknown[]) => console.debug('[electron-log]', ...args),
  verbose: (...args: unknown[]) => console.log('[electron-log]', ...args),
  silly: (...args: unknown[]) => console.log('[electron-log]', ...args),
};

export const transports = {};
export const levels = {};
