// Stub types for tauri-axum module
// These match the actual tauri-axum API

export interface LocalRequest {
  uri: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

/**
 * Body type for LocalResponse
 * Can be:
 * - string: text content or JSON string values
 * - boolean: JSON boolean (true/false)
 * - number: JSON number
 * - null: JSON null
 * - object: JSON object
 * - array: JSON array
 * - number[]: binary data (array of bytes)
 */
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
