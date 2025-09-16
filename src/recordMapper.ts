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
  GenotypeAllele, ValueObject
} from "@molgenis/vip-report-vcf";
import { parseIntegerValue } from "./ValueParser";
import { RecordSamples } from "./index";
import {parseValue} from "./DataParser";
import {Categories} from "./loader";

export type SqlRow = { [column: string]: string | number | boolean | null | undefined };
export const excludeKeys = ['id', 'v_variant_id', 'variant_id'];


export function mapRows(rows: SqlRow[], meta: VcfMetadata, categories: Categories): VcfRecord[] {
  const variantMap = new Map<number, {
    combinedInfo: Map<string, Value>;
    csqArr: ValueObject[];
    fmtArr: Map<string, Value | Genotype>[];
    restRow: Map<string, Value>;
  }>();

  const addedFmtMap :Map<number, string[]> = new Map();
  const addedCsqMap :Map<number, string[]> = new Map();

  for (const row of rows) {
    const { fmtMap, csqMap, infoMap, restMap } = splitAndParseMap(row, meta, categories);

    const variant_id = row.v_variant_id as number;  // or use your actual variant ID field
    if (!variantMap.has(variant_id)) {
      variantMap.set(variant_id, {
        combinedInfo: infoMap,
        csqArr: [],
        fmtArr: [],
        restRow: restMap
      });
    }
    // Accumulate all CSQ maps found for this variant
    if (csqMap && csqMap.size > 0) {
      const addedCsq: string[] = addedCsqMap.has(variant_id) ? addedCsqMap.get(variant_id) as string[] : [];
      if(!addedCsq.includes(csqMap.get("id") as string)) {
        variantMap.get(variant_id)!.csqArr.push(Object.fromEntries([...csqMap.entries()].filter(([key]) => !excludeKeys.includes(key))));
        addedCsq.push(csqMap.get("id") as string);
        addedCsqMap.set(variant_id, addedCsq)
      }
    }
    // Accumulate all FMT maps found for this variant
    if (fmtMap && fmtMap.size > 0) {
      const addedFmt: string[] = addedFmtMap.has(variant_id) ? addedFmtMap.get(variant_id) as string[] : [];
      if(!addedFmt.includes(fmtMap.get("sample_id") as string))
      {
        const filteredMap = new Map(
            [...fmtMap.entries()].filter(([key]) => !excludeKeys.includes(key))
        );
        variantMap.get(variant_id)!.fmtArr.push(filteredMap);
        addedFmt.push(fmtMap.get("sample_id") as string);
        addedFmtMap.set(variant_id, addedFmt)
      }
    }
  }

  // Compose VcfRecord objects:
  return Array.from(variantMap.entries()).map(([variant_id, v]) => {
    const n = Object.fromEntries(v.combinedInfo);
    n["CSQ"] = v.csqArr;
    const s: RecordSamples = {};
    v.fmtArr.forEach(f => {
      const sample_id = f.get("sample_id") as number;
      if (sample_id !== undefined){
        s[sample_id] = Object.fromEntries(f);
      }
    });

    return {
      id: variant_id,
      c: v.restRow.get("chrom") as string,
      p: v.restRow.get("pos") as number,
      i: v.restRow.get("id_vcf") as string[],
      r: v.restRow.get("ref") as string,
      a: v.restRow.get("alt") as string[],
      q: v.restRow.get("qual") as number,
      f: v.restRow.get("filter") as string[],
      n,
      s
    };
  });
}

function parseStandardField(token: string, key: string): Value {
  switch(key){
    case "v_variant_id":
    case "chrom":
    case "ref":
      return token
    case "pos":
      return Number(token);
    case "alt":
    case "id_vcf":
    case "filter":
      return JSON.parse(token as string);
    case "qual":
      return token == null ? null : Number(token)
  }
  throw Error("Unknown VCF field.");
}

export function splitAndParseMap(row: SqlRow, meta: VcfMetadata, categories: Categories): {
  fmtMap: Map<string, Value | Genotype>;
  csqMap: Map<string, Value>;
  infoMap: Map<string, Value>;
  restMap: Map<string, Value>
} {

  //FIXME: create once
  const csqMeta = meta.info["CSQ"] as InfoMetadata;
  const nestedMetas = csqMeta.nested?.items as FieldMetadata[];
  const nestedMetaMap = new Map<string, FieldMetadata>();
  for (const nestedMeta of nestedMetas) {
    nestedMetaMap.set(nestedMeta.id, nestedMeta);
  }

  const fmtMap = new Map<string, Value | Genotype>();
  const csqMap = new Map<string, Value>();
  const restMap = new Map<string, Value>();
  const infoMap = new Map<string, Value>();

  for (const [key, value] of Object.entries(row)) {
    if (key.startsWith("FMT_")) {
      if(key === "FMT_sample_id"){
        fmtMap.set(key.substring("FMT_".length), value as number);
      }else {
        if(!excludeKeys.includes(key.substring("FMT_".length))) {
          fmtMap.set(key.substring("FMT_".length), parseFormatValue(value as string, meta.format[key.substring("FMT_".length)] as FieldMetadata, categories));//FIXME check field exists
        }
      }
    } else if (key.startsWith("CSQ_")) {
      if(excludeKeys.includes(key.substring("CSQ_".length))){
        csqMap.set(key.substring("CSQ_".length), value as string);
      }
      else {
        csqMap.set(key.substring("CSQ_".length), parseValue(value as string, nestedMetaMap.get(key.substring("CSQ_".length)) as FieldMetadata, categories));//FIXME check field exists
      }
    } else if (key.startsWith("INFO_")) {
      if(!excludeKeys.includes(key.substring("INFO_".length))) {
        infoMap.set(key.substring("INFO_".length), parseValue(value as string, meta.info[key.substring("INFO_".length)] as FieldMetadata, categories));//FIXME check field exists
      }
    } else {
      restMap.set(key, parseStandardField(value as string, key as string));
    }
  }

  return { fmtMap, csqMap, infoMap, restMap };
}

function parseFormatValue(token: Value | Genotype | undefined | null, formatMetadata: FieldMetadata, categories: Categories): RecordSampleType {
  let value: Genotype | Value | ValueArray;
  if (formatMetadata.id === "GT") {
    if(token === null || token === undefined) {
      value = null;
    }else{
      value = parseGenotype(token.toString());
    }
  } else {
    value = parseValue(token as Value, formatMetadata, categories);
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
