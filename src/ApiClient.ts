import {
  Api,
  CompareFn,
  ComposedQuery,
  Items,
  Metadata,
  PagedItems,
  Params,
  Phenotype,
  Query,
  Resource,
  Sample,
  Selector,
  SelectorPart,
  SortOrder
} from './Api';
import * as ApiData from './ApiData';
import { Record } from './vcf/Vcf';
import { Buffer } from 'buffer';
import { gunzipSync } from 'fflate';
import { parseVcf } from './vcf/VcfParser';
import { Base85 } from './Base85';

interface ReportData {
  metadata: Metadata;
  data: Data;
  binary: BinaryData;
}

interface Data {
  [key: string]: Items<Resource>;
}

interface BinaryData extends BinaryDataNode {
  vcfGz: Buffer;
  fastaGz?: BinaryDataNode;
  genesGz?: Buffer;
  bam?: BinaryDataNode;
  decisionTreeGz?: Buffer;
}

interface BinaryDataNode {
  [key: string]: Buffer | BinaryDataNode | undefined;
}

export class ApiClient implements Api {
  private reportData: ReportData;

  constructor(apiDataContainer: ApiData.Container) {
    this.reportData = decode(apiDataContainer);
  }

  getMeta(): Promise<Metadata> {
    return Promise.resolve(this.reportData.metadata);
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

  getVcfGz(): Promise<Buffer> {
    return Promise.resolve(this.reportData.binary.vcfGz);
  }

  getFastaGz(contig: string, pos: number): Promise<Buffer | null> {
    let buffer: Buffer | null = null;
    if (this.reportData.binary.fastaGz) {
      for (const [key, value] of Object.entries(this.reportData.binary.fastaGz)) {
        const pair = key.split(':');
        if (pair[0] === contig) {
          const interval = pair[1].split('-');
          if (pos >= parseInt(interval[0], 10) && pos <= parseInt(interval[1], 10)) {
            buffer = value as Buffer;
            break;
          }
        }
      }
    }
    return Promise.resolve(buffer);
  }

  getGenesGz(): Promise<Buffer | null> {
    const genesGz = this.reportData.binary.genesGz;
    return Promise.resolve(genesGz ? genesGz : null);
  }

  getBam(sampleId: string): Promise<Buffer | null> {
    const bam = this.reportData.binary.bam;
    const sampleBam: Buffer | null = bam ? (bam[sampleId] as Buffer) : null;
    return Promise.resolve(sampleBam !== undefined ? sampleBam : null);
  }

  getDecisionTreeGz(): Promise<Buffer | null> {
    const decisionTreeGz = this.reportData.binary.decisionTreeGz;
    return Promise.resolve(decisionTreeGz ? decisionTreeGz : null);
  }

  private get<T extends Resource>(resource: string, params: Params = {}): Promise<PagedItems<T>> {
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
          totalElements
        },
        total: this.reportData.data[resource].total
      };
      resolve(response);
    });
  }
}

const base85 = new Base85();

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
    return compareAscNumber(a, b);
  } else if (typeof a === 'string' && typeof b === 'string') {
    return compareAscString(a, b);
  } else if (typeof a === 'boolean' && typeof b === 'boolean') {
    return compareAscBoolean(a, b);
  } else {
    const type = typeof a;
    throw new Error(`can't compare values of type '${type}'. consider providing a custom compare function.`);
  }
}

function compareAscNumber(a: number, b: number) {
  return a - b;
}

function compareAscString(a: string, b: string) {
  return a.toUpperCase().localeCompare(b.toUpperCase());
}

