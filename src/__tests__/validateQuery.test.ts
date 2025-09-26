import { describe, it, expect } from "vitest";
import { validateQuery } from "../validateQuery";
import { VcfMetadata } from "@molgenis/vip-report-vcf";
import { Query, QueryClause } from "../index";

const meta: VcfMetadata = {
  lines: [],
  samples: [],
  info: {
    STR: {
      id: "STR",
      type: "STRING",
      number: { type: "NUMBER", count: 1 },
    },
    NUM: { id: "NUM", type: "INTEGER", number: { type: "NUMBER", count: 1 } },
    FLAG: { id: "FLAG", type: "FLAG", number: { type: "NUMBER", count: 1 } },
  },
  format: {
    DP: { id: "DP", type: "INTEGER", number: { type: "NUMBER", count: 1 } },
  },
};

describe("validateQuery", () => {
  it("returns without error for undefined or empty query", () => {
    expect(() => validateQuery(meta, undefined)).not.toThrow();
    expect(() => validateQuery(meta, { args: undefined } as Query)).not.toThrow();
  });

  it("throws for unknown field selector", () => {
    expect(() =>
      validateQuery(meta, {
        selector: ["n", "missing"],
        operator: "==",
        args: "abc",
      } as Query),
    ).toThrow(/Unknown field/);
  });

  it("validates string argument for STRING field", () => {
    expect(() =>
      validateQuery(meta, {
        selector: ["n", "STR"],
        operator: "==",
        args: "value",
      } as QueryClause),
    ).not.toThrow();
  });

  it("throws for non-string on string field", () => {
    expect(() =>
      validateQuery(meta, {
        selector: ["n", "STR"],
        operator: "==",
        args: 123,
      } as QueryClause),
    ).toThrow(/instead of string/);
  });

  it("validates number for INTEGER field", () => {
    expect(() =>
      validateQuery(meta, {
        selector: ["n", "NUM"],
        operator: "==",
        args: 7,
      } as QueryClause),
    ).not.toThrow();
  });

  it("throws if integer comparison gets non-number", () => {
    expect(() =>
      validateQuery(meta, {
        selector: ["n", "NUM"],
        operator: "==",
        args: "q",
      } as QueryClause),
    ).toThrow(/instead of number/);
  });

  it("throws for numerical operator on STRING field", () => {
    expect(() =>
      validateQuery(meta, {
        selector: ["n", "STR"],
        operator: ">",
        args: "z",
      } as QueryClause),
    ).toThrow(/Numerical operators are not allowed/);
  });

  it("validates FLAG as 1 or 0", () => {
    expect(() =>
      validateQuery(meta, {
        selector: ["n", "FLAG"],
        operator: "==",
        args: "1",
      } as QueryClause),
    ).not.toThrow();
    expect(() =>
      validateQuery(meta, {
        selector: ["n", "FLAG"],
        operator: "==",
        args: "0",
      } as QueryClause),
    ).not.toThrow();
  });

  it("throws error for invalid FLAG argument", () => {
    expect(() =>
      validateQuery(meta, {
        selector: ["n", "FLAG"],
        operator: "==",
        args: "yes",
      } as QueryClause),
    ).toThrow(/can only be '1' or '0'/);
  });

  it("validates array for 'in' operator", () => {
    expect(() =>
      validateQuery(meta, {
        selector: ["n", "STR"],
        operator: "in",
        args: ["a", "b"],
      } as QueryClause),
    ).not.toThrow();
  });

  it("throws for non-array with 'in' operator", () => {
    expect(() =>
      validateQuery(meta, {
        selector: ["n", "STR"],
        operator: "in",
        args: "abc",
      } as QueryClause),
    ).toThrow(/instead of array/);
  });

  it("recursively validates and/or logic", () => {
    expect(() =>
      validateQuery(meta, {
        operator: "and",
        args: [
          { selector: ["n", "STR"], operator: "==", args: "a" },
          { selector: ["n", "NUM"], operator: "==", args: 2 },
        ],
      } as Query),
    ).not.toThrow();
    expect(() =>
      validateQuery(meta, {
        operator: "or",
        args: [{ selector: ["n", "STR"], operator: "==", args: 5 }],
      } as Query),
    ).toThrow();
  });
});
