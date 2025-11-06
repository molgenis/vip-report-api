import { Value, ValueType } from "@molgenis/vip-report-vcf";
import { FieldCategories } from "./sql";

export function parseTypedValue(token: string, valueType: ValueType, categories: FieldCategories): Value {
  switch (valueType) {
    case "CHARACTER":
      return parseCharacterValue(token);
    case "CATEGORICAL": {
      const key = parseIntegerValue(token);
      const category = categories.get(key as number);
      return category === null ? null : (category as string);
    }
    case "STRING":
      return parseStringValue(token);
    case "INTEGER":
      return parseIntegerValue(token);
    case "FLAG":
      return parseFlagValue(token);
    case "FLOAT":
      return parseFloatValue(token);
    default:
      throw new Error(`invalid value type '${valueType}'`);
  }
}

export function parseCharacterValue(token: string | null): string | null {
  let value;
  if (token === null || token.length === 0) {
    value = null;
  } else if (token.length === 1) {
    value = token;
  } else {
    throw new Error(`invalid character '${token}'`);
  }
  return value;
}

export function parseStringValue(token: string): string | null {
  let value;
  if (token === null || token.length === 0) {
    value = null;
  } else {
    value = token
      .replaceAll(/%3A/g, ":")
      .replaceAll(/%3B/g, ";")
      .replaceAll(/%3D/g, "=")
      .replaceAll(/%25/g, "%")
      .replaceAll(/%2C/g, ",")
      .replaceAll(/%0D/g, "\r")
      .replaceAll(/%0A/g, "\n")
      .replaceAll(/%09/g, "\t");
  }
  return value;
}

export function parseIntegerValue(token: string): number | null {
  let value;
  if (token === null || token.length === 0) {
    value = null;
  } else {
    const upperCaseToken = token.toUpperCase();
    if (upperCaseToken === "INF" || upperCaseToken === "INFINITY") {
      value = Number.POSITIVE_INFINITY;
    } else if (upperCaseToken === "-INF" || upperCaseToken === "-INFINITY") {
      value = Number.NEGATIVE_INFINITY;
    } else if (upperCaseToken === "NAN") {
      value = Number.NaN;
    } else {
      value = Number.parseInt(token, 10);
      if (Number.isNaN(value)) {
        throw new Error(`invalid integer '${token}'`);
      }
    }
  }
  return value;
}

export function parseFloatValue(token: string): number | null {
  let value;
  if (token === null || token.length === 0) {
    value = null;
  } else {
    const upperCaseToken = token.toUpperCase();
    if (
      upperCaseToken === "INF" ||
      upperCaseToken === "INFINITY" ||
      upperCaseToken === "+INF" ||
      upperCaseToken === "+INFINITY"
    ) {
      value = Number.POSITIVE_INFINITY;
    } else if (upperCaseToken === "-INF" || upperCaseToken === "-INFINITY") {
      value = Number.NEGATIVE_INFINITY;
    } else if (upperCaseToken === "NAN") {
      value = Number.NaN;
    } else {
      value = parseFloat(token);
      if (Number.isNaN(value)) {
        throw new Error(`invalid float '${token}'`);
      }
    }
  }
  return value;
}

export function parseFlagValue(token: string): boolean {
  let value;
  if (token === "1") {
    value = true;
  } else if (token === "0") {
    value = false;
  } else {
    throw new Error(`invalid flag '${token}'`);
  }
  return value;
}
