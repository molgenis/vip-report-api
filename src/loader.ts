import type {
    VcfMetadata, InfoMetadata,
    VcfRecord,
    Value,
    ValueArray,
    FieldMetadata, Genotype, GenotypeType, GenotypeAllele, RecordSampleType
} from "@molgenis/vip-report-vcf";
import { SQLBASE64 } from "./base64";
import initSqlJs, { Database } from "sql.js";
import {ReportData} from "./index";
import {parseMultiValue, parseSingleValue, parseValue} from "./DataParser";
import {parseIntegerValue} from "./ValueParser";

type Operator = "=" | "!=" | ">" | ">=" | "<" | "<=" | "LIKE" | "IN";
type Leaf = {
    kind: "leaf";
    source: "vcf" | "info" | "nested";
    field: string;
    op: Operator;
    value: unknown;
    nestedKey?: string;
};
type AndGroup = { kind: "and"; children: ConditionTree[] };
type OrGroup = { kind: "or"; children: ConditionTree[] };
type ConditionTree = Leaf | AndGroup | OrGroup;

export class SqlLoader {
    private reportData: ReportData;
    private db: Database | undefined;

    constructor(reportData: ReportData) {
        this.reportData = reportData;
    }

    async init(): Promise<this> {
        const bytes = this.base64ToUint8Array();
        const wasmBinary = bytes.slice().buffer as ArrayBuffer;
        const SQL = await initSqlJs({ wasmBinary });
        this.db = new SQL.Database(this.reportData.database);
        (window as any).sqlite = this.db;
        return this;
    }

