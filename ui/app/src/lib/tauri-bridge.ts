/**
 * Tauri API Bridge
 *
 * This file provides Tauri equivalents for Electron APIs (window.electron).
 * It bridges the gap between the Electron-based desktop app and Tauri.
 */

import { invoke } from '@tauri-apps/api/core';
import { openUrl, revealItemInDir } from '@tauri-apps/plugin-opener';
import { platform } from '@tauri-apps/plugin-os';
import { getVersion as getAppVersion } from '@tauri-apps/api/app';
import {
  open,
  save,
  message as showMessage,
  MessageDialogOptions
} from '@tauri-apps/plugin-dialog';

// ============================================================================
// PLATFORM DETECTION
// ============================================================================

/**
 * Get the current platform using Tauri OS plugin
 * Returns 'darwin', 'linux', or 'win32'
 */
export async function getPlatform(): Promise<'darwin' | 'linux' | 'win32'> {
  const osPlatform = await platform();
  // Convert Tauri platform type to Electron format
  switch (osPlatform) {
    case 'macos':
      return 'darwin';
    case 'windows':
      return 'win32';
    case 'linux':
      return 'linux';
    default:
      return 'linux'; // fallback
  }
}

/**
 * Synchronous platform detection using userAgent (fallback)
 * This is used when async platform detection is not available
 */
export const platformSync = (): 'darwin' | 'linux' | 'win32' => {
  const userAgent = window.navigator.userAgent;
  if (userAgent.includes('Mac')) return 'darwin';
  if (userAgent.includes('Linux')) return 'linux';
  if (userAgent.includes('Win')) return 'win32';
  return 'linux'; // fallback
};

/**
 * Check if the app is running on macOS
 */
export async function isMacOS(): Promise<boolean> {
  const p = await platform();
  return p === 'macos';
}

/**
 * Check if the app is running on Windows
 */
export async function isWindows(): Promise<boolean> {
  const p = await platform();
  return p === 'windows';
}

/**
 * Check if the app is running on Linux
 */
export async function isLinux(): Promise<boolean> {
  const p = await platform();
  return p === 'linux';
}

/**
 * Get the OS type
 */
export async function getOsType(): Promise<'Linux' | 'Darwin' | 'Windows_NT' | 'unknown'> {
  const osPlatform = await platform();
  switch (osPlatform) {
    case 'macos':
      return 'Darwin';
    case 'windows':
      return 'Windows_NT';
    case 'linux':
      return 'Linux';
    default:
      return 'unknown';
  }
}

// ============================================================================
// SERVER & API
// ============================================================================

/**
 * Get the secret key for API authentication
 */
export async function getSecretKey(): Promise<string> {
  return invoke<string>('get_secret_key');
}

/**
 * Get the server status
 */
export async function getServerStatus(): Promise<string> {
  return invoke<string>('get_server_status');
}

/**
 * Get the goosed host and port (always localhost for Tauri)
 */
export async function getGoosedHostPort(): Promise<string> {
  return ''; // Empty string indicates local/embedded server
}

// ============================================================================
// WINDOW MANAGEMENT
// ============================================================================

/**
 * Create a new chat window (not yet implemented for Tauri)
 * TODO: Implement using Tauri multi-window support
 */
export async function createChatWindow(
  initialMessage?: string,
  _workingDir?: string
): Promise<void> {
  // Tauri multi-window support is different from Electron
  // For now, we'll use hash navigation to create a "new" chat
  console.warn('[Tauri] Multi-window support not yet implemented, using hash navigation instead');

  if (initialMessage) {
    window.location.hash = `/pair?initial=${encodeURIComponent(initialMessage)}`;
  } else {
    window.location.hash = '/';
  }
}

/**
 * Close the current window
 */
export async function closeWindow(): Promise<void> {
  invoke('close_window');
}

/**
 * Reload the app
 */
export async function reloadApp(): Promise<void> {
  invoke('reload_app');
}

/**
 * Get the app version
 */
export async function getVersion(): Promise<string> {
  try {
    return await getAppVersion();
  } catch {
    return invoke<string>('get_version');
  }
}

// ============================================================================
// FILE SYSTEM OPERATIONS
// ============================================================================

/**
 * Get path for a file (convert from file reference)
 */
export function getPathForFile(file: File): string {
  // In Tauri, file inputs work differently
  // The file path is available in the File object
  return (file as any).path || '';
}

/**
 * Read file content
 */
