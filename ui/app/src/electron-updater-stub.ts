// Stub for electron-updater
export interface UpdateInfo {
  version: string;
  files: unknown[];
  releaseDate: string;
  path?: string;
  sha512?: string;
}

export interface AutoUpdater {
  checkForUpdates(): Promise<void>;
  setFeedURL(options: { url: string }): void;
  on(event: string, callback: (...args: unknown[]) => void): void;
  once(event: string, callback: (...args: unknown[]) => void): void;
  removeListener(event: string, callback: (...args: unknown[]) => void): void;
}

export const autoUpdater: AutoUpdater = {
  checkForUpdates: async () => {},
  setFeedURL: () => {},
  on: () => {},
  once: () => {},
  removeListener: () => {},
};
