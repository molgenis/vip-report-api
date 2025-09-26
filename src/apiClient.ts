import { FieldMetadata, VcfMetadata, VcfRecord } from "@molgenis/vip-report-vcf";
import {
  Api,
  AppMetadata,
  Cram,
  DecisionTree,
  Item,
  Json,
  PagedItems,
  Params,
  Phenotype,
  Query,
  QueryClause,
  ReportData,
  Resource,
  Sample,
  SelectorPart,
} from "./index";
import { SqlLoader, TableSize } from "./loader";
import { Database } from "sql.js";

declare global {
  interface Window {
    sqlite: Database;
    reportData: object;
  }
}

function validate(fieldMeta: FieldMetadata, clause: QueryClause) {
  switch (clause.operator) {
    case "==":
    case "~=":
    case "!=":
      if (!Array.isArray(clause.args)) {
        if (fieldMeta.type === "INTEGER" || fieldMeta.type === "FLOAT") {
          validateNumber(clause);
        } else if (fieldMeta.type === "FLAG") {
          validateFlag(clause);
        } else {
          validateString(clause);
        }
      }
      break;
    case ">":
    case ">=":
    case "<":
    case "<=":
      if (fieldMeta.type === "INTEGER" || fieldMeta.type === "FLOAT") {
        validateNumber(clause);
      } else {
        throw Error(`Numerical operators are not allowed for values of type 'string'`);
      }
      break;
    case "in":
    case "!in":
      validateArray(clause);
      break;
  }
}

function validateString(clause: QueryClause) {
  if (typeof clause.args !== "string") {
    throw Error(`Argument '${clause.args}' is of type '${typeof clause.args}' instead of string.`);
  }
}

function validateFlag(clause: QueryClause) {
  if (clause.args !== "1" && clause.args !== "0") {
    throw Error(`Argument for a field of type 'FLAG' can only be '1' or '0'.`);
  }
}

function validateNumber(clause: QueryClause) {
  if (typeof clause.args !== "number") {
    throw Error(`Argument '${clause.args}' is of type '${typeof clause.args}' instead of number.`);
  }
}

function validateArray(clause: QueryClause) {
  if (!Array.isArray(clause.args)) {
    throw Error(`Argument '${clause.args}' is of type '${typeof clause.args}' instead of array.`);
  }
}

function getFieldFromSelector(parts: SelectorPart[], meta: VcfMetadata): FieldMetadata {
  let fieldMeta;
  if (parts.length === 2) {
    const field = parts[1] as SelectorPart;
    fieldMeta = meta.info[field];
  }
  if (parts.length === 3) {
    if (parts[0] === "s") {
      const field = parts[2] as SelectorPart;
      fieldMeta = meta.format[field];
    } else {
      //FIXME: check field exists
      const parent = parts[1] as SelectorPart;
      const parentMeta = meta.info[parent];
      const field = parts[2] as SelectorPart;
      if (parentMeta === undefined) {
        throw Error(`Unknown parent field in selector: '${parts}'`);
      }
      fieldMeta = parentMeta.nested?.items.find((fm) => fm.id === field);
    }
  }
  if (fieldMeta === undefined) {
    throw Error(`Unknown field in selector: '${parts}'`);
  }
  return fieldMeta;
}

function validateQuery(meta: VcfMetadata, query: Query | undefined) {
  if (query === undefined || query.args === null || query.args === undefined) return;
  if (
    query &&
    typeof query === "object" &&
    "args" in query &&
    Array.isArray(query.args) &&
    (query.operator === "and" || query.operator === "or")
  ) {
    query.args.forEach((subQuery) => validateQuery(meta, subQuery));
  } else {
    const clause = query as QueryClause;
    let parts: SelectorPart[];
    if (Array.isArray(clause.selector)) {
      parts = clause.selector.slice();
    } else {
      parts = [clause.selector];
    }
    if (parts.length === 1) {
      switch (parts[0]) {
        case "c":
        case "i":
        case "r":
          if (clause.operator == "in" || clause.operator == "!in") {
            validateArray(clause);
          } else {
            validateString(clause);
          }
          break;
        case "p":
        case "q":
          if (clause.operator == "in" || clause.operator == "!in") {
            validateArray(clause);
          } else {
            validateNumber(clause);
          }
          break;
        case "a":
        case "f":
          validateArray(clause);
          break;
        default:
          throw Error(`Unknown field: ${parts[0]}`);
      }
    } else {
      const fieldMeta = getFieldFromSelector(parts, meta);
      validate(fieldMeta, clause);
    }
  }
}

export class ApiClient implements Api {
  private reportData: ReportData;
  private loader: Promise<SqlLoader> | undefined;

  constructor(reportData: ReportData) {
    this.reportData = reportData;
    this.initLoader();
  }

  initLoader() {
    console.time("initLoader");
    if (this.loader === undefined) {
      this.loader = new SqlLoader(this.reportData).init();
    }
    console.timeEnd("initLoader");
  }

