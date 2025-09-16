import {Value, ValueType} from "@molgenis/vip-report-vcf";
import { FieldCategories } from "./loader";

export function parseTypedValue(token: string, type: ValueType, categories: FieldCategories): Value {
  switch (type) {
    case "CHARACTER":
      return parseCharacterValue(token);
    case "CATEGORICAL":
      {
        const key = parseIntegerValue(token);
        const category = categories.get(key as number);//FIXME null
        return category === null ? null : category as string;
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
      throw new Error(`invalid value type '${type}'`);
  }
}

export function parseCharacterValue(token: string | null): string | null {
  let value;
  if (token === "..") {
    token = null; //FIXME RNC hack
  }
  if (token === null || token.length === 0) {
    value = null;
  } else if (token.length === 1) {
    value = token;
  } else {
    throw new Error(`invalid character '${token}'`);
  }
  return value;
}

export function parseStringValue(token: string, unescape = true): string | null {
  let value;
  if (token === null || token.length === 0) {
    value = null;
  } else if (!unescape || token.indexOf("%") === -1) {
    value = token;
  } else {
    value = token
      .replace(/%3A/g, ":")
      .replace(/%3B/g, ";")
      .replace(/%3D/g, "=")
      .replace(/%25/g, "%")
      .replace(/%2C/g, ",")
      .replace(/%0D/g, "\r")
      .replace(/%0A/g, "\n")
      .replace(/%09/g, "\t");
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
      value = parseInt(token, 10);
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
