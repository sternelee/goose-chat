// Stub implementations for Electron modules to allow TypeScript compilation
// These will be replaced by Tauri APIs at runtime

export interface IPCRenderer {
  send(channel: string, ...args: unknown[]): void;
  sendSync(channel: string, ...args: unknown[]): unknown;
  on(channel: string, listener: (...args: unknown[]) => void): void;
  once(channel: string, listener: (...args: unknown[]) => void): void;
  removeListener(channel: string, listener: (...args: unknown[]) => void): void;
  invoke(channel: string, ...args: unknown[]): Promise<unknown>;
}

export interface BrowserWindow {
  id: number;
  webContents: WebContents;
}

export interface WebContents {
  id: number;
  session: Session;
}

export interface Session {
  storagePath: string;
}

export interface App {
  getPath(name: string): string;
  isPackaged: boolean;
  getVersion(): string;
  getName(): string;
  quit(): void;
  on(name: string, listener: (...args: unknown[]) => void): void;
  once(name: string, listener: (...args: unknown[]) => void): void;
  removeListener(name: string, listener: (...args: unknown[]) => void): void;
}

export interface AutoUpdater {
  checkForUpdates(): Promise<void>;
  setFeedURL(options: { url: string }): void;
  on(event: string, callback: (...args: unknown[]) => void): void;
  once(event: string, callback: (...args: unknown[]) => void): void;
  removeListener(event: string, callback: (...args: unknown[]) => void): void;
}

export interface MenuItem {
  label: string;
  click?: () => void;
  submenu?: MenuItem[];
  role?: string;
  type?: string;
  accelerator?: string;
}

export interface Menu {
  buildFromTemplate(template: MenuItem[]): Menu;
  popup(options?: { x?: number; y?: number }): void;
  append(menuItem: MenuItem): void;
}

export interface MenuItemConstructor {
  label: string;
  click?: () => void;
  submenu?: MenuItemConstructor[];
  role?: string;
  type?: string;
  accelerator?: string;
}

export const ipcRenderer: IPCRenderer = {
  send: () => {},
  sendSync: () => ({}),
  on: () => {},
  once: () => {},
  removeListener: () => {},
  invoke: async () => ({}),
};

export const app: App = {
  getPath: () => '',
  isPackaged: false,
  getVersion: () => '1.0.0',
  getName: () => 'Goose',
  quit: () => {},
  on: () => {},
  once: () => {},
  removeListener: () => {},
};

export const autoUpdater: AutoUpdater = {
  checkForUpdates: async () => {},
  setFeedURL: () => {},
  on: () => {},
  once: () => {},
  removeListener: () => {},
};

export const Menu: {
  buildFromTemplate(template: MenuItemConstructor[]): Menu;
  popup(options?: { x?: number; y?: number }): void;
  append(menuItem: MenuItem): void;
} = {
  buildFromTemplate: () => ({} as unknown as Menu),
  popup: () => {},
  append: () => {},
};

export const remote = {
  BrowserWindow: {},
  Menu,
  getCurrentWindow: () => ({}),
};

export interface Process {
  versions: {
    chrome: string;
    electron: string;
    node: string;
  };
  resourcesPath?: string;
  platform: NodeJS.Platform;
}

export const process: Process = {
  versions: {
    chrome: '',
    electron: '',
    node: '',
  },
  platform: 'darwin',
};

export default {
  ipcRenderer,
  app,
  autoUpdater,
  Menu,
  remote,
  process,
};
