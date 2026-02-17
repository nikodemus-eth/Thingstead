import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import process from "node:process";

export default defineConfig({
  plugins: [react()],
  server: process.env.OPENCLAW_API_PROXY
    ? {
        proxy: {
          "/api": {
            target: process.env.OPENCLAW_API_PROXY,
            changeOrigin: true,
          },
        },
      }
    : undefined,
  test: {
    include: ["src/**/*.{test,spec}.{js,jsx,ts,tsx}"],
    environment: "jsdom",
    setupFiles: ["./src/test/setup.js"],
    globals: true,
    restoreMocks: true,
    clearMocks: true,
  },
});
