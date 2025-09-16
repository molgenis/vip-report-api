import initSqlJs, { Database } from "sql.js";
import type { VcfMetadata, VcfRecord } from "@molgenis/vip-report-vcf";
import {mapRows, SqlRow} from "./recordMapper";
import { mapSqlRowsToVcfMetadata } from "./MetadataMapper";
import { SQLBASE64 } from "./base64";

import {
    AppMetadata,
    DecisionTree,
    Json,
    Phenotype,
    Query,
    ReportData,
    Sample,
    SortOrder
} from "./index";
import {
    complexQueryToSql,
    executeSql, getColumnNames,
    simpleQueryToSql,
} from "./sqlHelper";
import {mapSamples, mapSample} from "./sampleMapper";

export type FieldCategories = Map<number, string>
export type Categories = Map<string, FieldCategories>

export class SqlLoader {
  private reportData: ReportData;
  private db: Database | undefined;

  constructor(reportData: ReportData) {
    this.reportData = reportData;
  }

  async init(): Promise<SqlLoader> {
    const bytes = this.base64ToUint8Array();
    const wasmBinary = bytes.slice().buffer as ArrayBuffer;
    const SQL = await initSqlJs({ wasmBinary });
    this.db = new SQL.Database(this.reportData.database);
    return this;
  }

  private base64ToUint8Array(): Uint8Array {
    const binaryString = atob(SQLBASE64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let index = 0; index < len; index++) bytes[index] = binaryString.charCodeAt(index);
    return bytes;
  }

    loadMetadata(): VcfMetadata {
    const sql = "SELECT * FROM metadata";
    const rows = executeSql(this.db as Database, sql);
        const headerSql = "SELECT * FROM header";
        const headerLines = executeSql(this.db as Database, headerSql);
        const headers: string[] = [];
        for (const row of headerLines) {
            headers.push(row["line"] as string);
        }
        const samples = this.loadSamples(0, 10, undefined);//FIXME: hardcoded
        const sampleNames: string[] = [];
        for (const row of samples) {
            sampleNames.push(row.person.individualId as string);
        }
        return mapSqlRowsToVcfMetadata(rows, headers, sampleNames);
    }

    loadDecisionTree(id: string): DecisionTree {
        const sql = `SELECT tree from decisiontree WHERE id = '${id}'`;
        const rows = executeSql(this.db as Database, sql);
        if (rows.length < 1 || rows[0] === undefined) throw Error("Could not find decision tree with id: " + id);
        return JSON.parse(rows[0]["tree"] as string);
    }

    loadAppMetadata(): AppMetadata {
        const sql = `SELECT * from reportMetadata`;
        const rows = executeSql(this.db as Database, sql);
        let args: string | undefined;
        let appName: string | undefined;
        let version: string | undefined;
        for (const row of rows) {
            switch (row["id"] as string) {
                case "appArguments":
                    args = row["value"] as string;
                    break;
                case "name":
                    version = row["value"] as string;
                    break;
                case "version":
                    appName = row["value"] as string;
                    break;
                    throw Error("Unknown app metadata key " + row["key"]);
            }
        }
        if (args === undefined || appName === undefined || version === undefined) {
            throw Error("Incomplete AppMetadata in database.");
        }
        return {
            args: args, name: appName, version: version
        }
    }

    loadSampleById(id: number): Sample {
        const sql = `SELECT * from sample WHERE id = '${id}'`;
        const rows = executeSql(this.db as Database, sql);
        if (rows.length < 1 || rows[0] === undefined) throw Error("Could not find sample with id: " + id);
        return mapSample(rows[0]);
    }

    loadConfig(): Json {
        const sql = `SELECT * from reportdata`;
        const rows = executeSql(this.db as Database, sql);
        return Object.fromEntries(rows.map(row => [row.id, JSON.parse(row.value as string)]));
    }

    loadSamples(
        page: number,
        size: number,
        query: Query | undefined,
    ): Sample[] {
        const categories = this.getCategories();
        const whereClause = query !== undefined ? `WHERE ${simpleQueryToSql(query, categories)}` : "";
        const sql = `SELECT * from sample ${whereClause} LIMIT ${size} OFFSET ${page * size}`;
        const rows = executeSql(this.db as Database, sql);
        return mapSamples(rows);
    }

    loadPhenotypes(page: number, size: number, query: Query | undefined): Phenotype[] {
        const categories = this.getCategories();
        const whereClause = query !== undefined ? `WHERE ${simpleQueryToSql(query, categories)}` : "";

        const sql = `
            SELECT sp.sample_id, p.id AS phenotype_id, p.label AS phenotype_label
            FROM samplePhenotype sp
            JOIN phenotype p ON sp.phenotype_id = p.id
            JOIN sample sample ON sp.sample_id = sample.id
            ${whereClause}
            LIMIT ${size} OFFSET ${page * size}
          `;
        const rows = executeSql(this.db as Database, sql);
        const grouped: Record<string, { id: string, label: string }[]> = {};
        rows.forEach(row => {
            const sampleId = row.sample_id as string;
            if (!grouped[sampleId]) {
                grouped[sampleId] = [];
            }
            if (grouped[row.sample_id as string]) {
                grouped[sampleId].push({id: row.phenotype_id as string, label: row.phenotype_label as string});
            }
        });

        return Object.entries(grouped).map(([sampleId, features]) => ({
            subject: {id: sampleId},
            phenotypicFeaturesList: features.map(f => ({
                type: {
                    id: f.id,
                    label: f.label
                }
            }))
        }));
    }

