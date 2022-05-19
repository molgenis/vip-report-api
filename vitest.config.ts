import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      all: true,
      lines: 65,
      functions: 65,
      branches: 65,
      statements: 65,
    },
  },
});
