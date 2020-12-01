export interface ApiData {
  metadata: Metadata;
  data: Data;
}

export interface Metadata {
  app: AppMetadata;
  htsFile: HtsFileMetadata;
  records: RecordsMetadata;
}

export interface Data {
  [key: string]: Items<Resource>;
}

export interface Resource {
  [key: string]: any;
}

export interface Params {
  query?: Query;
  sort?: SortOrder | SortOrder[];
  page?: number;
  size?: number;
}

export interface SortOrder {
  property: string | string[];
  compare?: 'asc' | 'desc' | CompareFn;
}

export type CompareFn = (
  a: boolean | boolean[] | string | string[] | number | number[] | null,
  b: boolean | boolean[] | string | string[] | number | number[] | null
) => number;

export interface Record extends Resource {
  c: string;
  p: number;
  i?: string[];
  r: string;
  a: string[];
  q?: number;
  f?: string[];
  n?: Info;
  s?: RecordSample[];
}

export interface Sample extends Resource {
  person: Person;
  index: number;
  proband: boolean;
}

export interface Items<T extends Resource> {
  items: T[];
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

export interface RecordsMetadata {
  info: InfoMetadata[];
  format: FormatMetadata[];
}

export interface CompoundMetadata {
  id: string;
  number?: NumberMetadata;
  type: 'CHARACTER' | 'INTEGER' | 'FLAG' | 'FLOAT' | 'STRING' | 'NESTED';
  description: string;
}

export interface InfoMetadata extends CompoundMetadata {
  source?: string;
  version?: string;
  nested?: InfoMetadata[];
}

export interface FormatMetadata extends CompoundMetadata {
  nested?: FormatMetadata[];
}

export interface NumberMetadata {
  type: 'NUMBER' | 'PER_ALT' | 'PER_ALT_AND_REF' | 'PER_GENOTYPE' | 'OTHER';
  count?: number;
}

export type SelectorPart = string | number;

export type Selector = SelectorPart | SelectorPart[];

export interface Query {
  operator: '==' | '!=' | 'in' | '!in' | 'has_any' | 'any_has_any';
  selector: Selector;
  args: string | number | boolean | string[] | number[];
}

export type InfoValue = string | number | boolean | InfoValue[] | null;

export interface Info {
  [index: string]: InfoValue | InfoValue[];
}

export interface RecordSample {
  gt?: Genotype;
  f?: object;
}

export interface Genotype {
  a?: string[];
  p: boolean;
  t: 'het' | 'hom_a' | 'hom_r' | 'miss' | 'part';
}

export interface Person {
  familyId: string;
  individualId: string;
  paternalId: string;
  maternalId: string;
  sex: 'UNKNOWN_SEX' | 'FEMALE' | 'MALE' | 'OTHER_SEX';
  affectedStatus: 'MISSING' | 'UNAFFECTED' | 'AFFECTED';
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

export default class Api {
  constructor(private reportData: ApiData) {
    this.reportData = reportData;
  }

  getMeta(): Promise<Metadata> {
    return new Promise((resolve) => {
      resolve(this.reportData.metadata);
    });
  }

  get<T extends Resource>(resource: string, params: Params = {}): Promise<PagedItems<T>> {
    return new Promise((resolve, reject) => {
      if (!this.reportData.data[resource]) {
        reject(`unknown resource '${resource}'`);
      }

      let resources: T[] = this.reportData.data[resource].items.slice() as T[];
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
        total: this.reportData.data[resource].total,
      };
      resolve(response);
    });
  }

  getRecords(params: Params = {}): Promise<PagedItems<Record>> {
    return this.get('records', params);
  }

  getSamples(params = {}): Promise<PagedItems<Sample>> {
    return this.get('samples', params);
  }

  getPhenotypes(params = {}): Promise<PagedItems<Phenotype>> {
    return this.get('phenotypes', params);
  }
}

function get(
  value: object | null | undefined,
  path: string[]
): boolean | boolean[] | number | number[] | string | string[] | null {
  let valueAtDepth: any = value;
  for (const token of path) {
    if (valueAtDepth === undefined) {
      valueAtDepth = null;
    } else if (valueAtDepth !== null) {
      if (typeof valueAtDepth !== 'object' || Array.isArray(valueAtDepth)) {
        throw new Error(`invalid path ${path}`);
      }
      valueAtDepth = valueAtDepth[token];
    }
  }
  return valueAtDepth !== undefined ? valueAtDepth : null;
}

function compareAsc(a: unknown, b: unknown) {
  if (a === null) {
    return b === null ? 0 : 1;
  } else if (b === null) {
    return -1;
  } else if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  } else if (typeof a === 'string' && typeof b === 'string') {
    return a.toUpperCase().localeCompare(b.toUpperCase());
  } else if (typeof a === 'boolean' && typeof b === 'boolean') {
    return a === b ? 0 : a ? -1 : 1;
  } else {
    const type = typeof a;
    throw new Error(`can't compare values of type '${type}'. consider providing a custom compare function.`);
  }
}

