import { beforeEach, expect, test } from "vitest";
import { ApiClient } from "../ApiClient";
import { DecisionTree, Item, Params } from "../Api";
import { EncodedReport } from "../WindowApiClient";
import { readFileSync } from "fs";
import { Record } from "@molgenis/vip-report-vcf/src/Vcf";
import path from "path";
import { parseVcf } from "@molgenis/vip-report-vcf/src/VcfParser";

let api: ApiClient;

const sortAllExpected = {
  page: { number: 0, size: 10, totalElements: 2 },
  total: 2,
};

const record0: Item<Record> = {
  id: 0,
  data: {
    c: "1",
    p: 10042538,
    i: [],
    r: "C",
    a: ["T"],
    q: null,
    f: ["PASS"],
    n: {
      n_array0: ["c", null, "d", "b"],
      n_number2: 1,
      n_object0: [
        ["dummy", "c"],
        ["dummy", null],
        ["dummy", "d"],
        ["dummy", "b"],
      ],
      n_string0: "a",
      n_string3: "b",
      n_string4: "b",
    },
    s: [
      {
        GT: {
          a: [1, 0],
          t: "het",
          p: true,
        },
        DP: "50",
      },
      {
        GT: {
          a: [0, 0],
          t: "hom_r",
          p: true,
        },
        DP: "10",
      },
      {
        GT: {
          a: [0, 0],
          t: "hom_r",
          p: true,
        },
        DP: "10",
      },
    ],
  },
};
const record1: Item<Record> = {
  id: 1,
  data: {
    c: "1",
    p: 16376412,
    i: [],
    r: "G",
    a: ["A"],
    q: null,
    f: ["PASS"],
    n: {
      n_array0: ["b", "c", "a"],
      n_bool3: true,
      n_bool6: true,
      n_bool7: true,
      n_number2: 0,
      n_object0: [
        ["dummy", "b"],
        ["dummy", "c"],
        ["dummy", "a"],
      ],
      n_string0: "a",
      n_string3: "a",
      n_string4: "A",
    },
    s: [
      {
        GT: {
          a: [0, 1],
          t: "het",
          p: true,
        },
        DP: "10",
      },
      {
        GT: {
          a: [1, 0],
          t: "het",
          p: true,
        },
        DP: "11",
      },
      {
        GT: {
          a: [1, 0],
          t: "het",
          p: true,
        },
        DP: "11",
      },
    ],
  },
};

beforeEach(() => {
  const reportData = {
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
    },
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
      fastaGz: {
        "1:17350500-17350600": readFileSync(path.join(__dirname, "interval0.fasta")),
        "2:47637200-47637300": readFileSync(path.join(__dirname, "interval1.fasta")),
      },
      genesGz: readFileSync(path.join(__dirname, "example.gff")),
      cram: {
        Patient: {
          cram: readFileSync(path.join(__dirname, "alignment.cram")),
          crai: readFileSync(path.join(__dirname, "alignment.cram.crai")),
        },
      },
    },
    decisionTree: JSON.parse(readFileSync(path.join(__dirname, "decisionTree.json"), "utf8")) as DecisionTree,
  };

  const vcf = parseVcf(new TextDecoder().decode(reportData.binary.vcf));

  (reportData as unknown as EncodedReport).metadata.records = vcf.metadata;
  (reportData as unknown as EncodedReport).data.records = vcf.data;
  api = new ApiClient(reportData as unknown as EncodedReport);
});

test("getAppMeta", async () => {
  const metadata = await api.getAppMetadata();
  expect(metadata).toEqual(
    expect.objectContaining({
      name: "vcf-report",
      version: "0.0.1",
      args: "-i test.vcf -d",
    })
  );
});

test("getHtsFileMetadata", async () => {
  const metadata = await api.getHtsFileMetadata();
  expect(metadata).toEqual(
    expect.objectContaining({
      genomeAssembly: "GRCh38",
      htsFormat: "VCF",
      uri: "file://file0.vcf.gz",
    })
  );
});

