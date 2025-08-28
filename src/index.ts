import { SupplementaryMetadata, VcfMetadata, VcfRecord } from "@molgenis/vip-report-vcf";
import { ApiClient as ApiClientAlias } from "./apiClient";
import { WindowApiClient as WindowApiClientAlias } from "./WindowApiClient";

// export API implementations
export const ApiClient = ApiClientAlias;
export const WindowApiClient = WindowApiClientAlias;

// export API interface and types
export interface Api {
  getConfig(): Promise<Json | null>;

  getRecordsMeta(): Promise<VcfMetadata>;

  getRecords(params: Params): Promise<PagedItems<VcfRecord>>;

  getRecordById(id: number): Promise<Item<VcfRecord>>;

  getSamples(params: Params): Promise<PagedItems<Sample>>;

  getSampleById(id: number): Promise<Item<Sample>>;

  getPhenotypes(params: Params): Promise<PagedItems<Phenotype>>;

  getFastaGz(contig: string, pos: number): Promise<Uint8Array | null>;

  getGenesGz(): Promise<Uint8Array | null>;

  getCram(sampleId: string): Promise<Cram | null>;

  getHtsFileMetadata(): Promise<HtsFileMetadata>;

  getAppMetadata(): Promise<AppMetadata>;

  getDecisionTree(): Promise<DecisionTree | null>;

  getSampleTree(): Promise<DecisionTree | null>;
}

export type Json = string | number | boolean | null | { [property: string]: Json } | Json[];

export interface Metadata {
  app: AppMetadata;
  htsFile: HtsFileMetadata;
  records: VcfMetadata;
}

export interface Resource {
  [key: string]: unknown;
}

export interface Params {
  query?: Query;
  sort?: SortOrder | SortOrder[];
  page?: number;
  size?: number;
}

export type SortPath = (string | number)[];

export interface SortOrder {
  property: string | SortPath;
  compare?: "asc" | "desc" | CompareFn;
}

export type CompareValueBoolean = boolean | null;
export type CompareValueNumber = number | null;
export type CompareValueString = string | null;
export type CompareValue =
  | CompareValueBoolean
  | CompareValueBoolean[]
  | CompareValueNumber
  | CompareValueNumber[]
  | CompareValueString
  | CompareValueString[];
export type CompareFn = (a: CompareValue, b: CompareValue) => number;

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

export type QueryOperator =
  | "=="
  | "~="
  | "~=_any"
  | "any_~=_any"
  | "!="
  | "in"
  | "!in"
  | "has_any"
  | "!has_any"
  | "any_has_any"
  | "!any_has_any"
  | ">"
  | ">="
  | "<"
  | "<=";

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
  config?: Json;
  metadata: Metadata;
  data: Data;
  database: Uint8Array;
  binary: BinaryReportData;
  decisionTree?: DecisionTree;
  sampleTree?: DecisionTree;
  vcfMeta?: SupplementaryMetadata;
}

interface Data {
  [key: string]: Resource[];
}

export interface BinaryReportData {
  vcf?: Uint8Array;
  fastaGz?: { [key: string]: Uint8Array };
  genesGz?: Uint8Array;
  cram?: { [key: string]: Cram };
}
