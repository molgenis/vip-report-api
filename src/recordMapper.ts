import type {
  VcfRecord, FieldMetadata, VcfMetadata, InfoMetadata, Genotype,
  Value, RecordSampleType, GenotypeType, GenotypeAllele, ValueObject
} from "@molgenis/vip-report-vcf";
import { parseIntegerValue } from "./ValueParser";
import {parseValue} from "./DataParser";
import {Categories} from "./loader";
import {RecordSamples} from "./index";

export type SqlRow = { [column: string]: string | number | boolean | null | undefined };
export const excludeKeys = ['id', 'v_variant_id', 'variant_id'];

/**
 * Maps SQL output rows to VcfRecord[]
 */
export function mapRows(
    rows: SqlRow[],
    meta: VcfMetadata,
    categories: Categories
): VcfRecord[] {
  // Per-variant accumulation data structures
  const variantMap = new Map<number, {
    infoMap: Map<string, Value>;
    csqArr: ValueObject[];
    fmtArr: Map<string, Value | Genotype>[];
    restMap: Map<string, Value>;
  }>();

  // Track CSQ/FMT rows already added by primary key
  const addedFmtMap = new Map<number, string[]>();
  const addedCsqMap = new Map<number, string[]>();

  for (const row of rows) {
    // Partition fields and parse values
    const { fmtMap, csqMap, infoMap, restMap } = splitAndParseMap(row, meta, categories);
    const variantId = row.v_variant_id as number;

    // Initialize variant container if not seen
    if (!variantMap.has(variantId)) {
      variantMap.set(variantId, {
        infoMap,
        csqArr: [],
        fmtArr: [],
        restMap
      });
    }

    // Accumulate unique CSQ lines for this variant
    if (csqMap && csqMap.size > 0) {
      const csqId = csqMap.get("id") as string;
      const seenCsqs = addedCsqMap.get(variantId) ?? [];
      if (!seenCsqs.includes(csqId)) {
        variantMap.get(variantId)!.csqArr.push(
            Object.fromEntries([...csqMap.entries()].filter(([key]) => !excludeKeys.includes(key)))
        );
        seenCsqs.push(csqId);
        addedCsqMap.set(variantId, seenCsqs);
      }
    }

    // Accumulate unique FMT/sample maps
    if (fmtMap && fmtMap.size > 0) {
      const sampleId = fmtMap.get("sample_id") as string;
      const seenSamples = addedFmtMap.get(variantId) ?? [];
      if (!seenSamples.includes(sampleId)) {
        const filteredFmt = new Map(
            [...fmtMap.entries()].filter(([key]) => !excludeKeys.includes(key))
        );
        variantMap.get(variantId)!.fmtArr.push(filteredFmt);
        seenSamples.push(sampleId);
        addedFmtMap.set(variantId, seenSamples);
      }
    }
  }

  // Compose VcfRecord objects
  return Array.from(variantMap.entries()).map(([variantId, record]) => {
    const n = Object.fromEntries(record.infoMap);
    n["CSQ"] = record.csqArr;
    const s: RecordSamples = {};
    record.fmtArr.forEach(f => {
      const sampleId = f.get("sample_id") as number;
      if (sampleId !== undefined) s[sampleId] = Object.fromEntries(f);
    });

    return {
      id: variantId,
      c: record.restMap.get("chrom") as string,
      p: record.restMap.get("pos") as number,
      i: record.restMap.get("id_vcf") as string[],
      r: record.restMap.get("ref") as string,
      a: record.restMap.get("alt") as string[],
      q: record.restMap.get("qual") as number,
      f: record.restMap.get("filter") as string[],
      n,
      s
    };
  });
}

/**
 * Split a SQL row into FMT (sample), CSQ, INFO, and rest/meta fields.
 * All appropriate value parsing is done using field metadata.
 */
