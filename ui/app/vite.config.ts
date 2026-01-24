import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    nodePolyfills({
      // Include only the polyfills we need
      include: ["path", "fs", "crypto", "process", "buffer"],
      globals: {
        global: true,
      },
    }),
  ],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,

  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },

  // Resolve configuration
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@api": resolve(__dirname, "src/api"),
      "@components": resolve(__dirname, "src/components"),
      "@lib": resolve(__dirname, "src/lib"),
      "@hooks": resolve(__dirname, "src/hooks"),
      "@routes": resolve(__dirname, "src/routes"),
      "@styles": resolve(__dirname, "src/styles"),
      "@types": resolve(__dirname, "src/types"),
      "@utils": resolve(__dirname, "src/utils"),
      // Electron module stubs
      "electron": resolve(__dirname, "src/electron-stubs.ts"),
      "electron-log": resolve(__dirname, "src/electron-log-stub.ts"),
      "electron-updater": resolve(__dirname, "src/electron-updater-stub.ts"),
      "tauri-axum": resolve(__dirname, "src/tauri-axum-stub.ts"),
    },
  },

  // Build configuration
  build: {
    target: "esnext",
    rollupOptions: {
      input: resolve(__dirname, "index.html"),
    },
  },

  // Optimize dependencies - exclude Tauri plugins from bundling
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "@tauri-apps/api",
      "@radix-ui/react-dialog",
      "@radix-ui/react-select",
      "@radix-ui/themes",
      "swr",
    ],
    exclude: [
      "@tauri-apps/plugin-shell",
      "@tauri-apps/plugin-dialog",
      "@tauri-apps/plugin-fs",
      "@tauri-apps/plugin-opener",
      "@tauri-apps/plugin-os",
      "@tauri-apps/plugin-http",
    ],
  },
});
