import {
  Api,
  AppMetadata,
  CompareFn,
  CompareValue,
  ComposedQuery,
  Cram,
  DecisionTree,
  HtsFileMetadata,
  Item,
  LeafNode,
  Metadata,
  PagedItems,
  Params,
  Phenotype,
  Query,
  QueryClause,
  Resource,
  Sample,
  Selector,
  SelectorPart,
  SortOrder,
} from "./Api";
import { Metadata as RecordMetadata, Record } from "@molgenis/vip-report-vcf/src/Vcf";
import { compareAsc, compareDesc } from "./compare";

export interface ReportData {
  metadata: Metadata;
  data: Data;
  binary: BinaryReportData;
  decisionTree?: DecisionTree;
}

interface Data {
  [key: string]: Resource[];
}

export interface BinaryReportData {
  vcf?: Uint8Array;
  vcfMeta?: Uint8Array;
  fastaGz?: { [key: string]: Uint8Array };
  genesGz?: Uint8Array;
  cram?: { [key: string]: Cram };
  decisionTree?: DecisionTree;
}

export class ApiClient implements Api {
  private reportData: ReportData;

  constructor(reportData: ReportData) {
    this.reportData = this.postProcessReportData(reportData);
  }

  getRecordsMeta(): Promise<RecordMetadata> {
    return Promise.resolve(this.reportData.metadata.records);
  }

  getRecords(params: Params = {}): Promise<PagedItems<Record>> {
    return this.get("records", params);
  }

  getRecordById(id: number): Promise<Item<Record>> {
    return this.getById("records", id);
  }

  getSamples(params = {}): Promise<PagedItems<Sample>> {
    return this.get("samples", params);
  }

  getSampleById(id: number): Promise<Item<Sample>> {
    return this.getById("samples", id);
  }

  getPhenotypes(params = {}): Promise<PagedItems<Phenotype>> {
    return this.get("phenotypes", params);
  }

  getFastaGz(contig: string, pos: number): Promise<Uint8Array | null> {
    let buffer: Uint8Array | null = null;
    if (this.reportData.binary.fastaGz) {
      for (const [key, value] of Object.entries(this.reportData.binary.fastaGz)) {
        const pair = key.split(":");
        if (pair[0] === contig) {
          const interval = pair[1].split("-");
          if (pos >= parseInt(interval[0], 10) && pos <= parseInt(interval[1], 10)) {
            buffer = value;
            break;
          }
        }
      }
    }
    return Promise.resolve(buffer);
  }

  getHtsFileMetadata(): Promise<HtsFileMetadata> {
    const htsFile = this.reportData.metadata.htsFile;
    return Promise.resolve(htsFile);
  }