export function splitAndParseMap(
    row: SqlRow,
    meta: VcfMetadata,
    categories: Categories
): {
  fmtMap: Map<string, Value | Genotype>;
  csqMap: Map<string, Value>;
  infoMap: Map<string, Value>;
  restMap: Map<string, Value>;
} {
  const csqMeta = meta.info["CSQ"] as InfoMetadata;
  const nestedMetas = csqMeta.nested?.items as FieldMetadata[];
  const nestedMetaMap = new Map<string, FieldMetadata>();
  for (const nm of nestedMetas) nestedMetaMap.set(nm.id, nm);

  const fmtMap = new Map<string, Value | Genotype>();
  const csqMap = new Map<string, Value>();
  const infoMap = new Map<string, Value>();
  const restMap = new Map<string, Value>();

  for (const [key, value] of Object.entries(row)) {
    if (key.startsWith("FMT_")) {
      const fmtKey = key.substring("FMT_".length);
      if (fmtKey === "sample_id") {
        fmtMap.set(fmtKey, value as number);
      } else if (!excludeKeys.includes(fmtKey)) {
        if (meta.format[fmtKey] !== undefined) {
          fmtMap.set(fmtKey, parseFormatValue(value as string, meta.format[fmtKey] as FieldMetadata, categories));
        } else {
          throw Error(`Unknown info metadata: ${fmtKey}`);
        }
      }
    } else if (key.startsWith("CSQ_")) {
      const csqKey = key.substring("CSQ_".length);
      if (excludeKeys.includes(csqKey)) {
        csqMap.set(csqKey, value as string);
      } else {
        csqMap.set(csqKey, parseValue(value as string, nestedMetaMap.get(csqKey)!, categories));
      }

    } else if (key.startsWith("INFO_")) {
      const infoKey = key.substring("INFO_".length);
      if (!excludeKeys.includes(infoKey)) {
        if (meta.info[infoKey] !== undefined) {
          infoMap.set(infoKey, parseValue(value as string, meta.info[infoKey] as FieldMetadata, categories));
        } else {
          throw Error(`Unknown info metadata: ${infoKey}`);
        }
      }
    } else {
      restMap.set(key, parseStandardField(value as string, key));
    }
  }
  return {fmtMap, csqMap, infoMap, restMap};
}

// Standardize parsing of non-sample non-info fields
function parseStandardField(token: string, key: string): Value {
  switch (key) {
    case "v_variant_id":
    case "chrom":
    case "ref":
      return token;
    case "pos":
      return Number(token);
    case "alt":
    case "id_vcf":
    case "filter":
      return JSON.parse(token as string);
    case "qual":
      return token == null ? null : Number(token);
    default:
      throw new Error("Unknown VCF field: " + key);
    }
}

// Parse FORMAT column values (GT vs everything else)
function parseFormatValue(
    token: Value | Genotype | undefined | null,
    fmtMeta: FieldMetadata,
    categories: Categories
): RecordSampleType {
  if (fmtMeta.id === "GT") {
    return (token === null || token === undefined) ? null : parseGenotype(token.toString());
  }
  const val = parseValue(token as Value, fmtMeta, categories);
  if (Array.isArray(val) && val.every((item) => item === null)) return [];
  return val;
}

// Parse VCF genotype string into Genotype structure
function parseGenotype(token: string): Genotype {
  const alleles = token.split(/[|/]/).map(idx => parseIntegerValue(idx));
  const genotype: Genotype = {
    a: alleles,
    t: determineGenotypeType(alleles)
  };
  if (alleles.length > 1) genotype.p = token.includes("|");
  return genotype;
}

// Classify genotype alleles
function determineGenotypeType(alleles: GenotypeAllele[]): GenotypeType {
  if (alleles.every(a => a === null)) return "miss";
  if (alleles.some(a => a === null)) return "part";
  if (alleles.every(a => a === 0)) return "hom_r";
  if (alleles.every(a => a === alleles[0])) return "hom_a";
  return "het";
}