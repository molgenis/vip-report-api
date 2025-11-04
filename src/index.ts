import { VcfMetadata, VcfRecord } from "@molgenis/vip-report-vcf";
import { ApiClient as ApiClientAlias } from "./apiClient";
import { WindowApiClientFactory as WindowApiClientAlias } from "./WindowApiClient";
import { ReportDatabase as ReportDatabaseAlias } from "./ReportDatabase";

// export API implementations
export const ApiClient = ApiClientAlias;
export const WindowApiClientFactory = WindowApiClientAlias;
export const ReportDatabase = ReportDatabaseAlias;

// export API interface and types
export interface Api {
  getConfig(): Promise<Json | null>;

  getRecordsMeta(): Promise<VcfMetadata>;

  getRecords(params: RecordParams): Promise<PagedItems<VcfRecord>>;

  /**
   *
   * if sampleIds is undefined or missing -> return record including data for all samples
   * if sampleIds is [] -> return record excluding sample data
   * if sampleIds is e.g. [ 2 , 3 ] -> return record including data for sample 2 and 3
   *
   * */
  getRecordById(id: number, sampleIds: number[] | undefined): Promise<Item<VcfRecord>>;

  getSamples(params: Params): Promise<PagedItems<Sample>>;

  getSampleById(id: number): Promise<Item<Sample>>;

  getPhenotypes(params: Params): Promise<PagedItems<Phenotype>>;

  getFastaGz(contig: string, pos: number): Promise<Uint8Array | null>;

  getGenesGz(): Promise<Uint8Array | null>;

  getCram(sampleId: string): Promise<Cram | null>;

  getAppMetadata(): Promise<AppMetadata>;

  getDecisionTree(): Promise<DecisionTree | null>;

  getSampleTree(): Promise<DecisionTree | null>;
}

export type Json = string | number | boolean | null | { [property: string]: Json } | Json[];

export interface Resource {
  [key: string]: unknown;
}

export interface Params {
  query?: Query;
  sort?: SortOrder | SortOrder[];
  page?: number;
  size?: number;
}

export interface RecordParams extends Params {
  sampleIds?: number[];
}
export type SortPath = (string | number)[];

export interface SortOrder {
  property: string | SortPath;
  compare?: "asc" | "desc";
}

export interface Sample extends Resource {
  person: Person;
  index: number;
  proband: boolean;
}

export interface Item<T extends Resource> {
  id: number;
  data: T;
}

export interface Items<T extends Resource> {
  items: Item<T>[];
  total: number;
}

export interface PagedItems<T extends Resource> extends Items<T> {
  page: Page;
}

export interface Page {
  number: number;
  size: number;
  totalElements: number;
}

export interface AppMetadata {
  name: string;
  version: string;
  args: string;
  htsFile?: HtsFileMetadata;
}

export interface HtsFileMetadata {
  htsFormat: string;
  uri: string;
  genomeAssembly: string;
}

export type SelectorPart = string | number;
export type Selector = SelectorPart | SelectorPart[];

export interface ComposedQuery {
  operator: ComposedQueryOperator;
  args: (QueryClause | ComposedQuery)[];
}

export type ComposedQueryOperator = "and" | "or";

export type QueryOperator = "==" | "~=" | "!=" | "in" | "!in" | ">" | ">=" | "<" | "<=";

export interface QueryClause {
  operator: QueryOperator;
  selector: Selector;
  args: string | number | boolean | string[] | (string | null)[] | number[] | (number | null)[] | null | undefined;
}

export type Query = QueryClause | ComposedQuery;

export interface Person {
  familyId: string;
  individualId: string;
  paternalId: string;
  maternalId: string;
  sex: "UNKNOWN_SEX" | "FEMALE" | "MALE" | "OTHER_SEX";
  affectedStatus: "MISSING" | "UNAFFECTED" | "AFFECTED";
}

export interface Phenotype extends Resource {
  subject: PhenotypeSubject;
  phenotypicFeaturesList: PhenotypicFeature[];
}

export interface PhenotypeSubject {
  id: string;
}

export interface OntologyClass {
  id: string;
  label: string;
}

export interface PhenotypicFeature {
  type: OntologyClass;
}

export interface BoolMultiNode extends Node {
  nodeType: NodeType;
  id: string;
  decisionType: DecisionType;
  fields: string[];
  outcomes: BoolMultiQuery[];
  outcomeMissing: NodeOutcome;
  outcomeDefault: NodeOutcome;
}

export interface BoolMultiQuery {
  id: string;
  queries: BoolQuery[];
  outcomeTrue: NodeOutcome;
  operator: ClauseOperator;
}

export interface BoolNode extends Node {
  query: BoolQuery;
  outcomeTrue: NodeOutcome;
  outcomeFalse: NodeOutcome;
  outcomeMissing: NodeOutcome;
}

export interface BoolQuery {
  field: string;
  operator: Operator;
  value: unknown;
}

export interface CategoricalNode extends Node {
  field: string;
  outcomeMap: { [index: string]: NodeOutcome };
  outcomeMissing: NodeOutcome;
  outcomeDefault: NodeOutcome;
}

export interface DecisionTree {
  rootNode: string;
  nodes: { [index: string]: BoolMultiNode | BoolNode | CategoricalNode | ExistsNode | LeafNode };
  labels: { [index: string]: Label };
  files: { [index: string]: Path };
}

export interface ExistsNode extends Node {
  field: string;
  outcomeTrue: NodeOutcome;
  outcomeFalse: NodeOutcome;
}

export interface Label {
  id: string;
  description: string;
}

export interface LeafNode extends Node {
  class: string;
}

export interface Node {
  type: Type;
  label: string;
  description: string;
}

export interface NodeOutcome {
  nextNode: string;
  label: string;
}

export interface Path {
  [key: string]: string;
}

export type ClauseOperator = "AND" | "OR";
export type Operator =
  | "=="
  | "!="
  | "<"
  | "<="
  | ">"
  | ">="
  | "in"
  | "!in"
  | "contains"
  | "!contains"
  | "contains_any"
  | "contains_all"
  | "contains_none";
export type Type = "BOOL" | "BOOL_MULTI" | "CATEGORICAL" | "EXISTS" | "LEAF";
export type NodeType = "DECISION" | "LEAF";
export type DecisionType = "BOOL" | "BOOL_MULTI" | "CATEGORICAL" | "EXISTS";
export type Cram = {
  cram: Uint8Array;
  crai: Uint8Array;
};

export interface ReportData {
  database?: Uint8Array;
  binary: BinaryReportData;
}

/*
 * wasmBinary -> sql.js 1.13.0 wasm binary
 */
export interface BinaryReportData {
  fastaGz?: { [key: string]: Uint8Array };
  genesGz?: Uint8Array;
  wasmBinary?: Uint8Array;
  cram?: { [key: string]: Cram };
}
