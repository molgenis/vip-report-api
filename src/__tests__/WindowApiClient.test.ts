import { describe, expect, test, vi } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { WindowApiClient } from "../WindowApiClient";

describe("window api client", () => {
  vi.stubGlobal("window", {});

  test("get records", async () => {
    window.api = {
      binary: { wasmBinary: readFileSync(path.join(__dirname, "sql-wasm.wasm")) },
      database: readFileSync(path.join(__dirname, "data", "trio.db")),
    };

    const apiClient = new WindowApiClient();
    const records = await apiClient.getRecords();

    expect(records.total).toBe(2);
  });
});
