import { parseTypedValue } from "./ValueParser";
import { InfoMetadata, NestedFieldMetadata, Value, ValueArray } from "@molgenis/vip-report-vcf";

export function parseValue(token: string, infoMetadata: InfoMetadata): Value | ValueArray {
  let value: Value | ValueArray;
  const type = infoMetadata.number.type;
  switch (type) {
    case "NUMBER":
      if (infoMetadata.number.count === 0 || infoMetadata.number.count === 1) {
        value = parseSingleValue(token, infoMetadata);
      } else {
        value = parseMultiValue(token, infoMetadata);
      }
      break;
    case "PER_ALT":
    case "PER_ALT_AND_REF":
    case "PER_GENOTYPE":
    case "OTHER":
      value = parseMultiValue(token, infoMetadata);
      break;
    default:
      throw new Error("invalid number type");
  }

  return value;
}

export function parseSingleValue(token: string, infoMetadata: InfoMetadata): Value | ValueArray {
  let value: Value | Value[];
  if (infoMetadata.nested) {
    value = parseNestedValue(token, infoMetadata.nested);
  } else {
    value = parseTypedValue(token, infoMetadata.type);
  }
  return value;
}

export function parseMultiValue(token: string, infoMetadata: InfoMetadata): ValueArray {
  const values: Value[] = [];
  let jsonValues;
  if (token !== null && token.length > 0) {
    jsonValues = JSON.parse(token);
    if(jsonValues !== null && jsonValues.length > 0) {
      if (!isIterable(jsonValues)) {
        jsonValues = [jsonValues];
      }
      for (const jsonValue of jsonValues) {
        const value = parseSingleValue(jsonValue.toString(), infoMetadata)
        if(value != null && value !== undefined) {
          values.push(value);
        }
      }
    }
  }
  return values;
}

function isIterable(obj: any): boolean {
  return obj != null && typeof obj[Symbol.iterator] === 'function';
}

export function parseNestedValue(token: string, nestedInfoMetadata: NestedFieldMetadata): ValueArray {
  const infoValues: Value[] = [];
  const parts = token.split(nestedInfoMetadata.separator);
  if (parts.length !== nestedInfoMetadata.items.length) throw new Error(`invalid value '${token}'`);
  for (let i = 0; i < parts.length; ++i) {
    infoValues.push(parseValue(parts[i]!, nestedInfoMetadata.items[i]!));
  }
  return infoValues;
}
