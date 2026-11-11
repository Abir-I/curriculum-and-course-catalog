import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The browser calls /api/... on port 5173; Vite forwards it to the API on port 3000.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { "/api": "http://localhost:3000" } },
  test: { environment: "jsdom", setupFiles: ["./src/test-setup.js"], globals: false },
});
