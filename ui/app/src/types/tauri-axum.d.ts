/**
 * Type declarations for tauri-axum module
 *
 * This provides TypeScript types for the LocalRequest and LocalResponse
 * objects used by the tauri-axum bridge for in-process HTTP handling.
 */

export interface LocalRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

export interface LocalResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string | ReadableStream<Uint8Array> | undefined;
}