test("get - all samples", async () => {
  const samples = await api.getSamples();
  expect(samples).toEqual({
    items: [
      { id: 0, data: { name: "Patient" } },
      { id: 1, data: { name: "Mother" } },
      { id: 2, data: { name: "Father" } },
    ],
    page: { number: 0, size: 10, totalElements: 3 },
    total: 3,
  });
});

test("get - all records", async () => {
  const records = await api.getRecords();
  expect(records).toEqual({
    items: [record0, record1],
    page: { number: 0, size: 10, totalElements: 2 },
    total: 2,
  });
});

test("get - page of records", async () => {
  const params: Params = {
    page: 1,
    size: 1,
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record1],
    page: { number: 1, size: 1, totalElements: 2 },
    total: 2,
  });
});

test("get - one record", async () => {
  const params: Params = {
    query: {
      selector: ["p"],
      operator: "==",
      args: 10042538,
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record0],
    page: { number: 0, size: 10, totalElements: 1 },
    total: 2,
  });
});

test("get - one record array", async () => {
  const params: Params = {
    query: {
      selector: ["a", 0],
      operator: "==",
      args: "T",
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record0],
    page: { number: 0, size: 10, totalElements: 1 },
    total: 2,
  });
});

test("get - one record with invalid selector", async () => {
  const params: Params = {
    query: {
      selector: ["p", "x", "y", "z"],
      operator: "==",
      args: 10042538,
    },
  };
  await expect(api.getRecords(params)).rejects.toThrow("value '10042538' is of type 'number' instead of 'object'");
});

test("get - records with greater than query", async () => {
  const params: Params = {
    query: {
      selector: ["n", "n_number2"],
      operator: ">",
      args: 0,
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record0],
    page: { number: 0, size: 10, totalElements: 1 },
    total: 2,
  });
});

test("get - records with greater than or equal query", async () => {
  const params: Params = {
    query: {
      selector: ["n", "n_number2"],
      operator: ">=",
      args: 1,
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record0],
    page: { number: 0, size: 10, totalElements: 1 },
    total: 2,
  });
});

test("get - records with less than query", async () => {
  const params: Params = {
    query: {
      selector: ["n", "n_number2"],
      operator: "<",
      args: 1,
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record1],
    page: { number: 0, size: 10, totalElements: 1 },
    total: 2,
  });
});

test("get - records with equals null query", async () => {
  const params: Params = {
    query: {
      selector: ["s", 1, "TEST"],
      operator: "==",
      args: undefined,
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record0, record1],
    page: { number: 0, size: 10, totalElements: 2 },
    total: 2,
  });
});

test("get - records with less than or equal query", async () => {
  const params: Params = {
    query: {
      selector: ["n", "n_number2"],
      operator: "<=",
      args: 1,
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record0, record1],
    page: { number: 0, size: 10, totalElements: 2 },
    total: 2,
  });
});

test("get - records with less than or equal query invalid field", async () => {
  const params: Params = {
    query: {
      selector: ["n", "n_string0"],
      operator: "<=",
      args: 1,
    },
  };
  await expect(api.getRecords(params)).rejects.toThrow("value 'a' is of type 'string' instead of 'number'");
});

test("get - one record with invalid selector", async () => {
  const params: Params = {
    query: {
      selector: ["p", "x", "y", "z"],
      operator: "==",
      args: 10042538,
    },
  };
  await expect(api.getRecords(params)).rejects.toThrow("value '10042538' is of type 'number' instead of 'object'");
});

test("get - one record with invalid selector", async () => {
  const params: Params = {
    query: {
      selector: ["p", "x", "y", "z"],
      operator: "==",
      args: 10042538,
    },
  };
  await expect(api.getRecords(params)).rejects.toThrow("value '10042538' is of type 'number' instead of 'object'");
});

test("get - one record with invalid selector", async () => {
  const params: Params = {
    query: {
      selector: ["p", "x", "y", "z"],
      operator: "==",
      args: 10042538,
    },
  };
  await expect(api.getRecords(params)).rejects.toThrow("value '10042538' is of type 'number' instead of 'object'");
});

