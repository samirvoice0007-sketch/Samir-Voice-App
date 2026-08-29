import type { Plugin } from "vite";
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
// @ts-expect-error JS plugin alongside the TS vite config
import { grokPwaPlugin } from "./scripts/grok-pwa-plugin.mjs";
// @ts-expect-error JS plugin alongside the TS vite config
import { appEnvPlugin } from "./scripts/app-env-plugin.mjs";

// `0.0.0.0:8080` matches Render's expectation of a server that listens on
// every interface; Render assigns the port via `$PORT` at runtime, which
// Nitro's node-server preset already reads automatically.
export default defineConfig(({ command, isPreview }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 8081,
    strictPort: true,
  },
  resolve: { tsconfigPaths: true },
  plugins: [
    // Dev-only /__app-env probe (harmless if nothing reads it anymore).
    appEnvPlugin(),
    // PWA head tag + manifest + /?install=1 page; runs before Start/Nitro.
    grokPwaPlugin(),
    tailwindcss(),
    tanstackStart(),
    ...(command === "build" || isPreview
      ? [
          nitro({
            // Was "vercel" (this project was originally scaffolded for
            // Vercel's serverless output format). Render just runs a plain
            // Node process, so we need Nitro's generic Node server build
            // instead — this is what makes `node .output/server/index.mjs`
            // (the "start" script) a real, runnable file.
            preset: "node-server",
            serverDir: "./server",
          }) as Plugin,
        ]
      : []),
    viteReact(),
  ],
}));
