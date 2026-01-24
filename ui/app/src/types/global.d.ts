/**
 * Global type declarations for Tauri app
 * These provide stub types for Electron modules to allow TypeScript compilation
 */

declare module 'tauri-axum' {
  export interface LocalRequest {
    uri: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
  }

  export type LocalResponseBody =
    | string
    | boolean
    | number
    | null
    | Record<string, unknown>
    | unknown[]
    | number[];

  export interface LocalResponse {
    status_code: number;
    body: LocalResponseBody;
    headers: Record<string, string>;
    is_sse?: boolean;
  }
}

declare module 'electron-log' {
  interface Transport {
    log(message: any): void;
  }

  interface LogFunctions {
    transports: {
      file: Transport;
      console: Transport;
    };
  }

  const log: Console & LogFunctions;
  const error: Console['error'];
  const warn: Console['warn'];
  const info: Console['info'];
  const debug: Console['debug'];
  const verbose: Console['debug'];

  export default log;
}

declare module 'electron-updater' {
  export interface UpdateInfo {
    version: string;
  }

  export interface UpdateCheckResult {
    updateInfo: UpdateInfo;
    cancellationToken?: any;
  }

  export interface AutoUpdater {
    autoDownload: boolean;
    autoInstallOnAppQuit: boolean;
    forceDevUpdateConfig: boolean;
    channel: string;
    allowPrerelease: boolean;
    allowDowngrade: boolean;
    logger: any;
    currentVersion: any;
    checkForUpdates(): Promise<UpdateCheckResult>;
    downloadUpdate(): Promise<void>;
    quitAndInstall(): void;
    on(event: string, callback: (...args: any[]) => void): void;
    removeAllListeners(): void;
    getFeedURL(): string | undefined;
  }

  export const autoUpdater: AutoUpdater;
}

declare module 'electron' {
  export interface Process {
    resourcesPath?: string;
  }

  export const process: Process;

  export interface App {
    getPath(name: string): string;
    getVersion(): string;
    isPackaged: boolean;
    on(event: string, callback: (...args: any[]) => void): void;
    once(event: string, callback: (...args: any[]) => void): void;
  }

  export const app: App;

  export interface IpcMain {
    on(channel: string, callback: (...args: any[]) => void): void;
    handle(channel: string, callback: (...args: any[]) => any): void;
  }

  export const ipcMain: IpcMain;

  export interface BrowserWindow {
    getAllWindows(): BrowserWindow[];
    focused: boolean;
    webContents: any;
  }
}
