import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import App from "./App";
import { ConfigProvider } from "./components/ConfigContext";
import "./lib/tauri-bridge";
import { ErrorBoundary } from "./components/ErrorBoundary";
import SuspenseLoader from "./suspense-loader";
import { client } from "./api/client.gen";
import { setTelemetryEnabled } from "./utils/analytics";
import { readConfig } from "./api";

const TELEMETRY_CONFIG_KEY = "GOOSE_TELEMETRY_ENABLED";

/**
 * Initialize the Tauri app with API client configuration
 */
(async () => {
  console.log("Goose Tauri app initializing...");

  // IMPORTANT: Configure the fetch function synchronously BEFORE any async operations
  // This ensures that when modules use the client, they get our custom fetch
  let secretKey: string | null = null;
  let fetchReady = false;
  const pendingFetches: Array<() => void> = [];

  /**
   * Create a streaming SSE response using Tauri events
   * Uses a unique channel name per request
   */
  async function createSSEStreamResponse(
    request: Request,
    key: string,
  ): Promise<Response> {
    // Convert to LocalRequest format
    const method = request.method;
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    let body: string | undefined;
    if (request.method !== "GET" && request.method !== "HEAD") {
      body = await request.text();
    }

    // Extract the path from request.url (can be relative or absolute URL)
    let uri = request.url;
    try {
      // Try to parse as URL and extract pathname + search
      const parsed = new URL(request.url);
      uri = parsed.pathname + parsed.search;
    } catch {
      // Already a relative path, use as-is
    }

    const localRequest = {
      method,
      uri,
      headers,
      body,
    };

    // Generate a unique channel name for this request
    const channelName = `sse-channel-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Create the stream that will receive data from Tauri events
    const stream = new ReadableStream({
      async start(controller) {
        const textDecoder = new TextDecoder();
        let buffer = "";
        let ended = false;
        let unlisten: (() => void) | null = null;

        // First, register the listener before invoking the command
        listen(channelName, (event) => {
          try {
            const data = event.payload as any;

            if (data.type === "Headers") {
              // Headers received, ready for chunks
            } else if (data.type === "Chunk") {
              // Convert chunk data (array of numbers) to string and accumulate
              const chunkBytes = new Uint8Array(data.data);
              const text = textDecoder.decode(chunkBytes, { stream: true });
              buffer += text;

              // Process SSE events by splitting on double newlines
              const lines = buffer.split("\n\n");
              buffer = lines.pop() || ""; // Keep the last incomplete part in the buffer

              for (const line of lines) {
                if (line.trim()) {
                  controller.enqueue(new TextEncoder().encode(line + "\n\n"));
                }
              }
            } else if (data.type === "End") {
              // Send any remaining buffer and close
              if (buffer.trim()) {
                controller.enqueue(new TextEncoder().encode(buffer));
              }
              controller.close();
              ended = true;
              unlisten?.();
            } else if (data.type === "Error") {
              controller.error(new Error(data.data || "SSE stream error"));
              ended = true;
              unlisten?.();
            }
          } catch (error) {
            console.error("[SSE] Error processing event:", error);
            controller.error(error);
            ended = true;
            unlisten?.();
          }
        }).then((fn) => {
          unlisten = fn;
          // After listener is registered, pass the channel name to the backend
          localRequest.headers["X-SSE-Channel"] = channelName;

          // Now invoke the streaming command
          invoke<{
            request_id: string;
            status_code: number;
          }>("local_app_request_streaming", {
            localRequest,
          }).catch((error) => {
            console.error("[SSE] Command error:", error);
            controller.error(error);
            ended = true;
            unlisten?.();
          });
        });

        // Timeout cleanup
        setTimeout(() => {
          if (!ended) {
            console.warn("[SSE] Stream timeout, closing");
            if (buffer.trim()) {
              controller.enqueue(new TextEncoder().encode(buffer));
            }
            controller.close();
            unlisten?.();
          }
        }, 60000); // 60 second timeout
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // Configure fetch immediately with a promise-based implementation
  client.setConfig({
    baseUrl: "", // Empty base URL since we're using tauri-axum
    headers: {
      "Content-Type": "application/json",
    },
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      // Wait for secretKey to be available
      if (!fetchReady) {
        await new Promise<void>(resolve => {
          pendingFetches.push(resolve);
        });
      }

      const request = new Request(input, init);

      // Check if this is an SSE request
      const acceptHeader = request.headers.get("Accept");
      const isSseRequest =
        acceptHeader?.includes("text/event-stream") ||
        request.url.includes("/reply");

      if (isSseRequest) {
        return createSSEStreamResponse(request, secretKey!);
      }

      // Use regular tauri-axum for non-SSE requests
      request.headers.set("X-Secret-Key", secretKey!);

      // Convert to LocalRequest format
      const method = request.method;
      const headers: Record<string, string> = {};
      request.headers.forEach((value, key) => {
        headers[key] = value;
      });

      let body: string | undefined;
      if (request.method !== "GET" && request.method !== "HEAD") {
        body = await request.text();
      }

      // Extract the path from request.url (can be relative or absolute URL)
      let uri = request.url;
      try {
        // Try to parse as URL and extract pathname + search
        const parsed = new URL(request.url);
        uri = parsed.pathname + parsed.search;
      } catch {
        // Already a relative path, use as-is
      }

      const localRequest = {
        method,
        uri,
        headers,
        body,
      };

      // Invoke the Tauri command
      const localResponse = await invoke<{
        status_code: number;
        body:
          | string
          | boolean
          | number
          | null
          | Record<string, unknown>
          | unknown[]
          | number[];
        headers: Record<string, string>;
      }>("local_app_request", {
        localRequest,
      });

      // Handle body: can be JSON value (string, boolean, number, null, object, array) or number[] (binary)
      let responseBody: BodyInit;

      const contentType = localResponse.headers["content-type"] || "";
      const isBinaryContentType =
        contentType.includes("application/octet-stream") ||
        contentType.includes("image/") ||
        contentType.includes("application/pdf") ||
        contentType.includes("application/zip");

      if (
        isBinaryContentType &&
        Array.isArray(localResponse.body) &&
        localResponse.body.length > 0 &&
        typeof localResponse.body[0] === "number"
      ) {
        responseBody = new Uint8Array(localResponse.body as number[]);
      } else if (typeof localResponse.body === "string") {
        // String values from JSON need to be wrapped as valid JSON
        // For example: "openrouter" -> "\"openrouter\""
        responseBody = JSON.stringify(localResponse.body);
      } else if (localResponse.body === null || typeof localResponse.body === "boolean" || typeof localResponse.body === "number") {
        responseBody = JSON.stringify(localResponse.body);
      } else {
        responseBody = JSON.stringify(localResponse.body);
      }

      return new Response(responseBody, {
        status: localResponse.status_code,
        headers: localResponse.headers,
      });
    },
  });

  // Initialize window.appConfig for Tauri compatibility

  // For Tauri, we use the tauri-axum bridge which doesn't need a host:port
  // The API calls will be routed through the local_app_request Tauri command
  const key = await invoke<string>("get_secret_key");
  secretKey = key;

  // Now that we have the secret key, unblock all pending fetches
  fetchReady = true;
  pendingFetches.forEach(resolve => resolve());
  pendingFetches.length = 0;

  try {
    const telemetryResponse = await readConfig({
      body: { key: TELEMETRY_CONFIG_KEY, is_secret: false },
    });
    const isTelemetryEnabled = telemetryResponse.data !== false;
    setTelemetryEnabled(isTelemetryEnabled);
  } catch (error) {
    console.warn("[Analytics] Failed to initialize analytics:", error);
    // Don't fail the app if telemetry fails
  }

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <Suspense fallback={SuspenseLoader()}>
        <ConfigProvider>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </ConfigProvider>
      </Suspense>
    </React.StrictMode>,
  );
})();