    private base64ToUint8Array(): Uint8Array {
        const binaryString = atob(SQLBASE64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
        return bytes;
    }

    private executeSql(sql: string, params: any[] = []): any[] {
        if (this.db === undefined) throw new Error("Database not initialized");
        const stmt = this.db.prepare(sql);
        const rows: any[] = [];
        try {
            stmt.bind(params);
            while (stmt.step()) rows.push(stmt.getAsObject());
        } finally {
            stmt.free();
        }
        return rows;
    }

    parseFormatValue(token: string, formatMetadata: FieldMetadata): RecordSampleType {
        let value: Genotype | Value | ValueArray;
        if (formatMetadata.id === "GT") {
            value = this.parseGenotype(token);
        } else {
            value = this.parseValue(token, formatMetadata);

            if (Array.isArray(value) && value.every((item) => item === null)) {
                value = [];
            }
        }
        return value;
    }

    parseGenotype(token: string): Genotype {
        const alleles = token.split(/[|/]/).map((index) => parseIntegerValue(index));

        const genotype: Genotype = {
            a: alleles,
            t: this.determineGenotypeType(alleles),
        };
        if (alleles.length > 1) {
            genotype.p = token.indexOf("|") !== -1;
        }
        return genotype;
    }

    determineGenotypeType(alleles: GenotypeAllele[]): GenotypeType {
        let type: GenotypeType;
        if (alleles.every((allele) => allele === null)) {
            type = "miss";
        } else if (alleles.some((allele) => allele === null)) {
            type = "part";
        } else if (alleles.every((allele) => allele === 0)) {
            type = "hom_r";
        } else if (alleles.every((allele) => allele === alleles[0])) {
            type = "hom_a";
        } else {
            type = "het";
        }
        return type;
    }

    parseValue(token: string, infoMetadata: InfoMetadata): Value | ValueArray {
        let value: Value | ValueArray;
        const type = infoMetadata.number.type;
        if(token === null){
            return null;
        }
        switch (type) {
            case "NUMBER":
                if (infoMetadata.number.count === 0 || infoMetadata.number.count === 1) {
                    value = parseSingleValue(token.toString(), infoMetadata);//FIXME
                } else {
                    value = parseMultiValue(token.toString(), infoMetadata);//FIXME
                }
                break;
            case "PER_ALT":
            case "PER_ALT_AND_REF":
            case "PER_GENOTYPE":
            case "OTHER":
                value = parseMultiValue(token, infoMetadata);
                break;
            default:
                throw new Error("invalid number type");
        }

        return value;
    }

    countRows(tableName: string, whereClause: string = ""): number {
        if (this.db === undefined) throw new Error("Database not initialized");
        const sql = `SELECT COUNT(*) AS cnt FROM "${tableName}" ${whereClause}`;
        const stmt = this.db.prepare(sql);
        try {
            if (stmt.step()) {
                const row = stmt.getAsObject();
                return row["cnt"] as number;
            }
            return 0;
        } finally {
            stmt.free();
        }
    }
    loadVcfRecordById(meta: VcfMetadata, id: number): VcfRecord{
        console.log("loadVcfRecordById");
        const csqJsonPatchSql = this.buildJsonPatchSql('variant_CSQ');
        const formatJsonPatchSql = this.buildJsonPatchSql('format');
        //FIXME: sort
        const rows = this.executeSql(`SELECT
                              v.id as variant_id, v.chrom, v.pos, v.id_vcf, v.ref, v.alt, v.qual, v.filter,
                              i.*, -- Flat info fields
                              json_group_array(
                                 ${formatJsonPatchSql}
                               ) as FMT,
                              json_group_array(
                                 ${csqJsonPatchSql}
                               ) as CSQ
                            FROM vcf v
                            LEFT JOIN info i ON i.variant_id = v.id
                            LEFT JOIN format format ON format.variant_id = v.id
                            LEFT JOIN variant_CSQ ON variant_CSQ.variant_id = v.id
                            WHERE v.id = ${id}
                            GROUP BY v.id
                          `);
        //FIXME: check rows > 1 or row === undefined
        return this.mapRow(rows[0], undefined, meta);
    }

    loadVcfRecords(meta: VcfMetadata, page :number, size :number): VcfRecord[] {
        console.log("loadVcfRecords");
        const csqJsonPatchSql = this.buildJsonPatchSql('variant_CSQ');
        const formatJsonPatchSql = this.buildJsonPatchSql('format');

        const rows = this.executeSql(`SELECT
                              v.id as variant_id, v.chrom, v.pos, v.id_vcf, v.ref, v.alt, v.qual, v.filter,
                              i.*, -- Flat info fields
                              json_group_array(
                                 ${formatJsonPatchSql}
                               ) as FMT,
                              json_group_array(
                                 ${csqJsonPatchSql}
                               ) as CSQ
                            FROM vcf v
                            LEFT JOIN info i ON i.variant_id = v.id
                            LEFT JOIN format format ON format.variant_id = v.id
                            LEFT JOIN variant_CSQ ON variant_CSQ.variant_id = v.id
                            GROUP BY v.id
                            LIMIT ${size} OFFSET ${page}
                          `);

        return this.mapRows(rows, meta);
    }

    chunkArray<T>(arr: T[], chunkSize: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < arr.length; i += chunkSize) {
            chunks.push(arr.slice(i, i + chunkSize));
        }
        return chunks;
    }

    buildJsonPatchSql(table: string): string | undefined {
        const batchSize = 20; // 20 columns per json_object (40 args)
        const columnChunks = this.chunkArray(this.getColumnNames(table), batchSize);

        const jsonObjects = columnChunks.map(chunk =>
            `json_object(${chunk.map(col => `'${col}', ${table}.${col}`).join(', ')})`
        );
        // Combine with json_patch
        return jsonObjects.length > 1
            ? jsonObjects.reduce((acc, obj) => acc ? `json_patch(${acc}, ${obj})` : obj, '')
            : jsonObjects[0];
    }

    getColumnNames(table: string): any[] {
        const rows = this.executeSql(`PRAGMA table_info(${table});`);
        const columns = rows.map(row => row.name).filter(name => name !== "id" && name !== "variant_id" &&  name !== "sample_id");
        return columns;
    }

    mapRows(rows: any[], meta: VcfMetadata) {
        const variantsById = new Map<number, VcfRecord>();
        //FIXME grouped by, so never more than one row
        for (const row of rows) {
            const id = Number(row.variant_id);
            const variantRecord = variantsById.get(id)
            variantsById.set(id, this.mapRow(row, variantRecord, meta));

        }

        return Array.from(variantsById.values());
    }

