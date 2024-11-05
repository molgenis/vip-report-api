import { describe, expect, test, vi } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { WindowApiClient } from "../WindowApiClient";

import { Metadata } from "../index";

describe("window api client", () => {
  vi.stubGlobal("window", {});

  test("get records", async () => {
    window.api = {
      metadata: {
        app: {
          name: "vcf-report",
          version: "0.0.1",
          args: "-i test.vcf -d",
        },
        htsFile: {
          htsFormat: "VCF",
          uri: "file://file0.vcf.gz",
          genomeAssembly: "GRCh38",
        },
      } as unknown as Metadata,
      data: {
        samples: [
          {
            name: "Patient",
          },
          {
            name: "Mother",
          },
          {
            name: "Father",
          },
        ],
        phenotypes: [],
      },
      binary: {
        vcf: readFileSync(path.join(__dirname, "trio.vcf")),
      },
    };

    const apiClient = new WindowApiClient();
    const records = await apiClient.getRecords();

    expect(records.total).toBe(2);
  });
});
