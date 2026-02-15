import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiProxyTarget = process.env.API_PROXY_TARGET || "http://localhost:5001";
const allowedHostsEnv = process.env.VITE_ALLOWED_HOSTS;
const allowedHosts = allowedHostsEnv
  ? allowedHostsEnv
      .split(",")
      .map((host) => host.trim())
      .filter((host) => host.length > 0)
  : true;

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/static/spa/" : "/",
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts,
    proxy: {
      "/api": {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "../src/ebay_watchlist/web/static/spa",
    emptyOutDir: true,
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./vitest.setup.ts",
    include: ["src/**/*.{test,spec}.ts", "src/**/*.{test,spec}.tsx"],
  },
}));
