import {Items, Metadata, Params, Phenotype, ReportData, Resource, Record, Sample} from './index'

export = Api

declare class Api {
    constructor(reportData: ReportData)

    getMeta(): Metadata

    getRecords(params?: Params): Promise<Items<Record>>
    getSamples(params?: Params): Promise<Items<Sample>>
    getPhenotypes(params?: Params): Promise<Items<Phenotype>>

    get(resource: string, params?: Params): Promise<Items<Resource>>
}

declare namespace Api {
export interface ReportData {
        metadata: Metadata,
            data: object
    }

export interface Metadata {
        app: AppMetadata
        htsFile: HtsFileMetadata
        records: RecordsMetadata
    }

export interface Resource {

    }

export interface Params {
        query?: Query
        sort?: string
        desc?: boolean
        page?: number
        size?: number
    }

export interface Record extends Resource {
        c: string
        p: number
        i?: Array<string>
            r: string,
            a: Array<string>
        q?: number
        f?: Array<string>
        n?: Object
        s?: Array<RecordSample>
    }

export interface Sample extends Resource {
        person: Person
        index: number
    }

export interface Items<T extends Resource> {
        items: Array<T>
            total: number
}

export interface AppMetadata {
        name: string
        version: string
        args: string
    }

export interface HtsFileMetadata {
        htsFormat: string
        uri: string
        genomeAssembly: string
    }

export interface RecordsMetadata {
        info: Array<InfoMetadata>
    }

export interface InfoMetadata {
        id: string
        number?: InfoNumberMetadata
        type: InfoType
        description: string
        source?: string
        version?: string
    }

export interface InfoNumberMetadata {
        type: NumberType
        count?: number
    }

export enum InfoType {
        CHARACTER = "CHARACTER",
            INTEGER = "INTEGER",
            FLAG = "FLAG",
            FLOAT = "FLOAT",
            STRING = "STRING"
    }

export enum NumberType {
        NUMBER = "NUMBER",
            PER_ALT = "PER_ALT",
            PER_ALT_AND_REF = "PER_ALT_AND_REF",
            PER_GENOTYPE = "PER_GENOTYPE",
            OTHER = "OTHER"
    }

export enum GenotypeType {
        het = 'het',
            hom_a = 'hom_a',
            hom_r = 'hom_r',
            miss = 'miss',
            part = 'part'
    }

export interface Query {
        operator: '==' | '!=' | 'in' | '!in',
            selector: string | Array<string>
        args: string | number | Array<string> | Array<number>
    }

export interface RecordSample {
        gt: Genotype
    }

export interface Genotype {
        a?: Array<string>
            p: boolean,
            t: GenotypeType
    }

export interface Person {
        familyId: string
        individualId: string
        paternalId: string
        maternalId: string
        sex: Sex
        affectedStatus: AffectedStatus
    }

export enum Sex {
        UNKNOWN_SEX = 'UNKNOWN_SEX',
            FEMALE = 'FEMALE',
            MALE = 'MALE',
            OTHER_SEX = 'OTHER_SEX'
    }

export enum AffectedStatus {
        MISSING = 'MISSING',
            UNAFFECTED = 'UNAFFECTED',
            AFFECTED = 'AFFECTED'
    }

export interface Phenotype extends Resource {
        subject: PhenotypeSubject
        phenotypicFeaturesList: Array<PhenotypicFeature>
    }

export interface PhenotypeSubject {
        id: string
    }

export interface OntologyClass {
        id: string,
            label: string
    }

export interface PhenotypicFeature {
        type: OntologyClass
    }
}