  getAppMetadata(): Promise<AppMetadata> {
    const appMeta = this.reportData.metadata.app;
    return Promise.resolve(appMeta);
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

  getDecisionTree(): Promise<DecisionTree | null> {
    const decisionTree = this.reportData.decisionTree;
    return Promise.resolve(decisionTree ? decisionTree : null);
  }

  isDatasetSupport(): boolean {
    return false;
  }

  getDatasetIds(): string[] {
    throw new Error("unsupported");
  }

  selectDataset(id: string): void {
    throw new Error(`unknown id ${id}`);
  }

  private postProcessReportData(reportData: ReportData): ReportData {
    if (!reportData.decisionTree) {
      return reportData;
    }
    const csqItems = reportData.metadata.records.info.CSQ?.nested?.items;
    if (!csqItems) {
      return reportData;
    }

    // make VIPC categorical with categories based on tree exit nodes
    const csqItem = csqItems.find((item) => item.id === "VIPC");
    if (csqItem) {
      csqItem.type = "CATEGORICAL";
      csqItem.categories = Object.values(reportData.decisionTree.nodes)
        .filter((node) => node.type === "LEAF")
        .map((node) => (node as LeafNode).class);
      csqItem.required = true;
    }

    // make HPO categorical with categories based on phenotypes
    const hpoItem = csqItems.find((item) => item.id === "HPO");
    if (hpoItem) {
      const categories = reportData.data.phenotypes
        ? (reportData.data.phenotypes as Phenotype[])
            .flatMap((phenotype) => phenotype.phenotypicFeaturesList)
            .map((phenotype) => phenotype.type.id)
            .filter((v, i, a) => a.indexOf(v) === i)
            .sort()
        : [];
      if (categories.length > 0) {
        hpoItem.type = "CATEGORICAL";
        hpoItem.categories = (reportData.data.phenotypes as Phenotype[])
          .flatMap((phenotype) => phenotype.phenotypicFeaturesList)
          .map((phenotype) => phenotype.type.id)
          .filter((v, i, a) => a.indexOf(v) === i)
          .sort();
      }
    }

    return reportData;
  }

  private get<T extends Resource>(resource: string, params: Params = {}): Promise<PagedItems<T>> {
    return new Promise((resolve, reject) => {
      if (!this.reportData.data[resource]) {
        reject(`unknown resource '${resource}'`);
      }

      let resources = this.reportData.data[resource].map((resource, i) => ({ id: i, data: resource })) as Item<T>[];

      const query = params.query;
      if (query) {
        resources = resources.filter((aResource) => matches(query, aResource));
      }
      if (params.sort) {
        sort(resources, Array.isArray(params.sort) ? params.sort : [params.sort]);
      }
      const page = params.page ? params.page : 0;
      const size = params.size ? params.size : 10;
      const totalElements = resources.length;
      resources = resources.slice(page * size, page * size + size);

      const response: PagedItems<T> = {
        items: resources,
        page: {
          number: page,
          size,
          totalElements,
        },
        total: this.reportData.data[resource].length,
      };
      resolve(response);
    });
  }

  private getById<T extends Resource>(resource: string, id: number): Promise<Item<T>> {
    if (!this.reportData.data[resource]) {
      throw new Error(`unknown resource '${resource}'`);
    }
    return Promise.resolve({ id: id, data: this.reportData.data[resource][id] as T });
  }
}

function getCompareFn(sortOrder: SortOrder): CompareFn {
  let compareFn;
  if (sortOrder.compare === "asc" || sortOrder.compare === null || sortOrder.compare === undefined) {
    compareFn = compareAsc;
  } else if (sortOrder.compare === "desc") {
    compareFn = compareDesc;
  } else if (typeof sortOrder.compare === "function") {
    compareFn = sortOrder.compare;
  } else {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    throw new Error(
      `illegal sort compare value '${
        sortOrder.compare as string
      }'. valid values are 'asc', 'desc' or a function (a, b) => number`,
    );
  }
  return compareFn;
}

type Path = (string | number)[];

function getValue(item: Item<Resource>, path: Path): CompareValue {
  let value: unknown = item.data;
  for (const token of path) {
    if (typeof token === "string") {
      value = (value as { [key: string]: unknown })[token];
    } else {
      value = (value as unknown[][]).map((item) => item[token]);
    }

    if (value === null || value === undefined) {
      value = null;
      break;
    }
  }
  return value as CompareValue;
}

function sort<T extends Resource>(resources: Item<T>[], sortOrders: SortOrder[]) {
  resources.sort((a, b) => {
    let val = 0;
    for (const sortOrder of sortOrders) {
      const path = typeof sortOrder.property === "string" ? [sortOrder.property] : sortOrder.property;
      const valueA = getValue(a, path);
      const valueB = getValue(b, path);

      if ((val = getCompareFn(sortOrder)(valueA, valueB)) !== 0) {
        break;
      }
    }
    return val;
  });
}

function matchesAnd(args: Query[], resource: Item<Resource>): boolean {
  for (const query of args) {
    if (!matches(query, resource)) {
      return false;
    }
  }
  return true;
}

function matchesOr(args: Query[], resource: Item<Resource>): boolean {
  for (const query of args) {
    if (matches(query, resource)) {
      return true;
    }
  }
  return false;
}

function matchesComposed(composedQuery: ComposedQuery, resource: Item<Resource>): boolean {
  let match;
  switch (composedQuery.operator) {
    case "and":
      match = matchesAnd(composedQuery.args, resource);
      break;
    case "or":
      match = matchesOr(composedQuery.args, resource);
      break;
    default:
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new Error(`invalid operator '${composedQuery.operator}'`);
  }
  return match;
}

function matches(query: Query, resource: Item<Resource>): boolean {
  if (query.operator === "and" || query.operator === "or") {
    return matchesComposed(query, resource);
  } else {
    let match;
    switch (query.operator) {
      case "==":
        match = matchesEquals(query, resource);
        break;
      case "~=":
        match = matchesSearch(query, resource);
        break;
      case "~=_any":
        match = matchesSearchAny(query, resource);
        break;
      case "any_~=_any":
        match = matchesAnySearchAny(query, resource);
        break;
      case "in":
        match = matchesIn(query, resource);
        break;
      case "has_any":
        match = matchesHasAny(query, resource);
        break;
      case "!has_any":
        match = !matchesHasAny(query, resource);
        break;
      case "any_has_any":
        match = matchesAnyHasAny(query, resource);
        break;
      case "!any_has_any":
        match = !matchesAnyHasAny(query, resource);
        break;
      case "!=":
        match = !matchesEquals(query, resource);
        break;
      case "!in":
        match = !matchesIn(query, resource);
        break;
      case ">":
        match = matchesGreaterThan(query, resource);
        break;
      case ">=":
        match = matchesGreaterThanOrEqual(query, resource);
        break;
      case "<":
        match = matchesLesserThan(query, resource);
        break;
      case "<=":
        match = matchesLesserThanOrEqual(query, resource);
        break;
      default:
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new Error(`unexpected query operator ${query.operator}`);
    }
    return match;
  }
}

function matchesEquals(query: QueryClause, resource: Item<Resource>): boolean {
  const value: unknown = select(query.selector, resource);
  return value === query.args;
}

function searchEquals(token: unknown, search: unknown): boolean {
  if (typeof token === "string" && typeof search === "string") {
    return token.toLowerCase().startsWith(search.toLowerCase());
  } else {
    return token === search;
  }
}

function matchesSearch(query: QueryClause, resource: Item<Resource>): boolean {
  const value: unknown = select(query.selector, resource);
  if (typeof value === "string" && typeof query.args === "string") {
    return searchEquals(value, query.args);
  } else {
    return value === query.args;
  }
}

function matchesSearchAny(query: QueryClause, resource: Item<Resource>): boolean {
  const value: unknown = select(query.selector, resource);

  if (value === undefined) {
    return false;
  }

  if (!Array.isArray(value)) {
    throw new Error(`value '${value as string}' is of type '${typeof value}' instead of 'array'`);
  }

  for (const arg of query.args as unknown[]) {
    for (const subValue of value as unknown[]) {
      if (searchEquals(subValue, arg)) {
        return true;
      }
    }
  }
  return false;
}

function matchesAnySearchAny(query: QueryClause, resource: Item<Resource>): boolean {
  const value: unknown = select(query.selector, resource);

  if (value === undefined) {
    return false;
  }

  if (!Array.isArray(value)) {
    throw new Error(`value '${value as string}' is of type '${typeof value}' instead of 'array'`);
  }

  for (const item of value as unknown[]) {
    for (const arg of query.args as unknown[]) {
      for (const subItem of item as unknown[]) {
        if (searchEquals(subItem, arg)) {
          return true;
        }
      }
    }
  }
  return false;
}

function matchesIn(query: QueryClause, resource: Item<Resource>): boolean {
  const value: unknown = select(query.selector, resource);

  let match = false;
  if (Array.isArray(query.args)) {
    for (const arg of query.args) {
      if (value === arg) {
        match = true;
        break;
      }
    }
  }
  return match;
}

function matchesAnyHasAny(query: QueryClause, resource: Item<Resource>): boolean {
  const value: unknown = select(query.selector, resource);

  if (value === undefined) {
    return false;
  }

  if (!Array.isArray(value)) {
    throw new Error(`value '${value as string}' is of type '${typeof value}' instead of 'array'`);
  }

  let match = false;
  for (const item of value as unknown[]) {
    if (item !== null) {
      for (const arg of query.args as unknown[]) {
        if ((item as unknown[]).includes(arg)) {
          match = true;
          break;
        }
      }
    }
  }
  return match;
}

function matchesHasAny(query: QueryClause, resource: Item<Resource>): boolean {
  const value: unknown = select(query.selector, resource);

  if (value === undefined) {
    return false;
  }

  if (!Array.isArray(value)) {
    throw new Error(`value '${value as string}' is of type '${typeof value}' instead of 'array'`);
  }

  let match = false;
  for (const arg of query.args as unknown[]) {
    if ((value as unknown[]).includes(arg)) {
      match = true;
      break;
    }
  }
  return match;
}

function matchesGreaterThan(query: QueryClause, resource: Item<Resource>): boolean {
  const value: unknown = select(query.selector, resource);

  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value !== "number") {
    throw new Error(`value '${value as string}' is of type '${typeof value}' instead of 'number'`);
  }
  if (typeof query.args === null || typeof query.args === undefined) {
    throw new Error(`Null values are not supported for > queries`);
  }

