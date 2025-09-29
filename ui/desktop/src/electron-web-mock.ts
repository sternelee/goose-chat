// Web-compatible mock for electron API
// This provides the interface that the app expects but works in a web environment

interface ElectronAPI {
  // Main process communication
  getGoosedHostPort: () => Promise<string | null>;
  getSecretKey: () => Promise<string>;
  getConfig: () => any;

  // Window management
  createChatWindow: (...args: any[]) => void;
  closeWindow: () => void;

  // Settings
  getSettings: () => Promise<any>;
  setSchedulingEngine: (engine: string) => Promise<boolean>;
  setMenuBarIcon: (show: boolean) => Promise<boolean>;
  getMenuBarIconState: () => Promise<boolean>;
  setDockIcon: (show: boolean) => Promise<boolean>;
  getDockIconState: () => Promise<boolean>;
  openNotificationsSettings: () => Promise<boolean>;
  setWakelock: (enable: boolean) => Promise<boolean>;
  getWakelockState: () => Promise<boolean>;

  // File system
  selectFileOrDirectory: (defaultPath?: string) => Promise<string | null>;
  directoryChooser: () => Promise<any>;
  readFile: (
    filePath: string
  ) => Promise<{ file: string; filePath: string; error: any; found: boolean }>;
  writeFile: (filePath: string, content: string) => Promise<boolean>;
  ensureDirectory: (dirPath: string) => Promise<boolean>;
  listFiles: (dirPath: string, extension?: string) => Promise<string[]>;
  openDirectoryInExplorer: (path: string) => Promise<boolean>;

  // Dialogs
  showMessageBox: (options: any) => Promise<any>;

  // Notifications
  notify: (data: { title: string; body: string }) => void;
  showNotification: (data: { title: string; body: string }) => void;

  // Logging
  logInfo: (info: any) => void;

  // Power management
  startPowerSaveBlocker: () => Promise<boolean>;
  stopPowerSaveBlocker: () => Promise<boolean>;

  // Recipe management
  hasAcceptedRecipeBefore: (recipeConfig: any) => Promise<boolean>;
  recordRecipeHash: (recipeConfig: any) => Promise<void>;

  // Extensions
  getAllowedExtensions: () => Promise<string[]>;

  // Utilities
  openExternal: (url: string) => Promise<boolean>;
  getBinaryPath: (binaryName: string) => string;
  saveDataUrlToTemp: (
    dataUrl: string,
    uniqueId: string
  ) => Promise<{ id: string; filePath?: string; error?: string }>;
  getTempImage: (filePath: string) => Promise<string | null>;
  deleteTempFile: (filePath: string) => void;
  checkOllama: () => Promise<boolean>;
  fetchMetadata: (url: string) => Promise<string>;
  openInChrome: (url: string) => void;

  // File handling
  getPathForFile: (file: File) => Promise<string>;

  // App lifecycle
  reactReady: () => void;
}

