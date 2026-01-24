// Stub types for tauri-axum module
// These match the actual tauri-axum API

export interface LocalRequest {
  uri: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

export interface LocalResponse {
  status_code: number;
  body: number[];
  headers: Record<string, string>;
  is_sse?: boolean;
}