  return value > (query.args as number);
}

function matchesGreaterThanOrEqual(query: QueryClause, resource: Item<Resource>): boolean {
  const value: unknown = select(query.selector, resource);

  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value !== "number") {
    throw new Error(`value '${value as string}' is of type '${typeof value}' instead of 'number'`);
  }
  if (typeof query.args === null || typeof query.args === undefined) {
    throw new Error(`Null values are not supported for >= queries`);
  }

  return value >= (query.args as number);
}

function matchesLesserThan(query: QueryClause, resource: Item<Resource>): boolean {
  const value: unknown = select(query.selector, resource);

  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value !== "number") {
    throw new Error(`value '${value as string}' is of type '${typeof value}' instead of 'number'`);
  }
  if (typeof query.args === null || typeof query.args === undefined) {
    throw new Error(`Null and undefined values are not supported for < queries`);
  }

  return value < (query.args as number);
}

function matchesLesserThanOrEqual(query: QueryClause, resource: Item<Resource>): boolean {
  const value: unknown = select(query.selector, resource);

  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value !== "number") {
    throw new Error(`value '${value as string}' is of type '${typeof value}' instead of 'number'`);
  }
  if (typeof query.args === null || typeof query.args === undefined) {
    throw new Error(`Null values are not supported for <= queries`);
  }

  return value <= (query.args as number);
}