  loadVcfRecords(
    meta: VcfMetadata,
    page: number,
    size: number,
    sort: SortOrder | SortOrder[] | undefined,
    query: Query | undefined,
  ): VcfRecord[] {
      const categories = this.getCategories();
      const whereClause = query !== undefined ? `WHERE ${complexQueryToSql(query, categories)}` : "";
      const {csqSelect, fmtSelect, infoSelect} = this.getColumns();
    const sortOrders = Array.isArray(sort) ? sort : sort ? [sort] : [];
    const selectCols = [
      "v.id as v_variant_id",
      "v.chrom",
      "v.pos",
      "v.id_vcf",
      "v.ref",
      "v.alt",
      "v.qual",
      "v.filter",
        ...infoSelect,
        ...csqSelect,
        ...fmtSelect
    ];
    const orderByClauses: string[] = [];
      const distinctOrderByClauses: string[] = [];
      const orderCols: string[] = []
      let col;
      for (const order of sortOrders) {
          if (order.property.length == 1) {
              col = `v.${order.property[0]}`
          } else if (order.property.length == 2) {
              col = `${order.property[0]}.${order.property[1]}`
          } else if (order.property.length == 3) {
              if (order.property[1] !== "CSQ") {
                  //FIXME
                  throw Error("Unknown nested field");
              }
              col = `c.${order.property[2]}`
          }
          if (col === undefined) {
              throw Error("Error determining sort column for:" + order);
          }
          const escapedCol = col.replace(".", "_");
          orderByClauses.push(`${col} ${order.compare === "desc" ? "DESC" : "ASC"}`);
          distinctOrderByClauses.push(`${order.compare === "desc" ? `MAX_${escapedCol} DESC` : `MIN_${escapedCol} ASC`}`);
          orderCols.push(`${order.compare === "desc" ? `MAX(${col}) as MAX_${escapedCol}` : `MIN(${col}) as MIN_${escapedCol}`}`);
      }

      //select the variant per page size and then join the rest of the tables
    const sql = `
            SELECT DISTINCT
            ${selectCols}
            FROM (
                SELECT DISTINCT v.*
                FROM (
                  SELECT v.*, v.id AS v_variant_id
                  ${orderCols.length ? ","+orderCols.join(", ") : ""}
                  FROM vcf v
                  JOIN info n ON n.variant_id = v.id
                  JOIN variant_CSQ c ON c.variant_id = v.id
                  JOIN format f ON f.variant_id = v.id
                  ${whereClause}
                  GROUP BY v.id
                  ${distinctOrderByClauses.length ? "ORDER BY " + distinctOrderByClauses.join(", ") : ""}) v
                LIMIT ${size} OFFSET ${page * size} ) v  
            LEFT JOIN info n ON n.variant_id = v.id
            LEFT JOIN variant_CSQ c ON c.variant_id = v.id
            LEFT JOIN format f ON f.variant_id = v.id
            ${whereClause}
            ${orderByClauses.length ? "ORDER BY " + orderByClauses.join(", ") : ""}
            `;
    const rows = executeSql(this.db as Database, sql);
    return mapRows(rows, meta, categories);
  }

  loadVcfRecordById(meta: VcfMetadata, id: number): VcfRecord {
      const {csqSelect, fmtSelect, infoSelect} = this.getColumns();
      const selectCols = [
          "v.id as v_variant_id",
          "v.chrom",
          "v.pos",
          "v.id_vcf",
          "v.ref",
          "v.alt",
          "v.qual",
          "v.filter",
          ...infoSelect,
          ...csqSelect,
          ...fmtSelect
      ];
    const sql = `
                  SELECT
                  ${selectCols}
                  FROM
                  (SELECT * FROM vcf) v
                  LEFT JOIN info n ON n.variant_id = v.id
                  LEFT JOIN variant_CSQ c ON c.variant_id = v.id
                  LEFT JOIN format f ON f.variant_id = v.id
                  WHERE v.id = ${id}
                `;

    const rows = executeSql(this.db as Database, sql);
      return mapRows(rows, meta, this.getCategories())[0] as VcfRecord;//FIXME
  }

    getCategories(): Categories {
        const sql = "SELECT field, id, value FROM categories";
        const rows: SqlRow[] = executeSql(this.db as Database, sql);

        const result = new Map<string, FieldCategories>();

        for (const row of rows) {
            const field = row.field as string;
            const value = row.value as string;

            // Get the sub-map for this field, or create if missing
            let valueMap = result.get(field);
            if (!valueMap) {
                valueMap = new Map<number, string>();
                result.set(field, valueMap);
            }
            valueMap.set(row.id as number, value);
        }

        return result;
    }

    private getColumns() {
        const csqSelect = getColumnNames(this.db as Database, "variant_CSQ")
            .map(col => `c.${col} AS CSQ_${col} `);
        const fmtSelect = getColumnNames(this.db as Database, "format")
            .map(col => `f.${col} AS FMT_${col} `);
        const infoSelect = getColumnNames(this.db as Database, "info")
            .map(col => `n.${col} AS INFO_${col} `);
        return {csqSelect, fmtSelect, infoSelect};
    }

    countMatchingVariants(meta: VcfMetadata, query: Query | undefined): number {
        const categories = this.getCategories();
        const whereClause = query !== undefined ? `WHERE ${complexQueryToSql(query, categories)}` : "";

        const sql = `
SELECT
COUNT(DISTINCT v.id) AS count, v.id as v_variant_id
FROM
    (SELECT * FROM vcf) v
        LEFT JOIN info n ON n.variant_id = v.id
        LEFT JOIN variant_CSQ c ON c.variant_id = v.id
        LEFT JOIN format f ON f.variant_id = v.id
${whereClause}
`;

    const rows = executeSql(this.db as Database, sql);
    if (!rows || rows.length === 0 || rows[0] === undefined) return 0;
        return (rows[0]["count"] ?? 0) as number;
  }
}