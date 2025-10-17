import { parseTypedValue } from "./sqlValueParser";
import { FieldMetadata, InfoMetadata, Value, ValueArray } from "@molgenis/vip-report-vcf";
import { Categories, FieldCategories, SqlValue } from "./sql";

export type FieldType = "INFO" | "FORMAT";

export function parseSqlValue(
  token: SqlValue,
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
          value = parseSqlSingleValue(token.toString(), infoMetadata, categories, type);
        }
      } else if (token === null) {
        value = [];
      } else {
        value = parseSqlMultiValue(token.toString(), infoMetadata, categories, type);
      }

      break;
    case "PER_ALT":
    case "PER_ALT_AND_REF":
    case "PER_GENOTYPE":
    case "OTHER":
      if (token === null) {
        value = [];
      } else {
        value = parseSqlMultiValue(token as string, infoMetadata, categories, type);
      }
      break;
    default:
      throw new Error("invalid number type");
  }

  return value;
}

export function parseSqlSingleValue(
  token: string,
  fieldMetadata: FieldMetadata,
  categories: Categories,
  type: FieldType,
): Value | ValueArray {
  const parentId = fieldMetadata.parent === undefined ? null : fieldMetadata.parent.id;
  const key = parentId === null ? `${type}/${fieldMetadata.id}` : `${type}/${parentId}/${fieldMetadata.id}`;
  return parseTypedValue(token, fieldMetadata.type, categories.get(key) as FieldCategories);
}

export function parseSqlMultiValue(
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
          values.push(parseSqlSingleValue(jsonValue.toString(), fieldMetadata, categories, type));
        }
      }
    }
  }
  return values;
}

function isIterable(obj: object[]): boolean {
  return typeof obj[Symbol.iterator] === "function";
}
