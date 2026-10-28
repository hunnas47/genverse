import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // The PGlite schema suite boots a WASM Postgres and applies the migration
    // twice; give it room on slower machines.
    hookTimeout: 60_000,
    testTimeout: 30_000,
  },
});
