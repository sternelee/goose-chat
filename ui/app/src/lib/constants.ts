/**
 * Application constants
 */

export const APP_NAME = "Goose";
export const APP_VERSION = "1.21.0";

export const DEFAULT_WINDOW_CONFIG = {
  width: 1400,
  height: 900,
  minWidth: 1000,
  minHeight: 700,
  resizable: true,
} as const;

/**
 * API endpoints
 */
export const API_ENDPOINTS = {
  STATUS: "/status",
  REPLY: "/reply",
  SESSIONS: "/sessions",
  AGENT: "/agent",
  CONFIG: "/config",
  RECIPES: "/recipes",
  EXTENSIONS: "/extensions",
  SCHEDULE: "/schedule",
  SETUP: "/setup",
} as const;

/**
 * Message types
 */
export const MESSAGE_TYPES = {
  USER: "user",
  ASSISTANT: "assistant",
  SYSTEM: "system",
  TOOL_REQUEST: "tool_request",
  TOOL_RESPONSE: "tool_response",
} as const;

/**
 * Event types
 */
export const EVENT_TYPES = {
  MESSAGE: "message",
  ERROR: "error",
  STATUS_CHANGE: "status_change",
  SESSION_CREATED: "session_created",
  SESSION_UPDATED: "session_updated",
} as const;

/**
 * Keyboard shortcuts
 */
export const SHORTCUTS = {
  NEW_CHAT: "CmdOrCtrl+N",
  TOGGLE_SIDEBAR: "CmdOrCtrl+B",
  OPEN_SETTINGS: "CmdOrCtrl+,",
  FOCUS_INPUT: "CmdOrCtrl+L",
} as const;
