import { describe, expect, test, vi } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { WindowApiClient } from "../WindowApiClient";

describe("window api client", () => {
  vi.stubGlobal("window", {});

  test("get records", async () => {
    const response = await fetch("https://download.molgeniscloud.org/downloads/vip/resources/sql-wasm.wasm");
    const wasmArrayBuffer = await response.arrayBuffer();
    const wasmUint8Array = new Uint8Array(wasmArrayBuffer);
    window.api = {
      binary: { wasmBinary: wasmUint8Array },
      database: readFileSync(path.join(__dirname, "data", "trio.db")),
    };

    const apiClient = new WindowApiClient();
    const records = await apiClient.getRecords();

    expect(records.total).toBe(2);
  });
});
