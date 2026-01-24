import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { invoke } from '@tauri-apps/api/core';
import { ConfigProvider } from './components/ConfigContext';
import './lib/tauri-bridge';
import { ErrorBoundary } from './components/ErrorBoundary';
import SuspenseLoader from './suspense-loader';
import { client } from './api/client.gen';
import { setTelemetryEnabled } from './utils/analytics';
import { readConfig } from './api';

const App = lazy(() => import('./App'));

const TELEMETRY_CONFIG_KEY = 'GOOSE_TELEMETRY_ENABLED';

/**
 * Initialize the Tauri app with API client configuration
 */
(async () => {
  console.log('Goose Tauri app initializing...');

  // Initialize window.appConfig for Tauri compatibility
  // This provides a simple get() method that reads from localStorage
  // For Tauri, environment variables are stored in localStorage during build/startup
  if (!window.appConfig) {
    window.appConfig = {
      get: (key: string): string | undefined => {
        // Try localStorage first
        const value = localStorage.getItem(`GOOSE_ENV_${key}`);
        if (value !== null) {
          return value;
        }
        // Fallback to checking process.env if available
        return (window as any).process?.env?.[key];
      },
    };
  }

  // For Tauri, we use the tauri-axum bridge which doesn't need a host:port
  // The API calls will be routed through the local_app_request Tauri command
  const secretKey = await invoke<string>('get_secret_key');

  console.log('Configuring API client with tauri-axum bridge');

  // Configure the API client to use our custom fetch implementation
  // The tauriFetch function will be set up in the api client
  client.setConfig({
    baseUrl: '',  // Empty base URL since we're using tauri-axum
    headers: {
      'Content-Type': 'application/json',
      'X-Secret-Key': secretKey,
    },
    // Use the fetch implementation from tauri-axum
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const secretKey = await invoke<string>('get_secret_key');
      const request = new Request(input, init);
      request.headers.set('X-Secret-Key', secretKey);

      // Convert to LocalRequest format
      const url = new URL(request.url);
      const method = request.method;
      const headers: Record<string, string> = {};
      request.headers.forEach((value, key) => {
        headers[key] = value;
      });

      let body: string | undefined;
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        body = await request.text();
      }

      const localRequest = {
        method,
        uri: url.pathname + url.search,
        headers,
        body,
      };

      // Invoke the Tauri command
      const localResponse = await invoke<{
        status_code: number;
        body: number[];
        headers: Record<string, string>;
      }>('local_app_request', {
        localRequest,
      });

      // Convert body bytes to text
      let responseBody: BodyInit | null = null;
      if (localResponse.body && localResponse.body.length > 0) {
        const contentType = localResponse.headers['content-type'] || '';
        if (contentType.includes('application/json') || contentType.includes('text/')) {
          const decoder = new TextDecoder();
          responseBody = decoder.decode(new Uint8Array(localResponse.body));
        } else {
          responseBody = new Uint8Array(localResponse.body);
        }
      }

      return new Response(responseBody, {
        status: localResponse.status_code,
        headers: localResponse.headers,
      });
    },
  });

  try {
    const telemetryResponse = await readConfig({
      body: { key: TELEMETRY_CONFIG_KEY, is_secret: false },
    });
    const isTelemetryEnabled = telemetryResponse.data !== false;
    setTelemetryEnabled(isTelemetryEnabled);
  } catch (error) {
    console.warn('[Analytics] Failed to initialize analytics:', error);
    // Don't fail the app if telemetry fails
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <Suspense fallback={SuspenseLoader()}>
        <ConfigProvider>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </ConfigProvider>
      </Suspense>
    </React.StrictMode>
  );
})();
