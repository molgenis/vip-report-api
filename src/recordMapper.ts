// record-mapper.ts
import type {
  VcfRecord,
  FieldMetadata,
  VcfMetadata,
  InfoMetadata,
  Genotype,
  Value,
  RecordSampleType,
  ValueArray,
  GenotypeType,
  GenotypeAllele,
} from "@molgenis/vip-report-vcf";
import { parseValue } from "./DataParser";
import { parseIntegerValue } from "./ValueParser";
type NestedObject = Record<string, Value | Genotype>;
type CsqArray = NestedObject[];

type SqlRow = { [column: string]: string | number | boolean | null | undefined };

export function mapRows(rows: SqlRow[], meta: VcfMetadata): VcfRecord[] {
  const variantsById = new Map<number, VcfRecord>();
  for (const row of rows) {
    const id = Number(row.variant_id);
    variantsById.set(id, mapRow(row, undefined, meta));
  }
  return Array.from(variantsById.values());
}

export function mapRow(row: SqlRow, record: VcfRecord | undefined, meta: VcfMetadata): VcfRecord {
  if (!record) {
    record = {
      c: String(row.chrom),
      p: Number(row.pos),
      i: JSON.parse(row.id_vcf as string),
      r: String(row.ref),
      a: JSON.parse(row.alt as string),
      q: row.qual == null ? null : Number(row.qual),
      f: JSON.parse(row.filter as string),
      n: {},
      s: [],
    };
    const noneInfoCols: string[] = [
      "chrom",
      "pos",
      "ref",
      "alt",
      "qual",
      "filter",
      "id_vcf",
      "FMT",
      "CSQ",
      "variant_id",
      "id",
    ];
    for (const [key, value] of Object.entries(row)) {
      if (!noneInfoCols.includes(key) && !key.startsWith("vip_sort_")) {
        if (!meta.info[key]) throw new Error("Unknown info field: " + key);
        record.n[key] = parseValue(value + "", meta.info[key]);
      }
    }
    mapSampleFields(row, record, meta);
    mapCsqFields(row, meta, record);
    return record;
  }
  // If record is supplied, mapping logic could be added as needed
  return record;
}

// --- Utilities for "nested" and sample/CSQ fields --- //
export function mapCsqFields(row: SqlRow, meta: VcfMetadata, vrec: VcfRecord) {
  if (row.CSQ) {
    const csqMeta = meta.info["CSQ"] as InfoMetadata;
    const nestedMetas = csqMeta.nested?.items as FieldMetadata[];
    const nestedMetaMap = new Map();
    for (const nestedMeta of nestedMetas) {
      nestedMetaMap.set(nestedMeta.id, nestedMeta);
    }
    vrec.n.CSQ = parseNestedValues(row.CSQ as string, nestedMetaMap, "CSQ") as Value;
  }
}

export function mapSampleFields(row: SqlRow, vrec: VcfRecord, meta: VcfMetadata) {
  if (row.FMT) {
    const nestedMetaMap = new Map<string, FieldMetadata>(Object.entries(meta.format));

    if (!vrec.n.CSQ) vrec.n.FMT = [];
    for (const [key, value] of Object.entries(row)) {
      if (key === "FMT") {
        vrec.s = parseNestedValues(value as string, nestedMetaMap, "FMT");
      }
    }
  }
}

export function parseNestedValues(value: string, nestedMetaMap: Map<string, FieldMetadata>, source: string): CsqArray {
  const csqArray: CsqArray = JSON.parse(value);

  return csqArray.map((csqObj) => {
    const mapped: NestedObject = {};
    for (const key of Object.keys(csqObj)) {
      if (!nestedMetaMap.has(key)) {
        throw new Error("Unknown nested field: " + key);
      }
      const rawVal = csqObj[key];
      mapped[key] = null;
      if (rawVal !== null && rawVal !== undefined) {
        mapped[key] =
          source === "CSQ"
            ? parseValue(rawVal.toString(), nestedMetaMap.get(key) as InfoMetadata)
            : parseFormatValue(rawVal.toString(), nestedMetaMap.get(key) as InfoMetadata);
      }
    }
    return mapped;
  });
}

function parseFormatValue(token: string, formatMetadata: FieldMetadata): RecordSampleType {
  let value: Genotype | Value | ValueArray;
  if (formatMetadata.id === "GT") {
    value = parseGenotype(token);
  } else {
    value = parseValue(token, formatMetadata);

    if (Array.isArray(value) && value.every((item) => item === null)) {
      value = [];
    }
  }
  return value;
}

function parseGenotype(token: string): Genotype {
  const alleles = token.split(/[|/]/).map((index) => parseIntegerValue(index));

  const genotype: Genotype = {
    a: alleles,
    t: determineGenotypeType(alleles),
  };
  if (alleles.length > 1) {
    genotype.p = token.indexOf("|") !== -1;
  }
  return genotype;
}

function determineGenotypeType(alleles: GenotypeAllele[]): GenotypeType {
  let type: GenotypeType;
  if (alleles.every((allele) => allele === null)) {
    type = "miss";
  } else if (alleles.some((allele) => allele === null)) {
    type = "part";
  } else if (alleles.every((allele) => allele === 0)) {
    type = "hom_r";
  } else if (alleles.every((allele) => allele === alleles[0])) {
    type = "hom_a";
  } else {
    type = "het";
  }
  return type;
}
