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
  sort?: string;
  desc?: boolean;
  page?: number;
  size?: number;
}

export interface Record extends Resource {
  c: string;
  p: number;
  i?: string[];
  r: string;
  a: string[];
  q?: number;
  f?: string[];
  n?: object;
  s?: RecordSample[];
}

export interface Sample extends Resource {
  person: Person;
  index: number;
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
}

export interface InfoMetadata {
  id: string;
  number?: InfoNumberMetadata;
  type: 'CHARACTER' | 'INTEGER' | 'FLAG' | 'FLOAT' | 'STRING' | 'NESTED';
  description: string;
  source?: string;
  version?: string;
  nested?: InfoMetadata[];
}

export interface InfoNumberMetadata {
  type: 'NUMBER' | 'PER_ALT' | 'PER_ALT_AND_REF' | 'PER_GENOTYPE' | 'OTHER';
  count?: number;
}

export interface Query {
  operator: '==' | '!=' | 'in' | '!in';
  selector: string | string[];
  args: string | number | boolean | string[] | number[];
}

export interface RecordSample {
  gt: Genotype;
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
        const prop = params.sort;
        const desc = !!params.desc;
        resources.sort((a, b) => {
          if (desc) {
            const tmp = a;
            a = b;
            b = tmp;
          }

          const valA = a[prop];
          const valB = b[prop];
          if (valA === undefined) {
            return valB === undefined ? 0 : -1;
          } else if (valB === undefined) {
            return 1;
          } else if (typeof valA === 'number') {
            return valA - valB;
          } else {
            return valA.toUpperCase().localeCompare(valB.toUpperCase());
          }
        });
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
          totalElements: totalElements,
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

function matches(query: Query, resource: Resource): boolean {
  let match;
  switch (query.operator) {
    case '==':
      match = matchesEquals(query, resource);
      break;
    case 'in':
      match = matchesIn(query, resource);
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
  let value: any = resource;
  if (Array.isArray(query.selector)) {
    for (const part of query.selector) {
      value = value[part];
    }
  } else {
    value = resource[query.selector];
  }
  return value === query.args;
}

function matchesIn(query: Query, resource: Resource): boolean {
  let value: any = resource;
  if (Array.isArray(query.selector)) {
    for (const part of query.selector) {
      value = value[part];
    }
  } else {
    value = resource[query.selector];
  }

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
