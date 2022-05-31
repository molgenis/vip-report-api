import {
  Api,
  AppMetadata,
  CompareFn,
  ComposedQuery,
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
import { FieldMetadata, NestedFieldMetadata } from "@molgenis/vip-report-vcf/src/MetadataParser";

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
  fastaGz?: { [key: string]: Uint8Array };
  genesGz?: Uint8Array;
  bam?: { [key: string]: Uint8Array };
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

  getBam(sampleId: string): Promise<Uint8Array | null> {
    const bam = this.reportData.binary.bam;
    const sampleBam = bam ? (bam[sampleId] ? bam[sampleId] : null) : null;
    return Promise.resolve(sampleBam);
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

function getSingleNestedValue(
  sort: SortOrder | null,
  valueAtDepth: boolean[] | number[] | string[],
  path: string[],
  i: number,
  value: object | null | undefined
) {
  if (sort !== null) {
    let values: boolean[] | number[] | string[] = [];
    valueAtDepth.forEach((nestedValues) => {
      const nestedValue = nestedValues[path[i + 1] as keyof typeof value];
      if (nestedValue !== undefined && nestedValue != null) {
        values.push(nestedValue);
      }
    });
    values = values.sort((a, b) => getCompareFn(sort)(a, b));
    return values.length > 0 ? values[0] : null;
  } else {
    throw new Error(`Cannot get a single value for an array without a sort.`);
  }
}

function getSingleValue(
  value: object | null | undefined,
  path: string[],
  sort: SortOrder | null
): boolean | boolean[] | number | number[] | string | string[] | null {
  let valueAtDepth: boolean | boolean[] | number | number[] | string | string[] | null = value as
    | boolean
    | boolean[]
    | number
    | number[]
    | string
    | string[]
    | null;
  if (valueAtDepth === undefined || valueAtDepth === null) {
    return null;
  }

  for (let i = 0; i < path.length; i++) {
    const token = path[i];
    if (typeof valueAtDepth !== "object") {
      throw new Error(`invalid path ${path.join("/")}`);
    } else {
      if (Array.isArray(valueAtDepth) && token === "*") {
        return getSingleNestedValue(sort, valueAtDepth, path, i, value);
      } else {
        valueAtDepth = valueAtDepth[token as keyof typeof value];
      }
    }
  }
  return valueAtDepth === undefined ? null : valueAtDepth;
}

function compareAsc(a: unknown, b: unknown): number {
  if (a === null) {
    return b === null ? 0 : -1;
  } else if (b === null) {
    return 1;
  } else if (typeof a === "number" && typeof b === "number") {
    return compareAscNumber(a, b);
  } else if (typeof a === "string" && typeof b === "string") {
    return compareAscString(a, b);
  } else if (typeof a === "boolean" && typeof b === "boolean") {
    return compareAscBoolean(a, b);
  } else if (Array.isArray(a) && Array.isArray(b)) {
    return compareAscArray(a, b);
  } else {
    throw new CompareTypeError(a);
  }
}

function compareAscNumber(a: number, b: number): number {
  return a - b;
}

function compareAscString(a: string, b: string): number {
  return a.toUpperCase().localeCompare(b.toUpperCase());
}

function compareAscBoolean(a: boolean, b: boolean): number {
  if (a === b) {
    return 0;
  } else {
    return a ? -1 : 1;
  }
}

function compareAscArray(a: unknown[], b: unknown[]): number {
  if (a.length === 0) {
    return b.length === 0 ? 0 : -1;
  } else if (b.length === 0) {
    return 1;
  } else {
    const firstA = a.find((value) => value !== null);
    if (firstA !== undefined && typeof firstA !== "number" && typeof firstA !== "string")
      throw new CompareTypeError(firstA);
    const firstB = b.find((value) => value !== null);
    if (firstB !== undefined && typeof firstB !== "number" && typeof firstB !== "string")
      throw new CompareTypeError(firstB);

    // sort on first array item
    const sortedA = a.slice().sort();
    const sortedB = b.slice().sort();
    return compareAsc(sortedA[0], sortedB[0]);
  }
}

function compareDesc(a: unknown, b: unknown) {
  return compareAsc(b, a);
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
      }'. valid values are 'asc', 'desc' or a function (a, b) => number`
    );
  }
  return compareFn;
}

class CompareTypeError extends Error {
  constructor(value: unknown) {
    super(`can't compare values of type '${typeof value}'. consider providing a custom compare function.`);
    this.name = "CompareTypeError";
  }
}

function getNestedPath(sortOrder: SortOrder, path: string[]) {
  if (typeof sortOrder.property === "string") {
    throw new Error("Cannot create a nested path for a string value.");
  }
  const fieldMetadata: FieldMetadata = sortOrder.property;
  path = [];
  path.push("n");
  if (fieldMetadata.parent) {
    path.push(fieldMetadata.parent.id);
    if (fieldMetadata.parent.number.type !== "NUMBER" || fieldMetadata.parent.number.count !== 1) {
      path.push("*");
    }
    const nested: NestedFieldMetadata = fieldMetadata.parent.nested as NestedFieldMetadata;
    const idx = nested.items.indexOf(fieldMetadata);
    if (idx === -1) {
      throw new Error(`unknown field '${fieldMetadata.id}'`);
    }
    //TODO index is a number and should be treated as such
    path.push(idx as unknown as string);
  } else {
    path.push(fieldMetadata.id);
  }
  return path;
}

function sort<T extends Resource>(resources: Item<T>[], sortOrders: SortOrder[]) {
  resources.sort((a, b) => {
    let val = 0;
    for (const sortOrder of sortOrders) {
      let path: string[] = [];
      if (typeof sortOrder.property === "string") {
        path = [sortOrder.property] as string[];
      } else {
        path = getNestedPath(sortOrder, path);
      }
      const left = getSingleValue(a.data, path, sortOrder);
      const right = getSingleValue(b.data, path, sortOrder);

      val = getCompareFn(sortOrder)(left, right);
      if (val !== 0) {
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
  const value: any = select(query.selector, resource);
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
  const value: any = select(query.selector, resource);
  if (typeof value === "string" && typeof query.args === "string") {
    return searchEquals(value, query.args);
  } else {
    return value === query.args;
  }
}

function matchesSearchAny(query: QueryClause, resource: Item<Resource>): boolean {
  const value: any = select(query.selector, resource);

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
  const value: any = select(query.selector, resource);

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
  const value: any = select(query.selector, resource);

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
  const value: any = select(query.selector, resource);

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
  const value: any = select(query.selector, resource);

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
  const value: any = select(query.selector, resource);

  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value !== "number") {
    throw new Error(`value '${value as string}' is of type '${typeof value}' instead of 'number'`);
  }

  return value > query.args;
}

function matchesGreaterThanOrEqual(query: QueryClause, resource: Item<Resource>): boolean {
  const value: any = select(query.selector, resource);

  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value !== "number") {
    throw new Error(`value '${value as string}' is of type '${typeof value}' instead of 'number'`);
  }

  return value >= query.args;
}

function matchesLesserThan(query: QueryClause, resource: Item<Resource>): boolean {
  const value: any = select(query.selector, resource);

  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value !== "number") {
    throw new Error(`value '${value as string}' is of type '${typeof value}' instead of 'number'`);
  }

  return value < query.args;
}

function matchesLesserThanOrEqual(query: QueryClause, resource: Item<Resource>): boolean {
  const value: unknown = select(query.selector, resource);

  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value !== "number") {
    throw new Error(`value '${value as string}' is of type '${typeof value}' instead of 'number'`);
  }

  return value <= query.args;
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
