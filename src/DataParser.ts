import { parseTypedValue } from "./ValueParser";
import { FieldMetadata, InfoMetadata, NestedFieldMetadata, Value, ValueArray } from "@molgenis/vip-report-vcf";
import { Categories, FieldCategories } from "./sql";

export type FieldType = "INFO" | "FORMAT";

export function parseValue(
  token: Value,
  infoMetadata: InfoMetadata,
  categories: Categories,
  type: FieldType,
): Value | ValueArray {
  let value: Value | ValueArray;
  const numberType = infoMetadata.number.type;
  switch (numberType) {
    case "NUMBER":
      if (infoMetadata.number.count === 0 || infoMetadata.number.count === 1) {
        if (token === null) {
          value = null;
        } else {
          value = parseSingleValue(token.toString(), infoMetadata, categories, type);
        }
      } else {
        if (token === null) {
          value = [];
        } else {
          value = parseMultiValue(token.toString(), infoMetadata, categories, type);
        }
      }
      break;
    case "PER_ALT":
    case "PER_ALT_AND_REF":
    case "PER_GENOTYPE":
    case "OTHER":
      if (token === null) {
        value = [];
      } else {
        value = parseMultiValue(token.toString(), infoMetadata, categories, type);
      }
      break;
    default:
      throw new Error("invalid number type");
  }

  return value;
}

export function parseSingleValue(
  token: string,
  fieldMetadata: FieldMetadata,
  categories: Categories,
  type: FieldType,
): Value | ValueArray {
  let value: Value | Value[];
  if (fieldMetadata.nested) {
    value = parseNestedValue(token, fieldMetadata.nested, categories, type);
  } else {
    const parentId = fieldMetadata.parent === undefined ? null : fieldMetadata.parent.id;
    const key = parentId === null ? `${type}/${fieldMetadata.id}` : `${type}/${parentId}/${fieldMetadata.id}`;
    value = parseTypedValue(token, fieldMetadata.type, categories.get(key) as FieldCategories);
  }
  return value;
}

export function parseMultiValue(
  token: string,
  fieldMetadata: FieldMetadata,
  categories: Categories,
  type: FieldType,
): ValueArray {
  const values: Value[] = [];
  let jsonValues;
  if (token.length > 0) {
    jsonValues = JSON.parse(token);
    if (jsonValues !== null && jsonValues.length > 0) {
      if (!isIterable(jsonValues)) {
        jsonValues = [jsonValues];
      }
      for (const jsonValue of jsonValues) {
        if (jsonValue !== null) {
          values.push(parseSingleValue(jsonValue.toString(), fieldMetadata, categories, type));
        }
      }
    }
  }
  return values;
}

function isIterable(obj: object[]): boolean {
  return typeof obj[Symbol.iterator] === "function";
}

export function parseNestedValue(
  token: string,
  nestedInfoMetadata: NestedFieldMetadata,
  categories: Categories,
  type: FieldType,
): ValueArray {
  const infoValues: Value[] = [];
  const parts = token.split(nestedInfoMetadata.separator);
  if (parts.length !== nestedInfoMetadata.items.length) throw new Error(`invalid value '${token}'`);
  for (let i = 0; i < parts.length; ++i) {
    infoValues.push(parseValue(parts[i]!, nestedInfoMetadata.items[i]!, categories, type));
  }
  return infoValues;
}
