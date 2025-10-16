import type {
  VcfRecord,
  FieldMetadata,
  VcfMetadata,
  InfoMetadata,
  Genotype,
  Value,
  RecordSampleType,
  GenotypeType,
  GenotypeAllele,
  ValueObject,
  RecordSample,
} from "@molgenis/vip-report-vcf";
import { parseIntegerValue } from "./ValueParser";
import { parseValue } from "./DataParser";
import { Categories, DatabaseRecord, SqlRow } from "./sql";

type ValueMap = {
  infoMap: Map<string, Value>;
  nestedMap: Map<string, ValueObject[]>;
  fmtArr: Map<string, Value | Genotype>[];
  restMap: Map<string, Value>;
};

export const excludeKeys = ["id", "v_variant_id", "variant_id", "GT_type"];

function mapVariant(valueMap: ValueMap, nestedFields: string[]): DatabaseRecord {
  const n = Object.fromEntries(valueMap.infoMap);
  for (const nestedField of nestedFields) {
    n[nestedField] = valueMap.nestedMap.get(nestedField) ?? [];
  }
  const s: RecordSample[] = [];
  valueMap.fmtArr.forEach((f) => {
    const sampleId = f.get("sample_id") as number | undefined;
    if (sampleId !== undefined) s[sampleId] = Object.fromEntries([...f].filter(([key]) => key !== "sample_id"));
  });

  return {
    id: valueMap.restMap.get("v_variant_id") as number,
    data: {
      c: valueMap.restMap.get("chrom") as string,
      p: valueMap.restMap.get("pos") as number,
      i: valueMap.restMap.get("id_vcf") === null ? [] : (valueMap.restMap.get("id_vcf") as string[]),
      r: valueMap.restMap.get("ref") as string,
      a: valueMap.restMap.get("alt") as string[],
      q: valueMap.restMap.get("filter") === null ? null : (valueMap.restMap.get("qual") as number),
      f: valueMap.restMap.get("filter") === null ? [] : (valueMap.restMap.get("filter") as string[]),
      n,
      s,
    } as VcfRecord,
  };
}

export function mapRows(
  rows: SqlRow[],
  meta: VcfMetadata,
  categories: Categories,
  nestedFields: string[],
): DatabaseRecord[] {
  // Per-variant accumulation data structures
  const variantMap = new Map<number, ValueMap>();

  // Track CSQ/FMT rows already added by primary key
  const addedFmtMap = new Map<number, string[]>();
  const addedCsqMap = new Map<number, Map<string, string[]>>(); // by variantId, then nestedField

  for (const row of rows) {
    // Partition fields and parse values
    const { fmtMap, nestedFieldsMap, infoMap, restMap } = splitAndParseMap(row, meta, categories, nestedFields);
    const variantId = row.v_variant_id as number;

    // Initialize variant container if not seen
    if (!variantMap.has(variantId)) {
      variantMap.set(variantId, {
        infoMap,
        nestedMap: new Map(),
        fmtArr: [],
        restMap,
      });
    }

    // For each nested field, accumulate in variantMap.get(variantId)!.nestedMap
    for (const [field, nestedMap] of nestedFieldsMap) {
      if (nestedMap && nestedMap.size > 0) {
        const csqId = nestedMap.get("id") as string;
        // Use a nested tracker to avoid duplicate by field
        if (!addedCsqMap.has(variantId)) addedCsqMap.set(variantId, new Map());
        const fieldSeenCsqs = addedCsqMap.get(variantId)!.get(field) ?? [];
        if (!fieldSeenCsqs.includes(csqId)) {
          if (!variantMap.get(variantId)!.nestedMap.has(field)) {
            variantMap.get(variantId)!.nestedMap.set(field, []);
          }
          variantMap
            .get(variantId)!
            .nestedMap.get(field)!
            .push(Object.fromEntries([...nestedMap.entries()].filter(([key]) => !excludeKeys.includes(key))));
          fieldSeenCsqs.push(csqId);
          addedCsqMap.get(variantId)!.set(field, fieldSeenCsqs);
        }
      }
    }

    // Accumulate unique FMT/sample maps
    if (fmtMap && fmtMap.size > 0) {
      const sampleId = fmtMap.get("sample_id") as string;
      const seenSamples = addedFmtMap.get(variantId) ?? [];
      if (!seenSamples.includes(sampleId)) {
        const filteredFmt = new Map([...fmtMap.entries()].filter(([key]) => !excludeKeys.includes(key)));
        variantMap.get(variantId)!.fmtArr.push(filteredFmt);
        seenSamples.push(sampleId);
        addedFmtMap.set(variantId, seenSamples);
      }
    }
  }
  // Compose VcfRecord objects
  return Array.from(variantMap.values()).map((valueMap) => mapVariant(valueMap, nestedFields));
}

