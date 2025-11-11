import { InfoOrder, VcfMetadata, VcfRecord } from "@molgenis/vip-report-vcf";
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
import { ReportDatabase } from "./ReportDatabase";
import { validateQuery } from "./validateQuery";
import { DatabaseRecord, DatabaseResource, TableSize } from "./sql";

export class ApiClient implements Api {
  constructor(
    private readonly db: ReportDatabase,
    private readonly reportData: ReportData,
  ) {}

  async getConfig(): Promise<Json | null> {
    return this.db.loadConfig();
  }

  async getRecordsMeta(): Promise<VcfMetadata> {
    return this.db.getMetadata();
  }

  async getRecords(params: RecordParams = {}): Promise<PagedItems<VcfRecord>> {
    const page = params.page ?? 0;
    const size = params.size ?? 10;
    validateQuery(this.db.getMetadata(), params.query);
    const tableSize: TableSize = this.db.countMatchingVariants(params.query);
    const variants: DatabaseRecord[] = this.db.loadVcfRecords(page, size, params.sort, params.query, params.sampleIds);
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
    const record: VcfRecord = this.db.loadVcfRecordById(id, sampleIds);
    return { data: record, id: id };
  }

  async getSamples(params: Params = {}): Promise<PagedItems<Sample>> {
    const page = params.page ?? 0;
    const size = params.size ?? 10;
    const tableSize: TableSize = this.db.countMatchingSamples(params.query);
    const samples = this.db.loadSamples(page, size, params.sort, params.query);
    return this.toPagedItems(samples, page, size, tableSize.size, tableSize.totalSize) as PagedItems<Sample>;
  }

  async getSampleById(id: number): Promise<Item<Sample>> {
    const sample: Sample = this.db.loadSampleById(id);
    return { data: sample, id: id };
  }

  async getPhenotypes(params: Params = {}): Promise<PagedItems<Phenotype>> {
    const page = params.page ?? 0;
    const size = params.size ?? 10;
    const tableSize = this.db.countMatchingPhenotypes(params.query);
    return this.toPagedItems(
      this.db.loadPhenotypes(page, size, params.query),
      page,
      size,
      tableSize.size,
      tableSize.totalSize,
    ) as PagedItems<Phenotype>;
  }

  getFastaGz(contig: string, pos: number): Promise<Uint8Array | null> {
    let buffer: Uint8Array | null = null;
    if (this.reportData.fastaGz) {
      for (const [key, value] of Object.entries(this.reportData.fastaGz)) {
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
    return this.db.loadAppMetadata();
  }

  getGenesGz(): Promise<Uint8Array | null> {
    const genesGz = this.reportData.genesGz;
    return Promise.resolve(genesGz ?? null);
  }

  getCram(sampleId: string): Promise<Cram | null> {
    const cram = this.reportData.cram;
    const sampleCram = cram ? (cram[sampleId] ?? null) : null;
    return Promise.resolve(sampleCram);
  }

  async getDecisionTree(): Promise<DecisionTree | null> {
    return this.db.loadDecisionTree("decisionTree");
  }

  async getSampleTree(): Promise<DecisionTree | null> {
    return this.db.loadDecisionTree("sampleDecisionTree");
  }

  async getInfoOrder(): Promise<InfoOrder> {
    return this.db.loadInfoOrder();
  }
}
