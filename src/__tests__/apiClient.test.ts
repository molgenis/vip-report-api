import { beforeEach, expect, test } from "vitest";
import { EncodedReport } from "../WindowApiClient";
import { readFileSync } from "fs";
import path from "path";
import { Item, RecordParams } from "../index";
import { ApiClient } from "../apiClient";
import { VcfRecord } from "@molgenis/vip-report-vcf";
import initSqlJs, { Database } from "sql.js";

let api: ApiClient;

const sortAllExpected = {
  page: { number: 0, size: 10, totalElements: 2 },
  total: 2,
};

const record0: Item<VcfRecord> = {
  data: {
    a: ["T"],
    c: "1",
    f: ["PASS"],
    i: [],
    n: {
      n_array0: ["c", null, "d", "b"],
      n_bool3: false,
      n_bool6: false,
      n_bool7: false,
      n_number2: 1,
      n_object0: [
        {
          n_array1: ["1", "2"],
          n_string1: "dummy4",
          n_string2: "b",
          n_cat1: null,
        },
        {
          n_array1: ["1", "2"],
          n_string1: "dummy5",
          n_string2: "c",
          n_cat1: null,
        },
        {
          n_array1: ["1", "2"],
          n_string1: "dummy7",
          n_string2: null,
          n_cat1: "AA",
        },
        {
          n_array1: ["1", "2"],
          n_string1: "dummy8",
          n_string2: "d",
          n_cat1: null,
        },
      ],
      n_string0: "a",
      n_string3: "b",
      n_string4: "b",
    },
    p: 10042538,
    q: 80,
    r: "C",
    s: [
      {
        AD: [45, 5],
        DP: 50,
        GT: {
          a: [1, 0],
          p: true,
          t: "het",
        },
        VIAB: 0.9,
      },
      {
        AD: [10, 0],
        DP: 10,
        GT: {
          a: [0, 0],
          p: true,
          t: "hom_r",
        },
        VIAB: 1,
      },
      {
        AD: [10, 0],
        DP: 10,
        GT: {
          a: [0, 0],
          p: true,
          t: "hom_r",
        },
        VIAB: 1,
      },
    ],
  },
  id: 1,
};
const record1: Item<VcfRecord> = {
  data: {
    a: ["A"],
    c: "1",
    f: [],
    i: [],
    n: {
      n_array0: ["b", "c", "a"],
      n_array1: ["a", "b"],
      n_bool3: true,
      n_bool6: true,
      n_bool7: true,
      n_number2: 0,
      n_object0: [
        {
          n_array1: ["1", "2", "3"],
          n_string1: "dummy2",
          n_string2: "c",
          n_cat1: null,
        },
        {
          n_array1: ["1", "2", "3"],
          n_string1: "dummy3",
          n_string2: "b",
          n_cat1: "BB",
        },
        {
          n_array1: [],
          n_string1: "dummy6",
          n_string2: "a",
          n_cat1: null,
        },
      ],
      n_string0: "a",
      n_string3: "a",
      n_string4: "A",
    },
    p: 16376412,
    q: null,
    r: "G",
    s: [
      {
        AD: [0, 0],
        DP: 10,
        GT: {
          a: [0, 1],
          p: true,
          t: "het",
        },
      },
      {
        AD: [11, 0],
        DP: 11,
        GT: {
          a: [1, 0],
          p: true,
          t: "het",
        },
        VIAB: 1,
      },
      {
        AD: [11, 0],
        DP: 11,
        GT: {
          a: [1, 0],
          p: true,
          t: "het",
        },
        VIAB: 1,
      },
    ],
  },
  id: 2,
};
const record0desc: Item<VcfRecord> = {
  data: {
    a: ["T"],
    c: "1",
    f: ["PASS"],
    i: [],
    n: {
      n_array0: ["c", null, "d", "b"],
      n_bool3: false,
      n_bool6: false,
      n_bool7: false,
      n_number2: 1,
      n_object0: [
        {
          n_array1: ["1", "2"],
          n_string1: "dummy8",
          n_string2: "d",
          n_cat1: null,
        },
        {
          n_array1: ["1", "2"],
          n_string1: "dummy7",
          n_string2: null,
          n_cat1: "AA",
        },
        {
          n_array1: ["1", "2"],
          n_string1: "dummy5",
          n_string2: "c",
          n_cat1: null,
        },
        {
          n_array1: ["1", "2"],
          n_string1: "dummy4",
          n_string2: "b",
          n_cat1: null,
        },
      ],
      n_string0: "a",
      n_string3: "b",
      n_string4: "b",
    },
    p: 10042538,
    q: 80,
    r: "C",
    s: [
      {
        AD: [45, 5],
        DP: 50,
        GT: {
          a: [1, 0],
          p: true,
          t: "het",
        },
        VIAB: 0.9,
      },
      {
        AD: [10, 0],
        DP: 10,
        GT: {
          a: [0, 0],
          p: true,
          t: "hom_r",
        },
        VIAB: 1,
      },
      {
        AD: [10, 0],
        DP: 10,
        GT: {
          a: [0, 0],
          p: true,
          t: "hom_r",
        },
        VIAB: 1,
      },
    ],
  },
  id: 1,
};
const record0catA: Item<VcfRecord> = {
  data: {
    a: ["T"],
    c: "1",
    f: ["PASS"],
    i: [],
    n: {
      n_array0: ["c", null, "d", "b"],
      n_bool3: false,
      n_bool6: false,
      n_bool7: false,
      n_number2: 1,
      n_object0: [
        {
          n_array1: ["1", "2"],
          n_string1: "dummy7",
          n_string2: null,
          n_cat1: "AA",
        },
      ],
      n_string0: "a",
      n_string3: "b",
      n_string4: "b",
    },
    p: 10042538,
    q: 80,
    r: "C",
    s: [
      {
        AD: [45, 5],
        DP: 50,
        GT: {
          a: [1, 0],
          p: true,
          t: "het",
        },
        VIAB: 0.9,
      },
      {
        AD: [10, 0],
        DP: 10,
        GT: {
          a: [0, 0],
          p: true,
          t: "hom_r",
        },
        VIAB: 1,
      },
      {
        AD: [10, 0],
        DP: 10,
        GT: {
          a: [0, 0],
          p: true,
          t: "hom_r",
        },
        VIAB: 1,
      },
    ],
  },
  id: 1,
};
const record1desc: Item<VcfRecord> = {
  data: {
    a: ["A"],
    c: "1",
    f: [],
    i: [],
    n: {
      n_array0: ["b", "c", "a"],
      n_array1: ["a", "b"],
      n_bool3: true,
      n_bool6: true,
      n_bool7: true,
      n_number2: 0,
      n_object0: [
        {
          n_array1: [],
          n_string1: "dummy6",
          n_string2: "a",
          n_cat1: null,
        },
        {
          n_array1: ["1", "2", "3"],
          n_string1: "dummy3",
          n_string2: "b",
          n_cat1: "BB",
        },
        {
          n_array1: ["1", "2", "3"],
          n_string1: "dummy2",
          n_string2: "c",
          n_cat1: null,
        },
      ],
      n_string0: "a",
      n_string3: "a",
      n_string4: "A",
    },
    p: 16376412,
    q: null,
    r: "G",
    s: [
      {
        AD: [0, 0],
        DP: 10,
        GT: {
          a: [0, 1],
          p: true,
          t: "het",
        },
      },
      {
        AD: [11, 0],
        DP: 11,
        GT: {
          a: [1, 0],
          p: true,
          t: "het",
        },
        VIAB: 1,
      },
      {
        AD: [11, 0],
        DP: 11,
        GT: {
          a: [1, 0],
          p: true,
          t: "het",
        },
        VIAB: 1,
      },
    ],
  },
  id: 2,
};