test("get - one record using composed and query", async () => {
  const params: Params = {
    query: {
      operator: "and",
      args: [
        {
          selector: "c",
          operator: "==",
          args: "1",
        },
        {
          selector: "p",
          operator: "==",
          args: 10042538,
        },
      ],
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record0],
    page: { number: 0, size: 10, totalElements: 1 },
    total: 2,
  });
});

test("get - all records sorted on n.n_bool0", async () => {
  const params: Params = {
    sort: {
      property: ["n", "n_bool0"],
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test("get - all records sorted on n.n_bool1", async () => {
  const params: Params = {
    sort: {
      property: ["n", "n_bool1"],
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test("get - all records sorted on n.n_bool2", async () => {
  const params: Params = {
    sort: {
      property: ["n", "n_bool2"],
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test("get - all records sorted on n.n_bool3", async () => {
  const params: Params = {
    sort: {
      property: ["n", "n_bool3"],
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record1, record0] } });
});

test("get - all records sorted on n.n_bool4", async () => {
  const params: Params = {
    sort: {
      property: ["n", "n_bool4"],
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test("get - all records sorted on n.n_bool5", async () => {
  const params: Params = {
    sort: {
      property: ["n", "n_bool5"],
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test("get - all records sorted on n.n_bool6", async () => {
  const params: Params = {
    sort: {
      property: ["n", "n_bool6"],
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record1, record0] } });
});

test("get - all records sorted on n.n_bool7", async () => {
  const params: Params = {
    sort: {
      property: ["n", "n_bool7"],
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record1, record0] } });
});

test("get - all records sorted on n.n_bool8", async () => {
  const params: Params = {
    sort: {
      property: ["n", "n_bool8"],
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test("get - all records sorted on n.n_number0", async () => {
  const params: Params = {
    sort: {
      property: ["n", "n_number0"],
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test("get - all records sorted on n.n_number1", async () => {
  const params: Params = {
    sort: {
      property: ["n", "n_number1"],
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test("get - all records sorted on n.n_number2", async () => {
  const params: Params = {
    sort: {
      property: ["n", "n_number2"],
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record1, record0] } });
});

test("get - all records sorted on n.n_string0", async () => {
  const params: Params = {
    sort: {
      property: ["n", "n_string0"],
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test("get - all records sorted on n.n_string3", async () => {
  const params: Params = {
    sort: {
      property: ["n", "n_string3"],
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record1, record0] } });
});

test("get - all records sorted on n.n_string4", async () => {
  const params: Params = {
    sort: {
      property: ["n", "n_string4"],
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record1, record0] } });
});

test("get - all records sorted on n.n_array0", async () => {
  const params: Params = {
    sort: {
      property: ["n", "n_array0"],
      compare: "asc",
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record1, record0] } });
});

test("get - all records sorted on n.n_object0.n_string2 ascending", async () => {
  const params: Params = {
    sort: {
      property: ["n", "n_object0", "1"],
      compare: "asc",
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record1, record0] } });
});

test("get - all records sorted on n.n_object0.n_string2 descending", async () => {
  const params: Params = {
    sort: {
      property: ["n", "n_object0", "1"],
      compare: "desc",
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test("get - all records sorted on n.n_object0 throws an error", async () => {
  const params: Params = {
    sort: {
      property: ["n", "n_object0"],
    },
  };
  await expect(api.getRecords(params)).rejects.toThrow("can't compare values of type 'object'.");
});

test("get - all records sorted ascending on position implicitly", async () => {
  const params: Params = {
    sort: { property: "p" },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test("get - all records sorted ascending on position", async () => {
  const params: Params = {
    sort: { property: "p", compare: "asc" },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test("get - all records sorted descending on position", async () => {
  const params: Params = {
    sort: { property: "p", compare: "desc" },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record1, record0] } });
});

test("get - all records sorted ascending on reference", async () => {
  const params: Params = {
    sort: { property: "r", compare: "asc" },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test("get - all records sorted descending on reference", async () => {
  const params: Params = {
    sort: { property: "r", compare: "desc" },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record1, record0] } });
});

test("get - all records sorted custom on identifier", async () => {
  const params: Params = {
    sort: {
      property: "i",
      compare: function (a, b) {
        if (a === null || (a as string[]).length === 0) {
          return b === null || (b as string[]).length === 0 ? 0 : 1;
        } else {
          return b === null || (b as string[]).length === 0 ? -1 : (a as string[])[0].localeCompare((b as string[])[0]);
        }
      },
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test("get - not one record", async () => {
  const params: Params = {
    query: {
      selector: ["p"],
      operator: "!=",
      args: 16376412,
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record0],
    page: { number: 0, size: 10, totalElements: 1 },
    total: 2,
  });
});

test("get - some records", async () => {
  const params: Params = {
    query: {
      selector: ["p"],
      operator: "in",
      args: [10042537, 10042538, 10042539],
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record0],
    page: { number: 0, size: 10, totalElements: 1 },
    total: 2,
  });
});

test("get - some records with invalid selector", async () => {
  const params: Params = {
    query: {
      selector: ["p", "x", "y", "z"],
      operator: "in",
      args: [10042537, 10042538, 10042539],
    },
  };
  await expect(api.getRecords(params)).rejects.toThrow("value '10042538' is of type 'number' instead of 'object'");
});

test("get - some records using wildcard selector part with has_any", async () => {
  const params: Params = {
    query: {
      selector: ["s", "*", "GT", "t"],
      operator: "has_any",
      args: ["hom_a", "hom_r"],
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record0],
    page: { number: 0, size: 10, totalElements: 1 },
    total: 2,
  });
});

test("get - some records using wildcard selector part with !has_any", async () => {
  const params: Params = {
    query: {
      selector: ["s", "*", "GT", "t"],
      operator: "!has_any",
      args: ["hom_a", "hom_r"],
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record1],
    page: { number: 0, size: 10, totalElements: 1 },
    total: 2,
  });
});

test("get - some records using composed query", async () => {
  const params: Params = {
    query: {
      operator: "or",
      args: [
        {
          selector: "p",
          operator: "==",
          args: 10042538,
        },
        {
          selector: "r",
          operator: "==",
          args: "G",
        },
      ],
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record0, record1],
    page: { number: 0, size: 10, totalElements: 2 },
    total: 2,
  });
});

test("get - not some records", async () => {
  const params: Params = {
    query: {
      selector: ["p"],
      operator: "!in",
      args: [16376411, 16376412, 16376413],
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record0],
    page: { number: 0, size: 10, totalElements: 1 },
    total: 2,
  });
});

test("get - all phenotypes", async () => {
  const phenotypes = await api.getPhenotypes();
  expect(phenotypes).toEqual({
    items: [],
    page: { number: 0, size: 10, totalElements: 0 },
    total: 0,
  });
});

test("getFastaGz", async () => {
  const fastaGz = await api.getFastaGz("1", 17350550);
  // null check, because size check differs between local machine and Travis
  expect(fastaGz).not.toBe(null);
});

test("getFastaGz - unknown interval", async () => {
  const fastaGz = await api.getFastaGz("1", 17350450);
  expect(fastaGz).toBe(null);
});

test("getFastaGz - existing interval in other contig", async () => {
  const fastaGz = await api.getFastaGz("1", 47637250);
  expect(fastaGz).toBe(null);
});

test("getGenesGz", async () => {
  const genesGz = await api.getGenesGz();
  expect(genesGz).not.toBe(null);
});

test("getCram", async () => {
  const cram = await api.getCram("Patient");
  expect(cram).not.toBe(null);
});

test("getCram - unknown sample identifier", async () => {
  const cram = await api.getCram("Father");
  expect(cram).toBeNull();
});

test("getDecisionTree", async () => {
  const decisionTree = await api.getDecisionTree();
  expect(decisionTree).not.toBe(null);
});