// Create mock implementation
const webElectronAPI: ElectronAPI = {
  getGoosedHostPort: async () => {
    return (
      process.env.GOOSE_API_URL || import.meta.env.VITE_GOOSE_API_URL || 'http://localhost:5000'
    );
  },

  getSecretKey: async () => {
    return (
      process.env.GOOSE_SECRET_KEY || import.meta.env.VITE_GOOSE_SECRET_KEY || 'default-secret-key'
    );
  },

  getConfig: () => {
    return {
      GOOSE_DEFAULT_PROVIDER: process.env.GOOSE_DEFAULT_PROVIDER || 'openai',
      GOOSE_DEFAULT_MODEL: process.env.GOOSE_DEFAULT_MODEL || 'gpt-3.5-turbo',
      GOOSE_API_HOST: 'http://127.0.0.1',
      GOOSE_PORT: process.env.GOOSE_PORT || 5000,
      GOOSE_WORKING_DIR: '',
      GOOSE_BASE_URL_SHARE: process.env.GOOSE_BASE_URL_SHARE,
      GOOSE_VERSION: process.env.GOOSE_VERSION || '1.0.0',
    };
  },

  createChatWindow: (...args) => {
    console.log('createChatWindow called with args:', args);
    // In web environment, just log or implement URL navigation
  },

  closeWindow: () => {
    console.log('closeWindow called');
    // In web environment, might navigate or close modal
  },

  getSettings: async () => {
    return {
      schedulingEngine: 'none',
      showMenuBarIcon: true,
      showDockIcon: true,
      enableWakelock: false,
    };
  },

  setSchedulingEngine: async (engine: string) => {
    console.log('setSchedulingEngine:', engine);
    return true;
  },

  setMenuBarIcon: async (show: boolean) => {
    console.log('setMenuBarIcon:', show);
    return true;
  },

  getMenuBarIconState: async () => {
    return true;
  },

  setDockIcon: async (show: boolean) => {
    console.log('setDockIcon:', show);
    return true;
  },

  getDockIconState: async () => {
    return true;
  },

  openNotificationsSettings: async () => {
    console.log('openNotificationsSettings called');
    return true;
  },

  setWakelock: async (enable: boolean) => {
    console.log('setWakelock:', enable);
    return true;
  },

  getWakelockState: async () => {
    return false;
  },

  selectFileOrDirectory: async (defaultPath?: string) => {
    // In web environment, this would use a file input
    return null;
  },

  directoryChooser: async () => {
    return { canceled: true, filePaths: [] };
  },

  readFile: async (filePath: string) => {
    console.log('readFile called for:', filePath);
    return {
      file: '',
      filePath,
      error: 'File reading not available in web environment',
      found: false,
    };
  },

  writeFile: async (filePath: string, content: string) => {
    console.log('writeFile called for:', filePath);
    return false;
  },

  ensureDirectory: async (dirPath: string) => {
    console.log('ensureDirectory called for:', dirPath);
    return false;
  },

  listFiles: async (dirPath: string, extension?: string) => {
    console.log('listFiles called for:', dirPath, extension);
    return [];
  },

  openDirectoryInExplorer: async (path: string) => {
    console.log('openDirectoryInExplorer called for:', path);
    return false;
  },

  showMessageBox: async (options: any) => {
    console.log('showMessageBox called with:', options);
    return { response: 0 };
  },

  notify: (data: { title: string; body: string }) => {
    console.log('Notification:', data);
    if ('Notification' in window) {
      new Notification(data.title, { body: data.body });
    }
  },

  showNotification: (data: { title: string; body: string }) => {
    webElectronAPI.notify(data);
  },

  logInfo: (info: any) => {
    console.log('Electron log:', info);
  },

  startPowerSaveBlocker: async () => {
    console.log('startPowerSaveBlocker called');
    return true;
  },

  stopPowerSaveBlocker: async () => {
    console.log('stopPowerSaveBlocker called');
    return true;
  },

  hasAcceptedRecipeBefore: async (recipeConfig: any) => {
    console.log('hasAcceptedRecipeBefore called');
    return false;
  },

  recordRecipeHash: async (recipeConfig: any) => {
    console.log('recordRecipeHash called');
  },

  getAllowedExtensions: async () => {
    return [];
  },

  openExternal: async (url: string) => {
    console.log('openExternal called for:', url);
    window.open(url, '_blank');
    return true;
  },

  getBinaryPath: (binaryName: string) => {
    console.log('getBinaryPath called for:', binaryName);
    return binaryName;
  },

  saveDataUrlToTemp: async (dataUrl: string, uniqueId: string) => {
    console.log('saveDataUrlToTemp called for:', uniqueId);
    return { id: uniqueId, error: 'Temp file storage not available in web environment' };
  },

  getTempImage: async (filePath: string) => {
    console.log('getTempImage called for:', filePath);
    return null;
  },

  deleteTempFile: (filePath: string) => {
    console.log('deleteTempFile called for:', filePath);
  },

  checkOllama: async () => {
    console.log('checkOllama called');
    return false;
  },

  fetchMetadata: async (url: string) => {
    console.log('fetchMetadata called for:', url);
    const response = await fetch(url);
    return await response.text();
  },

  openInChrome: (url: string) => {
    console.log('openInChrome called for:', url);
    window.open(url, '_blank');
  },

  getPathForFile: async (file: File) => {
    console.log('getPathForFile called for:', file.name);
    // In web environment, return a mock path or handle differently
    return file.name;
  },

  reactReady: () => {
    console.log('reactReady called');
  },
};

// Make the API available globally
declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

// Attach to window
window.electron = webElectronAPI;

export default webElectronAPI;

