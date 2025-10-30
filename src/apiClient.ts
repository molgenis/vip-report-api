import { VcfMetadata, VcfRecord } from "@molgenis/vip-report-vcf";
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
  RecordParams,
  ReportData,
  Resource,
  Sample,
} from "./index";
import { SqlLoader } from "./SqlLoader";
import { validateQuery } from "./validateQuery";
import { DatabaseRecord, DatabaseResource, TableSize } from "./sql";
import { Database } from "sql.js";

export class ApiClient implements Api {
  private reportData: ReportData;
  private loader: Promise<SqlLoader>;

  constructor(reportData: ReportData, db: Promise<Database>) {
    this.reportData = reportData;
    const loader = new SqlLoader();
    this.loader = loader.init(db);
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
    const meta = loader.getMetadata();
    if (!meta) throw new Error("Metadata not loaded.");
    return meta;
  }

  async getRecords(params: RecordParams = {}): Promise<PagedItems<VcfRecord>> {
    const loader = await this.loader;
    if (!loader) throw new Error("Loader was not initialized.");
    const page = params.page ?? 0;
    const size = params.size ?? 10;
    validateQuery(loader.getMetadata(), params.query);
    const tableSize: TableSize = loader.countMatchingVariants(params.query);
    const variants: DatabaseRecord[] = loader.loadVcfRecords(page, size, params.sort, params.query, params.sampleIds);
    return this.toPagedItems(variants, page, size, tableSize.size, tableSize.totalSize) as PagedItems<VcfRecord>;
  }

  toPagedItems(
    resources: DatabaseResource[],
    page: number,
    size: number,
    totalElements: number,
    total: number,
  ): PagedItems<Resource> {
    const items = resources.map((item) => ({
      id: item.id,
      data: item.data,
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

  async getRecordById(id: number, sampleIds: number[] | undefined = undefined): Promise<Item<VcfRecord>> {
    console.log("getRecordById");
    const loader = await this.loader;
    if (!loader) throw new Error("Loader was not initialized.");
    const record: VcfRecord = loader.loadVcfRecordById(id, sampleIds);
    return { data: record, id: id };
  }

  async getSamples(params: Params = {}): Promise<PagedItems<Sample>> {
    console.log("getSamples");
    const page = params.page ?? 0;
    const size = params.size ?? 10;
    const loader = await this.loader;
    if (!loader) throw new Error("Loader was not initialized.");
    const tableSize: TableSize = loader.countMatchingSamples(params.query);
    const samples = loader.loadSamples(page, size, params.query);
    return this.toPagedItems(samples, page, size, tableSize.size, tableSize.totalSize) as PagedItems<Sample>;
  }

  async getSampleById(id: number): Promise<Item<Sample>> {
    console.log("getSampleById");
    const loader = await this.loader;
    if (!loader) throw new Error("Loader was not initialized.");
    const sample: Sample = loader.loadSampleById(id);
    return { data: sample, id: id };
  }

  async getPhenotypes(params: Params = {}): Promise<PagedItems<Phenotype>> {
    const page = params.page ?? 0;
    const size = params.size ?? 10;
    const loader = await this.loader;
    if (!loader) throw new Error("Loader was not initialized.");
    const tableSize = loader.countMatchingPhenotypes(params.query);
    return this.toPagedItems(
      loader.loadPhenotypes(page, size, params.query),
      page,
      size,
      tableSize.size,
      tableSize.totalSize,
    ) as PagedItems<Phenotype>;
  }

  getFastaGz(contig: string, pos: number): Promise<Uint8Array | null> {
    let buffer: Uint8Array | null = null;
    if (this.reportData.binary.fastaGz) {
      for (const [key, value] of Object.entries(this.reportData.binary.fastaGz)) {
        const pair = key.split(":");
        if (pair[0] === contig) {
          const interval = pair[1]!.split("-");
          if (pos >= Number.parseInt(interval[0]!, 10) && pos <= Number.parseInt(interval[1]!, 10)) {
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
    return Promise.resolve(genesGz ?? null);
  }

  getCram(sampleId: string): Promise<Cram | null> {
    const cram = this.reportData.binary.cram;
    const sampleCram = cram ? (cram[sampleId] ?? null) : null;
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
