import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/e2e/**"],
    testTimeout: 300_000,
    hookTimeout: 300_000
  }
});
