import { parseSqlMultiValue, parseSqlSingleValue, parseSqlValue } from "../sqlDataParser";
import { expect, test } from "vitest";
import { NumberMetadata } from "@molgenis/vip-report-vcf";
import { Categories, FieldCategories } from "../sql";

const fieldCategories: FieldCategories = new Map();
fieldCategories.set(1, "Value1");
fieldCategories.set(2, "Value2");
const categories: Categories = new Map();
categories.set("INFO/field1", fieldCategories);

test("parse single value", () => {
  expect(
    parseSqlSingleValue(
      "12",
      {
        id: "INT",
        number: { type: "NUMBER", count: 1 },
        type: "INTEGER",
        description: "integer",
      },
      categories,
      "INFO",
    ),
  ).toBe(12);
});

test("parse single categorical value", () => {
  expect(
    parseSqlSingleValue(
      "1",
      {
        id: "field1",
        number: { type: "NUMBER", count: 1 },
        type: "CATEGORICAL",
        description: "CATEGORICAL",
      },
      categories,
      "INFO",
    ),
  ).toBe("Value1");
});

test("parse multiple value", () => {
  expect(
    parseSqlMultiValue(
      "[1,2]",
      {
        id: "INT",
        number: { type: "OTHER", separator: "&" },
        type: "INTEGER",
        description: "Integers",
      },
      categories,
      "INFO",
    ),
  ).toStrictEqual([1, 2]);
});

test("parse multiple categorical value", () => {
  expect(
    parseSqlMultiValue(
      "[1,2]",
      {
        id: "field1",
        number: { type: "NUMBER", count: 1 },
        type: "CATEGORICAL",
        description: "CATEGORICAL",
      },
      categories,
      "INFO",
    ),
  ).toStrictEqual(["Value1", "Value2"]);
});

test("parse value - number", () => {
  expect(
    parseSqlValue(
      "12",
      {
        id: "INT",
        number: { type: "NUMBER", count: 1 },
        type: "INTEGER",
        description: "Integer",
      },
      categories,
      "INFO",
    ),
  ).toBe(12);
});

test("parse value - number multiple", () => {
  expect(
    parseSqlValue(
      "[1,2]",
      {
        id: "INT",
        number: { type: "NUMBER", count: 2, separator: "," },
        type: "INTEGER",
        description: "Integer",
      },
      categories,
      "INFO",
    ),
  ).toStrictEqual([1, 2]);
});

test("parse value - number multiple characters with separator", () => {
  expect(
    parseSqlValue(
      '["x","y"]',
      {
        id: "CHARACTER_WITH_SEPARATOR",
        number: { type: "NUMBER", count: 2, separator: "," },
        type: "CHARACTER",
        description: "Character",
      },
      categories,
      "INFO",
    ),
  ).toStrictEqual(["x", "y"]);
});

test("parse value - per alt", () => {
  expect(
    parseSqlValue(
      "[1,2]",
      {
        id: "INT",
        number: { type: "PER_ALT", separator: "," },
        type: "INTEGER",
        description: "Integer",
      },
      categories,
      "INFO",
    ),
  ).toStrictEqual([1, 2]);
});

test("parse value - per alt and ref", () => {
  expect(
    parseSqlValue(
      "[1,2]",
      {
        id: "INT",
        number: { type: "PER_ALT_AND_REF", separator: "," },
        type: "INTEGER",
        description: "Integer",
      },
      categories,
      "INFO",
    ),
  ).toStrictEqual([1, 2]);
});

test("parse value - per genotype", () => {
  expect(
    parseSqlValue(
      "[1,2]",
      {
        id: "INT",
        number: { type: "PER_GENOTYPE", separator: "," },
        type: "INTEGER",
        description: "Integer",
      },
      categories,
      "INFO",
    ),
  ).toStrictEqual([1, 2]);
});

test("parse value - other", () => {
  expect(
    parseSqlValue(
      "",
      {
        id: "INT",
        number: { type: "OTHER", separator: "," },
        type: "INTEGER",
        description: "Integer",
      },
      categories,
      "INFO",
    ),
  ).toStrictEqual([]);
});

test("parse value - invalid", () => {
  expect(() =>
    parseSqlValue(
      "",
      {
        id: "INT",
        number: { type: "xx", separator: "," } as unknown as NumberMetadata,
        type: "INTEGER",
        description: "Integer",
      },
      categories,
      "INFO",
    ),
  ).toThrow("invalid number type");
});
