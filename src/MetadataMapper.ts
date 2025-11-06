import type {
  VcfMetadata,
  FieldMetadata,
  FieldMetadataContainer,
  FormatMetadataContainer,
  NumberType,
  ValueType,
  NumberMetadata,
  CategoryRecord,
  Value,
  ValueDescription,
} from "@molgenis/vip-report-vcf";

type SqlRow = { [column: string]: string | number | boolean | null | undefined };

// STRICT to_N methods (throws on bad value)
export function toNumberType(val: string): NumberType {
  switch (val) {
    case "A":
      return "PER_ALT";
    case "R":
      return "PER_ALT_AND_REF";
    case "G":
      return "PER_GENOTYPE";
    case "VARIABLE":
      return "OTHER";
    case "FIXED":
      return "NUMBER";
    case "NUMBER":
    case "PER_ALT":
    case "PER_ALT_AND_REF":
    case "PER_GENOTYPE":
    case "OTHER":
      return val as NumberType;
    default:
      throw new Error("Invalid NumberType: " + val);
  }
}

function parseCategories(raw: Value): CategoryRecord | undefined {
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw as string);
  } catch {
    throw new Error(`Unable to parse categories: ${raw}`);
  }
}

export function mapSqlRowsToVcfMetadata(rows: SqlRow[], headerLines: string[], samples: string[]): VcfMetadata {
  const metaMap = new Map<string, FieldMetadata>();
  for (const row of rows) {
    const number: NumberMetadata = {
      type: toNumberType(row.numberType as string),
      count: row.numberCount == null ? undefined : (row.numberCount as number),
    };
    const field: FieldMetadata = {
      id: row.name as string,
      number,
      type: row.valueType as ValueType,
      label: row.label as string | undefined,
      description: row.description ? (row.description as string) : undefined,
      categories: row.categories ? parseCategories(row.categories) : undefined,
      required: !!row.required,
      nullValue: row.nullValue === null ? undefined : (JSON.parse(row.nullValue as string) as ValueDescription),
    };
    //Avoid name collision if field name is present both a CSQ child and INFO field
    if (row.parent) {
      metaMap.set(row.parent + "_" + row.name, field);
    } else {
      metaMap.set(row.name as string, field);
    }
  }

  // --- Step 2: Link parents and nesteds ---
  const postProcessedMetaMap = new Map<string, FieldMetadata>();
  let field;
  for (const row of rows) {
    if (row.parent) {
      field = metaMap.get(row.parent + "_" + row.name)!;
    } else {
      field = metaMap.get(row.name as string)!;
    }
    // Parent: link to top-level object if parent exists
    if (row.parent) {
      const parentObj = metaMap.get(row.parent as string);
      if (parentObj) field.parent = parentObj;
    }

    // Nested children: link all fields whose parent is me!
    if (row.nested === 1 || row.nested === true) {
      const childRows = rows.filter((r) => r.parent === row.name);
      field.nested = {
        separator: row.nestedSeparator as string,
        items: childRows.map((childRow) => metaMap.get(row.name + "_" + childRow.name)!),
      };
    }
    if (row.parent === null) {
      postProcessedMetaMap.set(row.name as string, field);
    }
  }

  // Now assign to info/format
  const info: FieldMetadataContainer = {};
  const format: FormatMetadataContainer = {};
  for (const row of rows.filter((r) => r.parent === null)) {
    const field = postProcessedMetaMap.get(row.name as string)!;
    if (row.fieldType === "INFO") {
      info[row.name as string] = field;
    } else if (row.fieldType === "FORMAT") {
      format[row.name as string] = field;
    }
  }

  return {
    lines: headerLines,
    info,
    format,
    samples: samples,
  };
}