function compareAscBoolean(a: boolean, b: boolean) {
  if (a === b) {
    return 0;
  } else {
    return a ? -1 : 1;
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

function matchesAnd(args: (Query | ComposedQuery)[], resource: Resource): boolean {
  for (const query of args) {
    if (!matches(query, resource)) {
      return false;
    }
  }
  return true;
}

function matchesOr(args: (Query | ComposedQuery)[], resource: Resource): boolean {
  for (const query of args) {
    if (matches(query, resource)) {
      return true;
    }
  }
  return false;
}

function matchesComposed(composedQuery: ComposedQuery, resource: Resource): boolean {
  let match;
  switch (composedQuery.operator) {
    case 'and':
      match = matchesAnd(composedQuery.args, resource);
      break;
    case 'or':
      match = matchesOr(composedQuery.args, resource);
      break;
    default:
      throw new Error(`invalid operator '${composedQuery.operator}'`);
  }
  return match;
}

function matches(query: Query | ComposedQuery, resource: Resource): boolean {
  if (query.operator === 'and' || query.operator === 'or') {
    return matchesComposed(query, resource);
  } else {
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
      case '!has_any':
        match = !matchesHasAny(query, resource);
        break;
      case 'any_has_any':
        match = matchesAnyHasAny(query, resource);
        break;
      case '!any_has_any':
        match = !matchesAnyHasAny(query, resource);
        break;
      case '!=':
        match = !matchesEquals(query, resource);
        break;
      case '!in':
        match = !matchesIn(query, resource);
        break;
      case '>':
        match = matchesGreaterThan(query, resource);
        break;
      case '>=':
        match = matchesGreaterThanOrEqual(query, resource);
        break;
      case '<':
        match = matchesLesserThan(query, resource);
        break;
      case '<=':
        match = matchesLesserThanOrEqual(query, resource);
        break;
      default:
        throw new Error('unexpected query operator ' + query.operator);
    }
    return match;
  }
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

  if (value === undefined) {
    return false;
  }

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

  if (value === undefined) {
    return false;
  }

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

function matchesGreaterThan(query: Query, resource: Resource): boolean {
  const value: any = select(query.selector, resource);

  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value !== 'number') {
    throw new Error(`value '${value}' is of type '${typeof value}' instead of 'number'`);
  }

  return value > query.args;
}

function matchesGreaterThanOrEqual(query: Query, resource: Resource): boolean {
  const value: any = select(query.selector, resource);

  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value !== 'number') {
    throw new Error(`value '${value}' is of type '${typeof value}' instead of 'number'`);
  }

  return value >= query.args;
}

function matchesLesserThan(query: Query, resource: Resource): boolean {
  const value: any = select(query.selector, resource);

  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value !== 'number') {
    throw new Error(`value '${value}' is of type '${typeof value}' instead of 'number'`);
  }

  return value < query.args;
}

function matchesLesserThanOrEqual(query: Query, resource: Resource): boolean {
  const value: any = select(query.selector, resource);

  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value !== 'number') {
    throw new Error(`value '${value}' is of type '${typeof value}' instead of 'number'`);
  }

  return value <= query.args;
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
    if (value === undefined) {
      selectedValue = [];
    } else if (!Array.isArray(value)) {
      throw new Error(`value is of type '${typeof value}' instead of array`);
    } else {
      selectedValue = (value as unknown[]).map((item) => selectRecursive(parts.slice(), item));
    }
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

function decode(apiDataContainer: ApiData.Container): ReportData {
  const reportData: ReportData = {
    metadata: apiDataContainer.metadata as Metadata,
    data: apiDataContainer.data,
    binary: base85ToBinary(apiDataContainer.base85) as BinaryData
  };

  const binaryVcf = gunzipSync(reportData.binary.vcfGz);
  const textVcf = Buffer.from(binaryVcf.buffer).toString();
  const vcf = parseVcf(textVcf);

  reportData.metadata.records = vcf.metadata;
  reportData.data.records = {
    items: vcf.data,
    total: vcf.data.length
  };

  return reportData;
}

function base85ToBinary(obj: ApiData.EncodedDataContainer): BinaryDataNode {
  const binaryObj: BinaryDataNode = {};
  for (const [key, value] of Object.entries(obj)) {
    switch (typeof value) {
      case 'string':
        binaryObj[key] = base85.decode(value);
        delete obj.key; // release memory as soon as possible
        break;
      case 'object':
        binaryObj[key] = base85ToBinary(value);
        delete obj.key; // release memory as soon as possible
        break;
      default:
        throw new Error(`unexpected type '${typeof value}'`);
    }
  }
  return binaryObj;
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
