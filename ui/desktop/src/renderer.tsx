import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from './components/ConfigContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import SuspenseLoader from './suspense-loader';
import { client } from './api/client.gen';
import './electron-web-mock'; // Initialize web-compatible electron API

const App = lazy(() => import('./App'));

(async () => {
  console.log('web app initialized, connecting to backend');

  // For web deployment, connect to a configurable backend URL
  const baseUrl = process.env.GOOSE_API_URL || import.meta.env.VITE_GOOSE_API_URL || 'http://localhost:5000';
  const secretKey = process.env.GOOSE_SECRET_KEY || import.meta.env.VITE_GOOSE_SECRET_KEY || 'default-secret-key';

  console.log('connecting to backend at', baseUrl);
  client.setConfig({
    baseUrl,
    headers: {
      'Content-Type': 'application/json',
      'X-Secret-Key': secretKey,
    },
  });

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