export async function readFile(filePath: string): Promise<string> {
  return invoke<string>('read_file', { filePath });
}

/**
 * Write file content
 */
export async function writeFile(filePath: string, content: string): Promise<boolean> {
  return invoke<boolean>('write_file', { filePath, content });
}

/**
 * List files in a directory
 */
export async function listFiles(dirPath: string): Promise<string[]> {
  return invoke<string[]>('list_files', { dirPath });
}

/**
 * Select a file or directory using dialog
 */
export async function selectFileOrDirectory(
  defaultPath?: string,
  isDirectory?: boolean
): Promise<string | undefined> {
  if (isDirectory) {
    const result = await open({
      directory: true,
      multiple: false,
      defaultPath,
    });
    return result?.[0];
  }

  const result = await open({
    multiple: false,
    defaultPath,
  });
  return result?.[0];
}

/**
 * Open directory chooser dialog
 */
export async function directoryChooser(): Promise<string | undefined> {
  const result = await open({
    directory: true,
    multiple: false,
  });
  return result?.[0];
}

/**
 * Show save file dialog
 */
export async function showSaveDialog(defaultName?: string): Promise<string | undefined> {
  const result = await save({
    defaultPath: defaultName,
  });
  return result;
}

/**
 * Show message box dialog
 */
export async function showMessageBox(
  title: string,
  bodyMessage: string,
  kind: 'info' | 'warning' | 'error' = 'info'
): Promise<void> {
  const options: MessageDialogOptions = {
    title,
    kind: kind === 'error' ? 'error' : kind === 'warning' ? 'warning' : 'info',
  };
  await showMessage(bodyMessage, options);
}

/**
 * Open a directory in the native file explorer/finder
 * Uses the revealItemInDir function from plugin-opener
 */
export async function openDirectoryInExplorer(dirPath: string): Promise<void> {
  await revealItemInDir(dirPath);
}

/**
 * Open an external URL
 */
