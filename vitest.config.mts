import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        lines: 65,
        functions: 65,
        branches: 65,
        statements: 65,
      }
    },
  },
});
