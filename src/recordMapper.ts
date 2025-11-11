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
import { parseIntegerValue } from "./sqlValueParser";
import { parseSqlValue } from "./sqlDataParser";
import { Categories, DatabaseRecord, SqlRow, SqlValue } from "./sql";

type ValueMap = {
  infoMap: Map<string, Value>;
  nestedMap: Map<string, ValueObject[]>;
  fmtArr: Map<string, Value | Genotype>[];
  restMap: Map<string, Value>;
};

export const excludeKeys = ["id", "v_variantId", "variantId", "GtType"];

function postProcessVIPC_SandVIPP_S(valueMap: ValueMap) {
  //remove CsqIndex field from CSQ value, and store in separate array
  const { csqIndices, objsWithoutCSQIndex } = separateCSQIndex(valueMap.nestedMap.get("CSQ") as ValueObject[]);
  valueMap.nestedMap.set("CSQ", objsWithoutCSQIndex);

  //use the CsqIndex array to filter VIPC_S and VIPP_S values
  const fmt = valueMap.fmtArr;
  const newFmt = [];
  for (const value of fmt) {
    const vipc = value.get("VIPC_S");
    const vipp = value.get("VIPP_S");
    if (vipc !== undefined && Array.isArray(vipc)) {
      value.set(
        "VIPC_S",
        csqIndices.map((idx) => vipc[idx]).filter((v) => v !== undefined),
      );
    }
    if (vipp !== undefined && Array.isArray(vipp)) {
      value.set(
        "VIPP_S",
        csqIndices.map((idx) => vipp[idx]).filter((v) => v !== undefined),
      );
    }
    newFmt.push(value);
  }
  valueMap.fmtArr = newFmt;
}

function mapVariant(valueMap: ValueMap, nestedFields: string[]): DatabaseRecord {
  if (valueMap.nestedMap.get("CSQ") !== undefined) {
    postProcessVIPC_SandVIPP_S(valueMap);
  }
  const n = Object.fromEntries(valueMap.infoMap);
  for (const nestedField of nestedFields) {
    n[nestedField] = valueMap.nestedMap.get(nestedField) ?? [];
  }
  const s: RecordSample[] = [];
  for (const f of valueMap.fmtArr) {
    const sampleIdx = f.get("sampleIndex") as number | undefined;
    if (sampleIdx !== undefined) s[sampleIdx] = Object.fromEntries([...f].filter(([key]) => key !== "sampleIndex"));
  }

  return {
    id: valueMap.restMap.get("v_variantId") as number,
    data: {
      c: valueMap.restMap.get("chrom") as string,
      p: valueMap.restMap.get("pos") as number,
      i: valueMap.restMap.get("idVcf") === null ? [] : (valueMap.restMap.get("idVcf") as string[]),
      r: valueMap.restMap.get("ref") as string,
      a: valueMap.restMap.get("alt") as string[],
      q: valueMap.restMap.get("qual") === null ? null : (valueMap.restMap.get("qual") as number),
      f: valueMap.restMap.get("filter") === null ? [] : (valueMap.restMap.get("filter") as string[]),
      g: valueMap.restMap.get("format") as string,
      n,
      s,
    } as VcfRecord,
  };
}

