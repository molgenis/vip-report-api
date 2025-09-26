import { parseTypedValue } from "./ValueParser";
import { InfoMetadata, NestedFieldMetadata, Value, ValueArray } from "@molgenis/vip-report-vcf";
import { Categories, FieldCategories } from "./loader";

export function parseValue(token: Value, infoMetadata: InfoMetadata, categories: Categories): Value | ValueArray {
  let value: Value | ValueArray;
  const type = infoMetadata.number.type;
  switch (type) {
    case "NUMBER":
      if (infoMetadata.number.count === 0 || infoMetadata.number.count === 1) {
        if (token === null || token === undefined) {
          value = null;
        } else {
          value = parseSingleValue(token.toString(), infoMetadata, categories);
        }
      } else {
        if (token === null || token === undefined) {
          value = [];
        } else {
          value = parseMultiValue(token.toString(), infoMetadata, categories);
        }
      }
      break;
    case "PER_ALT":
    case "PER_ALT_AND_REF":
    case "PER_GENOTYPE":
    case "OTHER":
      if (token === null || token === undefined) {
        value = [];
      } else {
        value = parseMultiValue(token.toString(), infoMetadata, categories);
      }
      break;
    default:
      throw new Error("invalid number type");
  }

  return value;
}

export function parseSingleValue(
  token: string,
  infoMetadata: InfoMetadata,
  categories: Categories,
): Value | ValueArray {
  let value: Value | Value[];
  if (infoMetadata.nested) {
    value = parseNestedValue(token, infoMetadata.nested, categories);
  } else {
    value = parseTypedValue(token, infoMetadata.type, categories.get(infoMetadata.id) as FieldCategories); //FIXME: undefined?
  }
  return value;
}

export function parseMultiValue(token: string, infoMetadata: InfoMetadata, categories: Categories): ValueArray {
  const values: Value[] = [];
  let jsonValues;
  if (token !== null && token.length > 0) {
    jsonValues = JSON.parse(token) as object[];
    if (jsonValues !== null && jsonValues.length > 0) {
      if (!isIterable(jsonValues)) {
        jsonValues = [jsonValues];
      }
      for (const jsonValue of jsonValues) {
        const value = jsonValue !== null ? parseSingleValue(jsonValue.toString(), infoMetadata, categories) : null;
        values.push(value);
      }
    }
  }
  return values;
}

function isIterable(obj: object[]): boolean {
  return obj != null && typeof obj[Symbol.iterator] === "function";
}

export function parseNestedValue(
  token: string,
  nestedInfoMetadata: NestedFieldMetadata,
  categories: Categories,
): ValueArray {
  const infoValues: Value[] = [];
  const parts = token.split(nestedInfoMetadata.separator);
  if (parts.length !== nestedInfoMetadata.items.length) throw new Error(`invalid value '${token}'`);
  for (let i = 0; i < parts.length; ++i) {
    infoValues.push(parseValue(parts[i]!, nestedInfoMetadata.items[i]!, categories));
  }
  return infoValues;
}
