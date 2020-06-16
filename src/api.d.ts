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
    i?: Array<string>;
    r: string;
    a: Array<string>;
    q?: number;
    f?: Array<string>;
    n?: Object;
    s?: Array<RecordSample>;
}
export interface Sample extends Resource {
    person: Person;
    index: number;
}
export interface Items<T extends Resource> {
    items: Array<T>;
    total: number;
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
    info: Array<InfoMetadata>;
}
export interface InfoMetadata {
    id: string;
    number?: InfoNumberMetadata;
    type: 'CHARACTER' | 'INTEGER' | 'FLAG' | 'FLOAT' | 'STRING';
    description: string;
    source?: string;
    version?: string;
}
export interface InfoNumberMetadata {
    type: 'NUMBER' | 'PER_ALT' | 'PER_ALT_AND_REF' | 'PER_GENOTYPE' | 'OTHER';
    count?: number;
}
export interface Query {
    operator: '==' | '!=' | 'in' | '!in';
    selector: string | Array<string>;
    args: string | number | boolean | Array<string> | Array<number>;
}
export interface RecordSample {
    gt: Genotype;
}
export interface Genotype {
    a?: Array<string>;
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
    phenotypicFeaturesList: Array<PhenotypicFeature>;
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
    private reportData;
    constructor(reportData: ApiData);
    getMeta(): Promise<Metadata>;
    get<T extends Resource>(resource: string, params?: Params): Promise<Items<T>>;
    getRecords(params?: Params): Promise<Items<Record>>;
    getSamples(params?: {}): Promise<Items<Sample>>;
    getPhenotypes(params?: {}): Promise<Items<Phenotype>>;
}
