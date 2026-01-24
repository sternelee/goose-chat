/**
 * Tauri HTTP Client for goose-server
 *
 * This client uses the tauri-axum bridge to make requests to the goose-server
 * routes directly within the Tauri process, instead of making HTTP requests.
 *
 * This provides better performance and security by avoiding network overhead.
 */

import { invoke } from "@tauri-apps/api/core";
import { LocalRequest, LocalResponse } from "tauri-axum";

/**
 * Get the current secret key for authentication
 */
async function getSecretKey(): Promise<string> {
  return invoke<string>("get_secret_key");
}

/**
 * Convert a Request object to a LocalRequest for tauri-axum
 */
async function requestToLocalRequest(request: Request): Promise<LocalRequest> {
  const url = new URL(request.url);
  const method = request.method;
  const headers = Object.fromEntries(request.headers.entries());

  // Get the body if present
  let body: string | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    body = await request.text();
  }

  return {
    method,
    uri: url.pathname + url.search,
    headers,
    body,
  };
}

/**
 * Convert a LocalResponse back to a standard Response
 */
function localResponseToResponse(localResponse: LocalResponse): Response {
  // Convert body from bytes (number[]) to appropriate format
  let body: BodyInit | null = null;
  if (localResponse.body && localResponse.body.length > 0) {
    // Check if it's text or binary based on content-type
    const contentType = localResponse.headers["content-type"] || "";
    if (
      contentType.includes("application/json") ||
      contentType.includes("text/")
    ) {
      // For JSON and text, decode the bytes as UTF-8
      const decoder = new TextDecoder();
      body = decoder.decode(new Uint8Array(localResponse.body));
    } else {
      // For binary data, use the bytes directly
      body = new Uint8Array(localResponse.body);
    }
  }

  return new Response(body, {
    status: localResponse.status_code,
    headers: localResponse.headers,
  });
}

/**
 * Custom fetch implementation that uses tauri-axum
 *
 * This replaces the standard fetch with a bridge to the Axum router
 * running inside the Tauri process.
 */
export async function tauriFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  // Get the secret key for authentication
  const secretKey = await getSecretKey();

  // Build the request
  const request = new Request(input, init);

  // For proxy routes, we need to handle them specially
  const url = new URL(request.url);

  // Add the secret key to headers
  request.headers.set("X-Secret-Key", secretKey);

  // Convert to LocalRequest
  const localRequest = await requestToLocalRequest(request);

  // Invoke the Tauri command
  const localResponse = await invoke<LocalResponse>("local_app_request", {
    localRequest,
  });

  return localResponseToResponse(localResponse);
}

/**
 * Create a fetch client wrapper that uses tauriFetch
 */
export function createTauriFetchClient() {
  return {
    fetch: tauriFetch,
    request: async (input: RequestInfo | URL, init?: RequestInit) => {
      const secretKey = await getSecretKey();
      const request = new Request(input, init);
      request.headers.set("X-Secret-Key", secretKey);
      return request;
    },
  };
}

/**
 * SSE (Server-Sent Events) implementation for Tauri
 *
 * Since we can't use native SSE with tauri-axum, we'll need to
 * implement a custom SSE reader using a different mechanism.
 */
export class TauriSSEReader {
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private decoder = new TextDecoder();

  async connect(url: string): Promise<void> {
    const secretKey = await getSecretKey();

    const localRequest: LocalRequest = {
      method: "GET",
      uri: url,
      headers: {
        "X-Secret-Key": secretKey,
        Accept: "text/event-stream",
      },
    };

    const localResponse = await invoke<LocalResponse>("local_app_request", {
      localRequest,
    });

    if (localResponse.body && localResponse.body.length > 0) {
      const stream = new ReadableStream({
        start(controller) {
          const bytes = new Uint8Array(localResponse.body);
          controller.enqueue(bytes);
          controller.close();
        },
      });
      this.reader = stream.getReader();
    }
  }

  async *[Symbol.iterator](): AsyncIterator<string, void, unknown> {
    if (!this.reader) {
      throw new Error("SSE reader not connected");
    }

    try {
      while (true) {
        const { done, value } = await this.reader.read();
        if (done) break;
        const text = this.decoder.decode(value, { stream: true });
        yield text;
      }
    } finally {
      this.reader?.releaseLock();
    }
  }

  async close(): Promise<void> {
    this.reader?.cancel();
    this.reader?.releaseLock();
    this.reader = null;
  }
}

export type { LocalRequest, LocalResponse };
