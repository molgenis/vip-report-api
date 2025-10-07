import initSqlJs, { Database } from "sql.js";
import type { VcfMetadata, VcfRecord } from "@molgenis/vip-report-vcf";
import { mapRows, SqlRow } from "./recordMapper";
import { mapSqlRowsToVcfMetadata } from "./MetadataMapper";
import { SQLBASE64 } from "./base64";

import {
  AppMetadata,
  DecisionTree,
  HtsFileMetadata,
  Json,
  Phenotype,
  Query,
  ReportData,
  Sample,
  SortOrder,
} from "./index";
import { complexQueryToSql, executeSql, getColumnNames, mapField, simpleQueryToSql } from "./sqlHelper";
import { mapSamples, mapSample } from "./sampleMapper";

export type FieldCategories = Map<number, string>;
export type Categories = Map<string, FieldCategories>;
export type TableSize = { size: number; totalSize: number };

export class SqlLoader {
  private reportData: ReportData;
  private db: Database | undefined;
  private meta: VcfMetadata | undefined;
  private categories: Categories | undefined;

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

  getMetadata(): VcfMetadata {
    if (this.meta === undefined) {
      const sql = "SELECT * FROM metadata";
      const rows = executeSql(this.db as Database, sql);
      const headerSql = "SELECT * FROM header";
      const headerLines = executeSql(this.db as Database, headerSql);
      const headers: string[] = [];
      for (const row of headerLines) {
        headers.push(row["line"] as string);
      }
      const samples = this.loadSamples(-1, -1, undefined);
      const sampleNames: string[] = [];
      for (const row of samples) {
        sampleNames.push(row.person.individualId as string);
      }
      this.meta = mapSqlRowsToVcfMetadata(rows, headers, sampleNames);
    }
    return this.meta;
  }

  loadDecisionTree(id: string): DecisionTree {
    const sql = `SELECT tree from decisiontree WHERE id = '${id}'`;
    const rows = executeSql(this.db as Database, sql);
    if (rows.length < 1 || rows[0] === undefined) throw Error("Could not find decision tree with id: " + id);
    return JSON.parse(rows[0]["tree"] as string);
  }

  loadAppMetadata(): AppMetadata {
    const sql = `SELECT * from appMetadata`;
    const rows = executeSql(this.db as Database, sql);
    let args: string | undefined;
    let appName: string | undefined;
    let version: string | undefined;
    let htsFile: HtsFileMetadata | undefined;
    for (const row of rows) {
      switch (row["id"] as string) {
        case "appArguments":
          args = row["value"] as string;
          break;
        case "name":
          appName = row["value"] as string;
          break;
        case "version":
          version = row["value"] as string;
          break;
        case "htsFile":
          htsFile = JSON.parse(row["value"] as string) as HtsFileMetadata;
          break;
        default:
          throw Error("Unknown app metadata key " + row["key"]);
      }
    }
    if (args === undefined || appName === undefined || version === undefined) {
      throw Error("Incomplete AppMetadata in database.");
    }
    return {
      args: args,
      name: appName,
      version: version,
      htsFile: htsFile,
    };
  }

  loadSampleById(id: number): Sample {
    const sql = `SELECT * from sample WHERE id = '${id}'`;
    const rows = executeSql(this.db as Database, sql);
    if (rows.length < 1 || rows[0] === undefined) throw Error("Could not find sample with id: " + id);
    return mapSample(rows[0]);
  }

  loadConfig(): Json {
    const sql = `SELECT * from config`;
    const rows = executeSql(this.db as Database, sql);
    return Object.fromEntries(rows.map((row) => [row.id, JSON.parse(row.value as string)]));
  }

  loadSamples(page: number, size: number, query: Query | undefined): Sample[] {
    const categories = this.getCategories();
    const whereClause = query !== undefined ? `WHERE ${simpleQueryToSql(query, categories)}` : "";
    const selectClause = `SELECT * from sample ${whereClause}`;
    const sql = selectClause + (page !== -1 && size !== -1 ? ` LIMIT ${size} OFFSET ${page * size}` : ``);
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
    const grouped: Record<string, { id: string; label: string }[]> = {};
    rows.forEach((row) => {
      const sampleId = row.sample_id as string;
      if (!grouped[sampleId]) {
        grouped[sampleId] = [];
      }
      if (grouped[row.sample_id as string]) {
        grouped[sampleId].push({ id: row.phenotype_id as string, label: row.phenotype_label as string });
      }
    });

    return Object.entries(grouped).map(([sampleId, features]) => ({
      subject: { id: sampleId },
      phenotypicFeaturesList: features.map((f) => ({
        type: {
          id: f.id,
          label: f.label,
        },
      })),
    }));
  }

