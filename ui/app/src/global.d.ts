// Global type declarations for Tauri app

import { Settings } from './api/client';
import { GooseApp } from './types/chat';

interface Process {
  resourcesPath?: string;
  versions?: {
    chrome: string;
    electron: string;
    node: string;
  };
}

interface AppConfig {
  gooseBin?: string;
  sessionId?: string;
  provider?: string;
  theme?: string;
  spellcheck?: boolean;
  menuBarIcon?: boolean;
  dockIcon?: boolean;
  wakelock?: boolean;
  isCreatingRecipe?: boolean;
  get?(key: string): string | undefined;
}

declare global {
  interface Window {
    // Electron API - replaced by Tauri
    electron?: any;

    // App config - provided by Tauri backend
    appConfig?: AppConfig;

    // Process info
    process?: Process;

    // Tauri API
    __TAURI__?: any;
  }
}

export {};