function select(selector: Selector, resource: Item<Resource>) {
  let parts: SelectorPart[];
  if (Array.isArray(selector)) {
    parts = (selector as SelectorPart[]).slice();
  } else {
    parts = [selector];
  }
  return selectRecursive(parts, resource.data);
}

function selectRecursive(parts: SelectorPart[], value: unknown): unknown {
  if (parts.length === 0) {
    throw new Error(`expected selector part`);
  }

  const part = parts.shift();
  let selectedValue;

  if (part === "*") {
    if (value === undefined) {
      selectedValue = [];
    } else if (!Array.isArray(value)) {
      throw new Error(`value is of type '${typeof value}' instead of array`);
    } else {
      selectedValue = (value as unknown[]).map((item) => selectRecursive(parts.slice(), item));
    }
  } else {
    if (typeof part === "string") {
      selectedValue = selectFromObject(part, value);
    } else if (Number.isInteger(part)) {
      selectedValue = selectFromArray(part as number, value);
    } else {
      throw new Error(`part type '${typeof part}' is not a 'string' or 'number'`);
    }

    if (parts.length > 0) {
      selectedValue = selectRecursive(parts, selectedValue);
    }
  }
  return selectedValue;
}

function selectFromObject(part: string, value: unknown) {
  if (typeof value !== "object") {
    throw new Error(`value '${value as string}' is of type '${typeof value}' instead of 'object'`);
  }
  return value !== null ? (value as { [index: string]: unknown })[part] : null;
}

function selectFromArray(part: number, value: unknown) {
  if (!Array.isArray(value)) {
    throw new Error(`value is of type '${typeof value}' instead of array`);
  }
  return (value as unknown[])[part];
}