  loadVcfRecords(
    page: number,
    size: number,
    sort: SortOrder | SortOrder[] | undefined,
    query: Query | undefined,
    includeFormat: boolean,
  ): VcfRecord[] {
    const meta = this.getMetadata();
    const categories = this.getCategories();
    const nestedTables: string[] = this.getNestedTables(meta);
    const whereClause = query !== undefined ? `WHERE ${complexQueryToSql(query, categories, nestedTables)}` : "";
    const columns = this.getColumns(nestedTables, includeFormat);
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
      ...columns,
    ];
    const { orderByClauses, distinctOrderByClauses, orderCols } = this.getSortClauses(sortOrders, nestedTables);
    let nestedJoins: string = "";
    for (const nestedTable of nestedTables) {
      nestedJoins += ` LEFT JOIN variant_${nestedTable} ${nestedTable} ON ${nestedTable}.variant_id = v.id`;
    }
    const sql = `
          SELECT DISTINCT ${selectCols}
          FROM (SELECT DISTINCT v.*
                FROM (SELECT v.*,
                             v.id AS v_variant_id
                          ${orderCols.length ? "," + orderCols.join(", ") : ""}
                      FROM vcf v
                          LEFT JOIN info n ON n.variant_id = v.id
                          ${includeFormat ? "LEFT JOIN format f ON f.variant_id = v.id" : ""}
                          ${nestedJoins} 
                          ${whereClause}
                      GROUP BY v.id ${distinctOrderByClauses.length ? "ORDER BY " + distinctOrderByClauses.join(", ") : ""}) v
                    LIMIT ${size}
                OFFSET ${page * size}) v
                   LEFT JOIN info n ON n.variant_id = v.id 
                   ${nestedJoins}
            ${includeFormat ? "LEFT JOIN format f ON f.variant_id = v.id" : ""}
            ${whereClause}
            ${orderByClauses.length ? "ORDER BY " + orderByClauses.join(", ") : ""}
      `;
    const rows = executeSql(this.db as Database, sql);
    return mapRows(rows, meta, categories, nestedTables);
  }

  private getSortClauses(sortOrders: SortOrder[], nestedTables: string[]) {
    const orderByClauses: string[] = [];
    const distinctOrderByClauses: string[] = [];
    const orderCols: string[] = [];
    let col;
    for (const order of sortOrders) {
      if (order.property.length == 1) {
        col = mapField(order.property[0] as string);
      } else if (order.property.length == 2) {
        col = `${order.property[0]}.${order.property[1]}`;
      } else if (order.property.length == 3) {
        const key = order.property[1] as string;
        if (!nestedTables.includes(key)) {
          throw Error("Unknown nested field: " + order.property[1]);
        }
        col = `${key}.${order.property[2]}`;
      }
      if (col === undefined) {
        throw Error("Error determining sort column for:" + order);
      }
      const escapedCol = col.replace(".", "_");
      orderByClauses.push(`${col} ${order.compare === "desc" ? "DESC" : "ASC"}`);
      distinctOrderByClauses.push(`${order.compare === "desc" ? `MAX_${escapedCol} DESC` : `MIN_${escapedCol} ASC`}`);
      orderCols.push(
        `${order.compare === "desc" ? `MAX(${col}) as MAX_${escapedCol}` : `MIN(${col}) as MIN_${escapedCol}`}`,
      );
    }
    return { orderByClauses, distinctOrderByClauses, orderCols };
  }

  loadVcfRecordById(id: number): VcfRecord {
    const meta = this.getMetadata();
    const nestedTables: string[] = this.getNestedTables(meta);
    let nestedJoins: string = "";
    for (const nestedTable of nestedTables) {
      nestedJoins += ` LEFT JOIN variant_${nestedTable} ${nestedTable} ON ${nestedTable}.variant_id = v.id`;
    }

    const columns = this.getColumns(nestedTables, true);
    const selectCols = [
      "v.id as v_variant_id",
      "v.chrom",
      "v.pos",
      "v.id_vcf",
      "v.ref",
      "v.alt",
      "v.qual",
      "v.filter",
      ...columns,
    ];
    const sql = `
                  SELECT
                  ${selectCols}
                  FROM
                  (SELECT * FROM vcf) v
                  LEFT JOIN info n ON n.variant_id = v.id 
                  LEFT JOIN format f ON f.variant_id = v.id
                  ${nestedJoins}
                  WHERE v.id = ${id}
                `;

    const rows = executeSql(this.db as Database, sql);
    if (rows.length === 0) {
      throw new Error(`No VCF Record returned for id ${id}`);
    }
    const mapped = mapRows(rows, meta, this.getCategories(), nestedTables);
    if (mapped.length > 1) {
      throw new Error(`More than 1 VCF Record returned for id ${id}`);
    }
    return mapped[0] as VcfRecord;
  }

  getCategories(): Categories {
    if (this.categories === undefined) {
      const sql = "SELECT field, id, value FROM categories";
      const rows: SqlRow[] = executeSql(this.db as Database, sql);

      const result = new Map<string, FieldCategories>();

      for (const row of rows) {
        const field = row.field as string;
        const value = row.value as string;

        let valueMap = result.get(field);
        if (!valueMap) {
          valueMap = new Map<number, string>();
          result.set(field, valueMap);
        }
        valueMap.set(row.id as number, value);
      }
      this.categories = result;
    }
    return this.categories;
  }

  private getColumns(nestedTables: string[], includeFormat: boolean) {
    let columns: string[] = [];
    for (const nestedTable of nestedTables) {
      columns = columns.concat(
        getColumnNames(this.db as Database, `variant_${nestedTable}`).map(
          (col) => `${nestedTable}.${col} AS "${nestedTable}^${col}"`,
        ),
      );
    }
    if (includeFormat) {
      columns = columns.concat(getColumnNames(this.db as Database, "format").map((col) => `f.${col} AS FMT_${col} `));
    }
    columns = columns.concat(getColumnNames(this.db as Database, "info").map((col) => `n.${col} AS INFO_${col} `));
    return columns;
  }

  countMatchingVariants(query: Query | undefined): TableSize {
    const meta = this.getMetadata();
    const nestedTables: string[] = this.getNestedTables(meta);
    const categories = this.getCategories();
    const whereClause = query !== undefined ? `WHERE ${complexQueryToSql(query, categories, nestedTables)}` : "";
    let nestedJoins: string = "";
    for (const nestedTable of nestedTables) {
      nestedJoins += ` LEFT JOIN variant_${nestedTable} ${nestedTable} ON ${nestedTable}.variant_id = v.id`;
    }

    const sql = `
SELECT
COUNT(DISTINCT v.id) AS count, 
v.id as v_variant_id,
(SELECT COUNT(*) FROM vcf) AS total_size
FROM
    (SELECT * FROM vcf) v
        LEFT JOIN info n ON n.variant_id = v.id
    ${nestedJoins}
        LEFT JOIN format f ON f.variant_id = v.id
${whereClause}
`;

    const rows = executeSql(this.db as Database, sql);
    if (!rows || rows.length === 0 || rows[0] === undefined) return { size: 0, totalSize: 0 };
    return { size: (rows[0]["count"] ?? 0) as number, totalSize: (rows[0]["total_size"] ?? 0) as number };
  }

  countMatchingSamples(query: Query | undefined): TableSize {
    const categories = this.getCategories();
    const whereClause = query !== undefined ? `WHERE ${simpleQueryToSql(query, categories)}` : "";
    const sql = `SELECT 
                        (SELECT COUNT(*) FROM sample) AS total_size, 
                        COUNT(DISTINCT id) AS count
                     from sample ${whereClause}`;
    const rows = executeSql(this.db as Database, sql);
    if (!rows || rows.length === 0 || rows[0] === undefined) return { size: 0, totalSize: 0 };
    return { size: (rows[0]["count"] ?? 0) as number, totalSize: (rows[0]["total_size"] ?? 0) as number };
  }

  countMatchingPhenotypes(query: Query | undefined): TableSize {
    const categories = this.getCategories();
    const whereClause = query !== undefined ? `WHERE ${simpleQueryToSql(query, categories)}` : "";
    const sql = `SELECT (SELECT COUNT(*) FROM phenotype) AS total_size,
                            COUNT(DISTINCT p.id) AS count
                                 FROM samplePhenotype sp
                                          JOIN phenotype p ON sp.phenotype_id = p.id
                                          JOIN sample sample ON sp.sample_id = sample.id
                                     ${whereClause}`;
    const rows = executeSql(this.db as Database, sql);
    if (!rows || rows.length === 0 || rows[0] === undefined) return { size: 0, totalSize: 0 };
    return { size: (rows[0]["count"] ?? 0) as number, totalSize: (rows[0]["total_size"] ?? 0) as number };
  }

  private getNestedTables(meta: VcfMetadata): string[] {
    const filtered = Object.entries(meta.info).filter(([, info]) => info.nested != null);
    return filtered.map(([key]) => key);
  }
}