  async getConfig(): Promise<Json | null> {
    console.log("getConfig");
    const loader = await this.loader;
    if (!loader) throw new Error("Loader was not initialized.");
    return loader.loadConfig();
  }

  async getRecordsMeta(): Promise<VcfMetadata> {
    console.log("getRecordsMeta");
    const loader = await this.loader;
    if (!loader) throw new Error("Loader was not initialized.");
    const meta = loader.loadMetadata();
    if (!meta) throw new Error("Metadata not loaded.");
    return meta;
  }

  async getRecords(params: Params = {}): Promise<PagedItems<VcfRecord>> {
    const loader = await this.loader;
    if (!loader) throw new Error("Loader was not initialized.");
    const page = params.page !== undefined ? params.page : 0;
    const size = params.size !== undefined ? params.size : 10;
    const meta = (await loader).loadMetadata() as VcfMetadata;
    validateQuery(meta, params.query);
    const tableSize: TableSize = loader.countMatchingVariants(meta, params.query);
    const variants: VcfRecord[] = loader.loadVcfRecords(meta, page, size, params.sort, params.query);
    return this.toPagedItems(variants, page, size, tableSize.size, tableSize.totalSize);
  }

  toPagedItems<T extends Resource>(
    resources: T[],
    page: number,
    size: number,
    totalElements: number,
    total: number,
  ): PagedItems<T> {
    const items = resources.map((data) => ({
      id: data.id as number,
      data,
    }));
    return {
      items,
      total: total,
      page: {
        number: page,
        size,
        totalElements,
      },
    };
  }

  async getRecordById(id: number): Promise<Item<VcfRecord>> {
    console.log("getRecordById");
    const loader = await this.loader;
    if (!loader) throw new Error("Loader was not initialized.");
    const record: VcfRecord = loader.loadVcfRecordById(loader.loadMetadata() as VcfMetadata, id);
    return { data: record, id: id };
  }

  async getSamples(params: Params = {}): Promise<PagedItems<Sample>> {
    console.log("getSamples");
    const page = params.page !== undefined ? params.page : 0;
    const size = params.size !== undefined ? params.size : 10;
    const loader = await this.loader;
    if (!loader) throw new Error("Loader was not initialized.");
    const tableSize: TableSize = loader.countMatchingSamples(params.query);
    return this.toPagedItems(
      loader.loadSamples(page, size, params.query),
      page,
      size,
      tableSize.size,
      tableSize.totalSize,
    );
  }

  async getSampleById(id: number): Promise<Item<Sample>> {
    console.log("getSampleById");
    const loader = await this.loader;
    if (!loader) throw new Error("Loader was not initialized.");
    const sample: Sample = loader.loadSampleById(id);
    return { data: sample, id: id };
  }

  async getPhenotypes(params: Params = {}): Promise<PagedItems<Phenotype>> {
    const page = params.page !== undefined ? params.page : 0;
    const size = params.size !== undefined ? params.size : 10;
    const loader = await this.loader;
    if (!loader) throw new Error("Loader was not initialized.");
    const tableSize = loader.countMatchingPhenotypes(params.query);
    return this.toPagedItems(
      loader.loadPhenotypes(page, size, params.query),
      page,
      size,
      tableSize.size,
      tableSize.totalSize,
    );
  }

  getFastaGz(contig: string, pos: number): Promise<Uint8Array | null> {
    let buffer: Uint8Array | null = null;
    if (this.reportData.binary.fastaGz) {
      for (const [key, value] of Object.entries(this.reportData.binary.fastaGz)) {
        const pair = key.split(":");
        if (pair[0] === contig) {
          const interval = pair[1]!.split("-");
          if (pos >= parseInt(interval[0]!, 10) && pos <= parseInt(interval[1]!, 10)) {
            buffer = value;
            break;
          }
        }
      }
    }
    return Promise.resolve(buffer);
  }

  async getAppMetadata(): Promise<AppMetadata> {
    const loader = await this.loader;
    if (!loader) throw new Error("Loader was not initialized.");
    return loader.loadAppMetadata();
  }

  getGenesGz(): Promise<Uint8Array | null> {
    const genesGz = this.reportData.binary.genesGz;
    return Promise.resolve(genesGz ? genesGz : null);
  }

  getCram(sampleId: string): Promise<Cram | null> {
    const cram = this.reportData.binary.cram;
    const sampleCram = cram ? (cram[sampleId] ? cram[sampleId] : null) : null;
    return Promise.resolve(sampleCram);
  }

  async getDecisionTree(): Promise<DecisionTree | null> {
    const loader = await this.loader;
    if (!loader) throw new Error("Loader was not initialized.");
    return loader.loadDecisionTree("decisionTree");
  }

  async getSampleTree(): Promise<DecisionTree | null> {
    const loader = await this.loader;
    if (!loader) throw new Error("Loader was not initialized.");
    return loader.loadDecisionTree("sampleDecisionTree");
  }
}