    private mapRow(row: any, record: VcfRecord | undefined, meta: VcfMetadata): VcfRecord {
        if (!record) {
            record = {
                c: String(row.chrom),
                p: Number(row.pos),
                i: JSON.parse(row.id_vcf),
                r: String(row.ref),
                a: JSON.parse(row.alt),
                q: row.qual == null ? null : Number(row.qual),
                f: JSON.parse(row.filter),
                n: {},            // InfoContainer, filled below
                s: []             // Samples (RecordSample[])
            };

            const noneInfoCols: string[] = ["chrom","pos","ref","alt","qual","filter", "id_vcf", "FMT", "CSQ", "variant_id", "id"];
            for (const [key, value] of Object.entries(row)) {
                if (!noneInfoCols.includes(key)) {
                    if(meta.info[key] === undefined){
                        throw new Error("Unknown info field: " + key);
                    }
                    record.n[key] = parseValue(value as string, meta.info[key]);
                }
            }
        }
        this.mapSampleFields(row, record, meta);
        this.mapCsqFields(row, meta, record);
        return record;
    }

    private mapCsqFields(row: any, meta: VcfMetadata, vrec: VcfRecord) {
        if (row.CSQ) {
            const csqMeta = meta.info["CSQ"] as InfoMetadata;
            const nestedMetas = csqMeta.nested?.items as FieldMetadata[];
            const nestedMetaMap = new Map<string, FieldMetadata>();
            for (const nestedMeta of nestedMetas) {
                nestedMetaMap.set(nestedMeta.id, nestedMeta);
            }

            if (!vrec.n.CSQ) vrec.n.CSQ = [];
            for (const [key, value] of Object.entries(row)) {
                if (key === "CSQ") {
                    vrec.n.CSQ = this.parseNestedValues(value as string, nestedMetaMap);
                }
            }
        }
    }

    private mapSampleFields(row: any, vrec: VcfRecord, meta: VcfMetadata) {
        if (row.FMT) {
            const nestedMetaMap = new Map<string, FieldMetadata>(Object.entries(meta.format));

            if (!vrec.n.CSQ) vrec.n.FMT = [];
            for (const [key, value] of Object.entries(row)) {
                if (key === "FMT") {
                    vrec.s = this.parseFormatValues(value as string, nestedMetaMap);
                }
            }
        }
    }

    loadMetadata(): VcfMetadata {
        const sampleRows = this.executeSql("SELECT id FROM sample");
        const samples: string[] = sampleRows.map((r: any) => String(r.id));
        return { lines: [], info: {}, format: {}, samples };
    }

    parseNestedValues(value: string, nestedMetaMap: Map<string, FieldMetadata>) {
        const csqArray: any[] = JSON.parse(value);

        const mappedArray = csqArray.map(csqObj => {
            const mapped: any = {};
            Object.keys(csqObj).forEach(key => {
                if(!nestedMetaMap.has(key)) { throw new Error("Unknown nested field: " + key)}
                if(csqObj[key] !== null) {
                    mapped[key] = parseValue(csqObj[key].toString(), nestedMetaMap.get(key) as InfoMetadata);//FIXME: toString
                }
            });
            return mapped;
        });

        return mappedArray;
    }

    parseFormatValues(value: string, nestedMetaMap: Map<string, FieldMetadata>) {
        const csqArray: any[] = JSON.parse(value);

        const mappedArray = csqArray.map(csqObj => {
            const mapped: any = {};
            Object.keys(csqObj).forEach(key => {
                if(!nestedMetaMap.has(key)) { throw new Error("Unknown nested field: " + key)}
                if(csqObj[key] !== null) {
                    mapped[key] = this.parseFormatValue(csqObj[key].toString(), nestedMetaMap.get(key) as InfoMetadata);//FIXME: toString
                }
            });
            return mapped;
        });

        return mappedArray;
    }


}
