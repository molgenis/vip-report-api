import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      all: true,
      lines: 65,
      functions: 65,
      branches: 65,
      statements: 65,
    },
  },
});