function separateCSQIndex(csqArray: ValueObject[]): { csqIndices: number[]; objsWithoutCSQIndex: ValueObject[] } {
  const csqIndices: number[] = [];
  const objsWithoutCSQIndex = csqArray.map((csq) => {
    if (csq === null) {
      throw new Error("Unexpected CSQ value null encountered.");
    }
    const { CsqIndex, ...rest } = csq;
    csqIndices.push(CsqIndex as number);
    return rest;
  });
  return { csqIndices, objsWithoutCSQIndex };
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
  const addedFmtMap = new Map<number, number[]>();
  const addedCsqMap = new Map<number, Map<string, string[]>>(); // by variantId, then nestedField

  for (const row of rows) {
    // Partition fields and parse values
    const { fmtMap, nestedFieldsMap, infoMap, restMap } = splitAndParseMap(row, meta, categories, nestedFields);
    const variantId = row.v_variantId as number;

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
        const nestedId = nestedMap.get("id") as string;
        // Use a nested tracker to avoid duplicate by field
        if (!addedCsqMap.has(variantId)) addedCsqMap.set(variantId, new Map());
        const fieldSeenCsqs = addedCsqMap.get(variantId)!.get(field) ?? [];
        if (!fieldSeenCsqs.includes(nestedId)) {
          if (!variantMap.get(variantId)!.nestedMap.has(field)) {
            variantMap.get(variantId)!.nestedMap.set(field, []);
          }
          variantMap
            .get(variantId)!
            .nestedMap.get(field)!
            .push(Object.fromEntries([...nestedMap.entries()].filter(([key]) => !excludeKeys.includes(key))));
          fieldSeenCsqs.push(nestedId);
          addedCsqMap.get(variantId)!.set(field, fieldSeenCsqs);
        }
      }
    }
    // Accumulate unique FMT/sample maps
    if (fmtMap && fmtMap.size > 0) {
      const sampleId = fmtMap.get("sampleIndex") as number;
      const seenSamples = addedFmtMap.get(variantId) ?? [];
      if (!seenSamples.includes(sampleId)) {
        const filteredFmt = new Map([...fmtMap.entries()].filter(([key]) => !excludeKeys.includes(key)));
        variantMap.get(variantId)!.fmtArr.push(filteredFmt);
        seenSamples.push(sampleId);
        addedFmtMap.set(variantId, seenSamples);
      }
    }
  }
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
      if (fmtKey === "sampleIndex") {
        fmtMap.set(fmtKey, value as Value);
      } else if (!excludeKeys.includes(fmtKey)) {
        if (meta.format[fmtKey] !== undefined) {
          if (value !== null) {
            fmtMap.set(fmtKey, parseFormatValue(value as Value, meta.format[fmtKey], categories));
          }
        } else {
          throw new Error(`Unknown format metadata: ${fmtKey}`);
        }
      }
    } else if (key.startsWith("INFO_")) {
      const infoKey = key.substring("INFO_".length);
      if (!excludeKeys.includes(infoKey)) {
        if (meta.info[infoKey] !== undefined) {
          if (value !== null) {
            infoMap.set(infoKey, parseSqlValue(value as SqlValue, meta.info[infoKey], categories, "INFO"));
          }
        } else {
          throw new Error(`Unknown info metadata: ${infoKey}`);
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
      const orderedKeys = Object.keys(nestedMetas)
        .map(Number)
        .sort((a, b) => a - b);
      for (const index of orderedKeys) {
        const nestedMeta: FieldMetadata = nestedMetas[index]!;
        nestedMetaMap.set(nestedMeta.id, nestedMeta);
      }

      const nestedKey = key.substring(key.indexOf("^") + 1);
      //CsqIndex exception because it is used in postprocessing to fix VIPC and VIPP
      if (excludeKeys.includes(nestedKey) || nestedKey === "CsqIndex") {
        nestedMap.set(nestedKey, value as Value);
      } else {
        nestedMap.set(nestedKey, parseSqlValue(value, nestedMetaMap.get(nestedKey)!, categories, "INFO"));
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
    case "v_variantId":
    case "chrom":
    case "ref":
    case "format":
      return token as string;
    case "pos":
      return token as number;
    case "alt":
    case "idVcf":
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
  const val = parseSqlValue(token as SqlValue, fmtMeta, categories, "FORMAT");
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
  if (alleles.includes(null)) return "part";
  if (alleles.every((a) => a === 0)) return "hom_r";
  if (alleles.every((a) => a === alleles[0])) return "hom_a";
  return "het";
}
