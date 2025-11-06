import {
  parseCharacterValue,
  parseFlagValue,
  parseFloatValue,
  parseIntegerValue,
  parseStringValue,
  parseTypedValue,
} from "../sqlValueParser";
import { expect, test } from "vitest";
import { FieldCategories } from "../sql";

const categories: FieldCategories = new Map();
categories.set(1, "Value1");

test("parse typed value - CHARACTER", () => {
  expect(parseTypedValue("a", "CHARACTER", categories)).toBe("a");
});

test("parse typed value - STRING", () => {
  expect(parseTypedValue("xx", "STRING", categories)).toBe("xx");
});

test("parse typed value - INTEGER", () => {
  expect(parseTypedValue("12", "INTEGER", categories)).toBe(12);
});

test("parse typed value - FLAG", () => {
  expect(parseTypedValue("1", "FLAG", categories)).toBe(true);
});

test("parse typed value - FLOAT", () => {
  expect(parseTypedValue("1.2", "FLOAT", categories)).toBeCloseTo(1.2);
});

test("parse character", () => {
  expect(parseCharacterValue("x")).toBe("x");
});

test("parse character - empty string", () => {
  expect(parseCharacterValue("")).toBeNull();
});

test("parse character - multiple characters", () => {
  expect(() => parseCharacterValue("xx")).toThrow("invalid character 'xx'");
});

test("parse string", () => {
  expect(parseStringValue("xx")).toBe("xx");
});

test("parse string - empty string", () => {
  expect(parseStringValue("")).toBeNull();
});

test("parse string - escape characters", () => {
  expect(parseStringValue("%%3A%3B%3D%25%2C%0D%0A%09%3A")).toBe("%:;=%,\r\n\t:");
});

test("parse integer", () => {
  expect(parseIntegerValue("12")).toBe(12);
});

test("parse integer - empty string", () => {
  expect(parseIntegerValue("")).toBeNull();
});

test("parse integer - positive infinity", () => {
  expect(parseIntegerValue("INF")).toBe(Number.POSITIVE_INFINITY);
});

test("parse integer - positive infinity lowercase", () => {
  expect(parseIntegerValue("infinity")).toBe(Number.POSITIVE_INFINITY);
});

test("parse integer - negative infinity", () => {
  expect(parseIntegerValue("-INF")).toBe(Number.NEGATIVE_INFINITY);
});

test("parse integer - positive infinity lowercase", () => {
  expect(parseIntegerValue("-infinity")).toBe(Number.NEGATIVE_INFINITY);
});

test("parse integer - NaN", () => {
  expect(parseIntegerValue("NaN")).toBe(Number.NaN);
});

test("parse integer - NaN lowercase", () => {
  expect(parseIntegerValue("nan")).toBe(Number.NaN);
});

test("parse integer - invalid value", () => {
  expect(() => parseIntegerValue("xx")).toThrow("invalid integer 'xx'");
});

test("parse float", () => {
  expect(parseFloatValue("1.2")).toBeCloseTo(1.2);
});

test("parse float - empty string", () => {
  expect(parseFloatValue("")).toBeNull();
});

test("parse float - positive infinity", () => {
  expect(parseFloatValue("INF")).toBe(Number.POSITIVE_INFINITY);
});

test("parse float - positive infinity lowercase", () => {
  expect(parseFloatValue("infinity")).toBe(Number.POSITIVE_INFINITY);
});

test("parse float - negative infinity", () => {
  expect(parseFloatValue("-INF")).toBe(Number.NEGATIVE_INFINITY);
});

test("parse float - positive infinity lowercase", () => {
  expect(parseFloatValue("-infinity")).toBe(Number.NEGATIVE_INFINITY);
});

test("parse float - NaN", () => {
  expect(parseFloatValue("NaN")).toBe(Number.NaN);
});

test("parse float - NaN lowercase", () => {
  expect(parseFloatValue("nan")).toBe(Number.NaN);
});

test("parse float - invalid value", () => {
  expect(() => parseFloatValue("xx")).toThrow("invalid float 'xx'");
});

test("parse flag - true", () => {
  expect(parseFlagValue("1")).toBe(true);
});

test("parse flag - false", () => {
  expect(parseFlagValue("0")).toBe(false);
});

test("parse float - invalid value", () => {
  expect(() => parseFlagValue("xx")).toThrow("invalid flag 'xx'");
});