beforeEach(async () => {
  const reportData = {
    database: readFileSync(path.join(__dirname, "/data/trio.db")),
    binary: {
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
      wasmBinary: readFileSync(path.join(__dirname, "data", "sql-wasm.wasm")),
    },
  };

  api = new ApiClient(
    reportData as unknown as EncodedReport,
    getDatabase(reportData.binary.wasmBinary, reportData.database),
  );
});

async function getDatabase(wasmBinaryBytes: Uint8Array, database: Uint8Array): Promise<Database> {
  const wasmBinary = wasmBinaryBytes.slice().buffer;
  const SQL = await initSqlJs({ wasmBinary });
  return new SQL.Database(database);
}

test("getAppMeta", async () => {
  const metadata = await api.getAppMetadata();
  expect(metadata).toEqual(
    expect.objectContaining({
      name: "vcf-report",
      version: "0.0.1",
      args: "-i test.vcf -d",
      htsFile: { uri: "trio.vcf", htsFormat: "VCF", genomeAssembly: "GRCh38" },
    }),
  );
});

test("get - all samples", async () => {
  const samples = await api.getSamples();
  expect(samples).toEqual({
    items: [
      {
        data: {
          index: 0,
          person: {
            affectedStatus: "MISSING",
            familyId: "MISSING_0",
            individualId: "Patient",
            maternalId: "0",
            paternalId: "0",
            sex: "UNKNOWN_SEX",
          },
          proband: true,
        },
        id: 0,
      },
      {
        data: {
          index: 1,
          person: {
            affectedStatus: "MISSING",
            familyId: "MISSING_1",
            individualId: "Mother",
            maternalId: "0",
            paternalId: "0",
            sex: "UNKNOWN_SEX",
          },
          proband: false,
        },
        id: 1,
      },
      {
        data: {
          index: 2,
          person: {
            affectedStatus: "MISSING",
            familyId: "MISSING_2",
            individualId: "Father",
            maternalId: "0",
            paternalId: "0",
            sex: "UNKNOWN_SEX",
          },
          proband: false,
        },
        id: 2,
      },
    ],
    page: { number: 0, size: 10, totalElements: 3 },
    total: 3,
  });
});