/**
 * Split a SQL row into FMT (sample), CSQ, INFO, and rest/meta fields.
 * All appropriate value parsing is done using field metadata.
 */
export function splitAndParseMap(
  row: SqlRow,
  meta: VcfMetadata,
  categories: Categories,
  nestedTables: string[],
): {
  fmtMap: Map<string, Value | Genotype>;
  nestedFieldsMap: Map<string, Map<string, Value>>;
  infoMap: Map<string, Value>;
  restMap: Map<string, Value>;
} {
  const fmtMap = new Map<string, Value | Genotype>();
  const nestedFieldsMap = new Map<string, Map<string, Value>>();
  const infoMap = new Map<string, Value>();
  const restMap = new Map<string, Value>();

  for (const [key, value] of Object.entries(row)) {
    if (key.startsWith("FMT_")) {
      const fmtKey = key.substring("FMT_".length);
      if (fmtKey === "sample_id") {
        fmtMap.set(fmtKey, value as Value);
      } else if (!excludeKeys.includes(fmtKey)) {
        if (meta.format[fmtKey] !== undefined) {
          if (value !== null) {
            fmtMap.set(fmtKey, parseFormatValue(value as Value, meta.format[fmtKey] as FieldMetadata, categories));
          }
        } else {
          throw Error(`Unknown format metadata: ${fmtKey}`);
        }
      }
    } else if (key.startsWith("INFO_")) {
      const infoKey = key.substring("INFO_".length);
      if (!excludeKeys.includes(infoKey)) {
        if (meta.info[infoKey] !== undefined) {
          if (value !== null) {
            infoMap.set(infoKey, parseValue(value as Value, meta.info[infoKey] as FieldMetadata, categories, "INFO"));
          }
        } else {
          throw Error(`Unknown info metadata: ${infoKey}`);
        }
      }
    } else if (nestedTables.includes(key.substring(0, key.indexOf("^")))) {
      const nestedField = key.substring(0, key.indexOf("^"));
      const nestedMap = nestedFieldsMap.has(nestedField)
        ? (nestedFieldsMap.get(nestedField) as Map<string, Value>)
        : new Map<string, Value>();
      const parentMeta = meta.info[nestedField] as InfoMetadata;
      const nestedMetas = parentMeta.nested?.items as FieldMetadata[];
      const nestedMetaMap = new Map<string, FieldMetadata>();
      for (const nestedMeta of nestedMetas) nestedMetaMap.set(nestedMeta.id, nestedMeta);

      const nestedKey = key.substring(key.indexOf("^") + 1);
      if (excludeKeys.includes(nestedKey)) {
        nestedMap.set(nestedKey, value as Value);
      } else {
        nestedMap.set(nestedKey, parseValue(value as Value, nestedMetaMap.get(nestedKey)!, categories, "INFO"));
      }
      nestedFieldsMap.set(nestedField, nestedMap);
    } else {
      restMap.set(key, parseStandardField(value as Value, key));
    }
  }
  return { fmtMap, nestedFieldsMap, infoMap, restMap };
}

// Standardize parsing of non-sample non-info fields
function parseStandardField(token: Value, key: string): Value {
  switch (key) {
    case "v_variant_id":
    case "chrom":
    case "ref":
      return token as string;
    case "pos":
      return token as number;
    case "alt":
    case "id_vcf":
    case "filter":
      return JSON.parse(token as string);
    case "qual":
      return token == null ? null : (token as number);
    default:
      throw new Error("Unknown VCF field: " + key);
  }
}

// Parse FORMAT column values (GT vs everything else)
function parseFormatValue(
  token: Value | Genotype | undefined,
  fmtMeta: FieldMetadata,
  categories: Categories,
): RecordSampleType {
  if (fmtMeta.id === "GT") {
    return token === null || token === undefined ? null : parseGenotype(token.toString());
  }
  const val = parseValue(token as Value, fmtMeta, categories, "FORMAT");
  if (Array.isArray(val) && val.every((item) => item === null)) return [];
  return val;
}

// Parse VCF genotype string into Genotype structure
function parseGenotype(token: string): Genotype {
  const alleles = token
    .split(/[|/]/)
    .map((idx) => parseIntegerValue(idx))
    .map((value) => (value === -1 ? null : value));
  const genotype: Genotype = {
    a: alleles,
    t: determineGenotypeType(alleles),
  };
  if (alleles.length > 1) genotype.p = token.includes("|");
  return genotype;
}

// Classify genotype alleles
function determineGenotypeType(alleles: GenotypeAllele[]): GenotypeType {
  if (alleles.every((a) => a === null)) return "miss";
  if (alleles.some((a) => a === null)) return "part";
  if (alleles.every((a) => a === 0)) return "hom_r";
  if (alleles.every((a) => a === alleles[0])) return "hom_a";
  return "het";
}