function compareDesc(a: unknown, b: unknown) {
  return compareAsc(b, a);
}

function getCompareFn(sortOrder: SortOrder): CompareFn {
  let compareFn;
  if (sortOrder.compare === 'asc' || sortOrder.compare === null || sortOrder.compare === undefined) {
    compareFn = compareAsc;
  } else if (sortOrder.compare === 'desc') {
    compareFn = compareDesc;
  } else if (typeof sortOrder.compare === 'function') {
    compareFn = sortOrder.compare;
  } else {
    throw new Error(
      `illegal sort compare value '${sortOrder.compare}'. valid values are 'asc', 'desc' or a function (a, b) => number`
    );
  }
  return compareFn;
}

function sort<T extends Resource>(resources: T[], sortOrders: SortOrder[]) {
  resources.sort((a, b) => {
    let val = 0;
    for (const sortOrder of sortOrders) {
      const path = Array.isArray(sortOrder.property) ? sortOrder.property : [sortOrder.property];
      const left = get(a, path);
      const right = get(b, path);

      val = getCompareFn(sortOrder)(left, right);
      if (val !== 0) {
        break;
      }
    }
    return val;
  });
}

function matches(query: Query, resource: Resource): boolean {
  let match;
  switch (query.operator) {
    case '==':
      match = matchesEquals(query, resource);
      break;
    case 'in':
      match = matchesIn(query, resource);
      break;
    case 'has_any':
      match = matchesHasAny(query, resource);
      break;
    case 'any_has_any':
      match = matchesAnyHasAny(query, resource);
      break;
    case '!=':
      match = !matchesEquals(query, resource);
      break;
    case '!in':
      match = !matchesIn(query, resource);
      break;
    default:
      throw new Error('unexpected query operator ' + query.operator);
  }
  return match;
}

function matchesEquals(query: Query, resource: Resource): boolean {
  const value: any = select(query.selector, resource);
  return value === query.args;
}

function matchesIn(query: Query, resource: Resource): boolean {
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

function matchesAnyHasAny(query: Query, resource: Resource): boolean {
  const value: any = select(query.selector, resource);

  if (!Array.isArray(value)) {
    throw new Error(`value '${value}' is of type '${typeof value}' instead of 'array'`);
  }

  let match = false;
  for (const item of value as unknown[]) {
    for (const arg of query.args as unknown[]) {
      if ((item as unknown[]).includes(arg)) {
        match = true;
        break;
      }
    }
  }
  return match;
}

function matchesHasAny(query: Query, resource: Resource): boolean {
  const value: any = select(query.selector, resource);

  if (!Array.isArray(value)) {
    throw new Error(`value '${value}' is of type '${typeof value}' instead of 'array'`);
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

function select(selector: Selector, resource: Resource) {
  let parts: SelectorPart[];
  if (Array.isArray(selector)) {
    parts = (selector as SelectorPart[]).slice();
  } else {
    parts = [selector];
  }
  return selectRecursive(parts, resource);
}

function selectRecursive(parts: SelectorPart[], value: unknown): unknown {
  if (parts.length === 0) {
    throw new Error(`expected selector part`);
  }

  const part = parts.shift();
  let selectedValue;

  if (part === '*') {
    if (!Array.isArray(value)) {
      throw new Error(`value is of type '${typeof value}' instead of array`);
    }
    selectedValue = (value as unknown[]).map((item) => selectRecursive(parts.slice(), item));
  } else {
    if (typeof part === 'string') {
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
  if (typeof value !== 'object') {
    throw new Error(`value '${value}' is of type '${typeof value}' instead of 'object'`);
  }
  return value !== null ? (value as { [index: string]: unknown })[part] : null;
}

function selectFromArray(part: number, value: unknown) {
  if (!Array.isArray(value)) {
    throw new Error(`value is of type '${typeof value}' instead of array`);
  }
  return (value as unknown[])[part];
}