test("get - all records", async () => {
  const params: RecordParams = {
    sampleIds: [0, 1, 2],
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record0, record1],
    page: { number: 0, size: 10, totalElements: 2 },
    total: 2,
  });
});

test("get - page of records", async () => {
  const params: RecordParams = {
    sampleIds: [0, 1, 2],
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
  const params: RecordParams = {
    sampleIds: [0, 1, 2],
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

test("get - records with greater than query", async () => {
  const params: RecordParams = {
    sampleIds: [0, 1, 2],
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
  const params: RecordParams = {
    sampleIds: [0, 1, 2],
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
  const params: RecordParams = {
    sampleIds: [0, 1, 2],
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

test("get - records with equals null query on qual", async () => {
  const params: RecordParams = {
    sampleIds: [0, 1, 2],
    query: {
      selector: ["q"],
      operator: "==",
      args: null,
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record1],
    page: { number: 0, size: 10, totalElements: 1 },
    total: 2,
  });
});

test("get - records with equals empty filter", async () => {
  const params: RecordParams = {
    sampleIds: [0, 1, 2],
    query: {
      selector: ["f"],
      operator: "==",
      args: [],
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
  const params: RecordParams = {
    sampleIds: [0, 1, 2],
    query: {
      selector: ["s", 0, "VIAB"],
      operator: "==",
      args: null,
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record1],
    page: { number: 0, size: 10, totalElements: 1 },
    total: 2,
  });
});

test("get - records with categorical query on nested", async () => {
  const params: RecordParams = {
    sampleIds: [0, 1, 2],
    query: {
      selector: ["n", "n_object0", "n_cat1"],
      operator: "==",
      args: "AA",
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record0catA],
    page: { number: 0, size: 10, totalElements: 1 },
    total: 2,
  });
});

test("get - records with equals not null query", async () => {
  const params: RecordParams = {
    sampleIds: [0, 1, 2],
    query: {
      selector: ["s", 0, "VIAB"],
      operator: "!=",
      args: null,
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record0],
    page: { number: 0, size: 10, totalElements: 1 },
    total: 2,
  });
});

test("get - records with equals undefined query", async () => {
  const params: RecordParams = {
    sampleIds: [0, 1, 2],
    query: {
      selector: ["s", "0", "TEST"],
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

test("get - records with equals not undefined query", async () => {
  const params: RecordParams = {
    sampleIds: [0, 1, 2],
    query: {
      selector: ["s", 0, "TEST"],
      operator: "!=",
      args: undefined,
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [],
    page: { number: 0, size: 10, totalElements: 0 },
    total: 2,
  });
});

test("get - records with less than or equal query", async () => {
  const params: RecordParams = {
    sampleIds: [0, 1, 2],
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
  const params: RecordParams = {
    sampleIds: [0, 1, 2],
    query: {
      selector: ["n", "n_string0"],
      operator: "<=",
      args: 1,
    },
  };
  await expect(api.getRecords(params)).rejects.toThrow(
    "Numerical operators are not allowed for values of type 'string'",
  );
});

test("get - one record with invalid selector", async () => {
  const params: RecordParams = {
    sampleIds: [0, 1, 2],
    query: {
      selector: ["p", "x", "y", "z"],
      operator: "==",
      args: 10042538,
    },
  };
  await expect(api.getRecords(params)).rejects.toThrow("Unknown field in selector: 'p,x,y,z'");
});

test("get - one record using composed and query", async () => {
  const params: RecordParams = {
    sampleIds: [0, 1, 2],
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
  const params: RecordParams = {
    sampleIds: [0, 1, 2],
    sort: {
      property: ["n", "n_bool0"],
    },
  };
  await expect(api.getRecords(params)).rejects.toThrow("no such column: n.n_bool0");
});

test("get - all records sorted on n.n_bool3", async () => {
  const params: RecordParams = {
    sampleIds: [0, 1, 2],
    sort: {
      property: ["n", "n_bool3"],
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test("get - all records sorted on n.n_bool6", async () => {
  const params: RecordParams = {
    sampleIds: [0, 1, 2],
    sort: {
      property: ["n", "n_bool6"],
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test("get - all records sorted on n.n_bool7", async () => {
  const params: RecordParams = {
    sampleIds: [0, 1, 2],
    sort: {
      property: ["n", "n_bool7"],
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test("get - all records sorted on n.n_number2", async () => {
  const params: RecordParams = {
    sampleIds: [0, 1, 2],
    sort: {
      property: ["n", "n_number2"],
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record1, record0] } });
});

test("get - all records sorted on n.n_string0", async () => {
  const params: RecordParams = {
    sampleIds: [0, 1, 2],
    sort: {
      property: ["n", "n_string0"],
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test("get - all records sorted on n.n_string3", async () => {
  const params: RecordParams = {
    sampleIds: [0, 1, 2],
    sort: {
      property: ["n", "n_string3"],
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record1, record0] } });
});

test("get - all records sorted on n.n_string4", async () => {
  const params: RecordParams = {
    sampleIds: [0, 1, 2],
    sort: {
      property: ["n", "n_string4"],
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record1, record0] } });
});

test("get - all records sorted on n.n_array0", async () => {
  const params: RecordParams = {
    sampleIds: [0, 1, 2],
    sort: {
      property: ["n", "n_array0"],
      compare: "asc",
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record1, record0] } });
});

test("get - all records sorted on n.n_object0.n_string1 ascending", async () => {
  const params: RecordParams = {
    sampleIds: [0, 1, 2],
    sort: {
      property: ["n", "n_object0", "n_string1"],
      compare: "asc",
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record1, record0] } });
});

test("get - all records sorted on n.n_object0.n_string1 descending", async () => {
  const params: RecordParams = {
    sampleIds: [0, 1, 2],
    sort: {
      property: ["n", "n_object0", "n_string1"],
      compare: "desc",
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0desc, record1desc] } });
});

test("get - all records sorted on n.n_object0 throws an error", async () => {
  const params: RecordParams = {
    sampleIds: [0, 1, 2],
    sort: {
      property: ["n", "n_object0"],
    },
  };
  await expect(api.getRecords(params)).rejects.toThrow("no such column: n.n_object0");
});

test("get - all records sorted ascending on position implicitly", async () => {
  const params: RecordParams = {
    sampleIds: [0, 1, 2],
    sort: { property: "p" },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test("get - all records sorted ascending on position", async () => {
  const params: RecordParams = {
    sampleIds: [0, 1, 2],
    sort: { property: "p", compare: "asc" },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test("get - all records sorted descending on position", async () => {
  const params: RecordParams = {
    sampleIds: [0, 1, 2],
    sort: { property: "p", compare: "desc" },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record1, record0] } });
});

test("get - all records sorted ascending on reference", async () => {
  const params: RecordParams = {
    sampleIds: [0, 1, 2],
    sort: { property: "r", compare: "asc" },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test("get - all records sorted descending on reference", async () => {
  const params: RecordParams = {
    sampleIds: [0, 1, 2],
    sort: { property: "r", compare: "desc" },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record1, record0] } });
});

test("get - all records sorted custom on identifier", async () => {
  const params: RecordParams = {
    sampleIds: [0, 1, 2],
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
  const params: RecordParams = {
    sampleIds: [0, 1, 2],
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
  const params: RecordParams = {
    sampleIds: [0, 1, 2],
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
  const params: RecordParams = {
    sampleIds: [0, 1, 2],
    query: {
      selector: ["p", "x", "y", "z"],
      operator: "in",
      args: [10042537, 10042538, 10042539],
    },
  };
  await expect(api.getRecords(params)).rejects.toThrow("Unknown field in selector: 'p,x,y,z'");
});

test("get - some records using composed query", async () => {
  const params: RecordParams = {
    sampleIds: [0, 1, 2],
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
  const params: RecordParams = {
    sampleIds: [0, 1, 2],
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

test("getSampleTree", async () => {
  const decisionTree = await api.getSampleTree();
  expect(decisionTree).not.toBe(null);
});