export async function openExternal(url: string): Promise<void> {
  await openUrl(url);
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Get settings from configuration
 */
export async function getSettings(): Promise<Record<string, unknown>> {
  return invoke<Record<string, unknown>>('get_settings');
}

/**
 * Save settings to configuration
 */
export async function saveSettings(settings: Record<string, unknown>): Promise<void> {
  await invoke('save_settings', { settings });
}

/**
 * Get a config value by key
 */
export async function getConfig(key: string): Promise<unknown> {
  return invoke<unknown>('get_config', { key });
}

/**
 * Get spellcheck state
 */
export async function getSpellcheckState(): Promise<boolean> {
  return invoke<boolean>('get_spellcheck_state');
}

/**
 * Set spellcheck state
 */
export async function setSpellcheck(enabled: boolean): Promise<void> {
  await invoke('set_spellcheck', { enabled });
}

// ============================================================================
// RECIPE MANAGEMENT
// ============================================================================

/**
 * Check if a recipe was accepted before
 */
export async function hasAcceptedRecipeBefore(recipeHash: string): Promise<boolean> {
  return invoke<boolean>('has_accepted_recipe_before', { recipeHash });
}

/**
 * Record a recipe hash as accepted
 */
export async function recordRecipeHash(recipeHash: string): Promise<void> {
  await invoke('record_recipe_hash', { recipeHash });
}

// ============================================================================
// UI STATE
// ============================================================================

/**
 * Get menu bar icon state
 */
export async function getMenuBarIcon(): Promise<boolean> {
  return invoke<boolean>('get_menu_bar_icon');
}

/**
 * Set menu bar icon state
 */
export async function setMenuBarIcon(enabled: boolean): Promise<void> {
  await invoke('set_menu_bar_icon', { enabled });
}

/**
 * Get dock icon state (macOS only)
 */
export async function getDockIcon(): Promise<boolean> {
  return invoke<boolean>('get_dock_icon');
}

/**
 * Set dock icon state (macOS only)
 */
export async function setDockIcon(enabled: boolean): Promise<void> {
  await invoke('set_dock_icon', { enabled });
}

/**
 * Get wakelock state
 */
export async function getWakelock(): Promise<boolean> {
  return invoke<boolean>('get_wakelock');
}

/**
 * Set wakelock state
 */
export async function setWakelock(enabled: boolean): Promise<void> {
  await invoke('set_wakelock', { enabled });
}

/**
 * Get menu bar icon state (alternative name for compatibility)
 */
export async function getMenuBarIconState(): Promise<boolean> {
  return getMenuBarIcon();
}

/**
 * Get dock icon state (alternative name for compatibility)
 */
export async function getDockIconState(): Promise<boolean> {
  return getDockIcon();
}

/**
 * Get wakelock state (alternative name for compatibility)
 */
export async function getWakelockState(): Promise<boolean> {
  return getWakelock();
}

/**
 * Open notifications settings
 */
export async function openNotificationsSettings(): Promise<void> {
  await invoke('open_notifications_settings');
}

// ============================================================================
// EXTENSIONS
// ============================================================================

/**
 * Get allowed extensions list
 */
export async function getAllowedExtensions(): Promise<string[]> {
  return invoke<string[]>('get_allowed_extensions');
}

/**
 * Add a directory to recent directories
 */
export async function addRecentDir(dir: string): Promise<void> {
  await invoke('add_recent_dir', { dir });
}

// ============================================================================
// EVENT SYSTEM
// ============================================================================

// Event listener registry
const eventListeners = new Map<string, Set<(data: unknown) => void>>();

/**
 * Subscribe to a backend event
 */
export async function on(eventName: string, callback: (data: unknown) => void): Promise<void> {
  await invoke('subscribe_events');

  if (!eventListeners.has(eventName)) {
    eventListeners.set(eventName, new Set());
  }
  eventListeners.get(eventName)!.add(callback);
}

/**
 * Unsubscribe from a backend event
 */
export async function off(eventName: string, callback: (data: unknown) => void): Promise<void> {
  const listeners = eventListeners.get(eventName);
  if (listeners) {
    listeners.delete(callback);
    if (listeners.size === 0) {
      eventListeners.delete(eventName);
    }
  }
  await invoke('unsubscribe_events');
}

/**
 * Emit a backend event
 */
export async function emit(eventName: string, data: unknown): Promise<void> {
  await invoke('emit_event', { event: eventName, data });
}

// ============================================================================
// AUTO-UPDATER (Electron compatibility - stubs for Tauri)
// ============================================================================

/**
 * Get update state (stub for Tauri compatibility)
 */
export async function getUpdateState(): Promise<{
  updateAvailable: boolean;
  latestVersion: string | null;
} | null> {
  // Tauri doesn't have built-in auto-update like Electron
  // Return null to indicate no update state available
  return null;
}

/**
 * Check if using GitHub fallback (stub for Tauri)
 */
export async function isUsingGitHubFallback(): Promise<boolean> {
  return false;
}

/**
 * Subscribe to updater events (stub for Tauri)
 */
export async function onUpdaterEvent(
  _callback: (event: { event: string; data?: unknown }) => void
): Promise<() => void> {
  // Return an unsubscribe function that does nothing
  return () => {};
}

/**
 * Check for updates (stub for Tauri)
 */
export async function checkForUpdates(): Promise<void> {
  // No-op for Tauri
}

/**
 * Download update (stub for Tauri)
 */
export async function downloadUpdate(): Promise<void> {
  // No-op for Tauri
}

/**
 * Install update and restart (stub for Tauri)
 */
export async function installUpdate(): Promise<void> {
  // No-op for Tauri
}

// ============================================================================
// ELECTRON COMPATIBILITY EXPORT
// ============================================================================

/**
 * Create the electron-compatible API object
 */
export const electron = {
  getSecretKey,
  getGoosedHostPort: async () => '',
  platform: platformSync,
  createChatWindow,
  readFile,
  writeFile,
  listFiles,
  selectFileOrDirectory,
  directoryChooser,
  showSaveDialog,
  showMessageBox,
  openDirectoryInExplorer,
  openExternal,
  getSettings,
  saveSettings,
  getConfig,
  getSpellcheckState,
  setSpellcheck,
  hasAcceptedRecipeBefore,
  recordRecipeHash,
  getMenuBarIcon,
  setMenuBarIcon,
  getMenuBarIconState,
  getDockIcon,
  setDockIcon,
  getDockIconState,
  getWakelock,
  setWakelock,
  getWakelockState,
  openNotificationsSettings,
  getAllowedExtensions,
  addRecentDir,
  on,
  off,
  emit,
  closeWindow,
  reloadApp,
  getVersion,
  // Auto-updater stubs
  getUpdateState,
  isUsingGitHubFallback,
  onUpdaterEvent,
  checkForUpdates,
  downloadUpdate,
  installUpdate,
};

// Attach to window for backward compatibility
if (typeof window !== 'undefined') {
  (window as any).electron = electron;
}

export default electron;
