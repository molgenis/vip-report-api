import type { VcfMetadata, VcfRecord } from "@molgenis/vip-report-vcf";
import { mapRows } from "./recordMapper";
import { mapSqlRowsToVcfMetadata } from "./MetadataMapper";

import { AppMetadata, DecisionTree, HtsFileMetadata, Json, Query, Sample, SortOrder } from "./index";
import {
  complexQueryToSql,
  executeSql,
  getColumns,
  getNestedJoins,
  getNestedTables,
  getPagingQuery,
  getSortClauses,
  simpleQueryToSql,
  toSqlList,
} from "./sqlUtils";
import { mapSamples, mapSample } from "./sampleMapper";
import {
  Categories,
  DatabaseRecord,
  DatabaseResource,
  DatabaseSample,
  FieldCategories,
  SqlRow,
  TableSize,
} from "./sql";
import { Database } from "sql.js";

export class SqlLoader {
  private db: Database | undefined;
  private meta: VcfMetadata | undefined;
  private categories: Categories | undefined;

  async init(db: Promise<Database>): Promise<SqlLoader> {
    this.db = await db;
    return this;
  }

  getMetadata(): VcfMetadata {
    if (this.meta === undefined) {
      const sql = "SELECT * FROM metadata";
      const rows = executeSql(this.db, sql, {});
      const headerSql = "SELECT * FROM header";
      const headerLines = executeSql(this.db, headerSql, {});
      const headers: string[] = [];
      for (const row of headerLines) {
        headers.push(row["line"] as string);
      }
      const samples = this.loadSamples(-1, -1, undefined);
      const sampleNames: string[] = [];
      for (const row of samples) {
        sampleNames.push(row.data.person.individualId);
      }
      this.meta = mapSqlRowsToVcfMetadata(rows, headers, sampleNames);
    }
    return this.meta;
  }

  loadDecisionTree(id: string): DecisionTree {
    const sql = "SELECT tree from decisiontree WHERE id = :id";
    const rows = executeSql(this.db, sql, { ":id": id });
    if (rows.length < 1 || rows[0] === undefined) throw new Error("Could not find decision tree with id: " + id);
    return JSON.parse(rows[0]["tree"] as string);
  }

  loadAppMetadata(): AppMetadata {
    const sql = `SELECT * from appMetadata`;
    const rows = executeSql(this.db, sql, {});
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
          throw new Error("Unknown app metadata key " + row["key"]);
      }
    }
    if (args === undefined || appName === undefined || version === undefined) {
      throw new Error("Incomplete AppMetadata in database.");
    }
    return {
      args: args,
      name: appName,
      version: version,
      htsFile: htsFile,
    };
  }

  loadSampleById(id: number): Sample {
    const sql = "SELECT * from sample WHERE id = :id";
    const rows = executeSql(this.db, sql, { ":id": id });
    if (rows.length < 1 || rows[0] === undefined) throw new Error("Could not find sample with id: " + id);
    return mapSample(rows[0]).data;
  }

  loadConfig(): Json {
    const sql = `SELECT * from config`;
    const rows = executeSql(this.db, sql, {});
    return Object.fromEntries(rows.map((row) => [row.id, JSON.parse(row.value as string)]));
  }

  loadSamples(page: number, size: number, query: Query | undefined): DatabaseSample[] {
    const categories = this.getCategories();
    const { partialStatement, values } =
      query !== undefined ? simpleQueryToSql(query, categories, {}) : { partialStatement: "", values: {} };
    const whereClause = query !== undefined ? `WHERE ${partialStatement}` : "";
    const selectClause = `SELECT * from sample ${whereClause}`;
    const sql = selectClause + (page !== -1 && size !== -1 ? ` LIMIT ${size} OFFSET ${page * size}` : ``);
    const rows = executeSql(this.db, sql, values);
    return mapSamples(rows);
  }

  loadPhenotypes(page: number, size: number, query: Query | undefined): DatabaseResource[] {
    const categories = this.getCategories();
    const { partialStatement, values } =
      query !== undefined ? simpleQueryToSql(query, categories, {}) : { partialStatement: "", values: {} };
    const whereClause = query !== undefined ? `WHERE ${partialStatement}` : "";

    const sql = `
            SELECT sp.sample_id, p.id AS phenotype_id, p.label AS phenotype_label
            FROM samplePhenotype sp
            JOIN phenotype p ON sp.phenotype_id = p.id
            JOIN sample sample ON sp.sample_id = sample.id
            ${whereClause}
            LIMIT ${size} OFFSET ${page * size}
          `;
    const rows = executeSql(this.db, sql, values);
    const grouped: Record<string, { id: string; label: string }[]> = {};
    for (const row of rows) {
      const sampleId = row.sample_id as string;
      grouped[sampleId] ??= [];
      if (grouped[row.sample_id as string]) {
        grouped[sampleId].push({ id: row.phenotype_id as string, label: row.phenotype_label as string });
      }
    }

    return Object.entries(grouped).map(([sampleId, features]) => ({
      id: -1,
      data: {
        subject: { id: sampleId },
        phenotypicFeaturesList: features.map((f) => ({
          type: {
            id: f.id,
            label: f.label,
          },
        })),
      },
    }));
  }

  loadVcfRecords(
    page: number,
    size: number,
    sort: SortOrder | SortOrder[] | undefined,
    query: Query | undefined,
    sampleIds: number[] | undefined,
  ): DatabaseRecord[] {
    const meta = this.getMetadata();
    const categories = this.getCategories();
    const nestedTables: string[] = getNestedTables(meta);
    const { partialStatement, values } =
      query !== undefined
        ? complexQueryToSql(query, categories, nestedTables, meta)
        : { partialStatement: "", values: {} };
    const whereClause = query !== undefined ? `WHERE ${partialStatement}` : "";
    const sampleJoinQuery =
      sampleIds !== undefined && sampleIds.length > 0 ? `WHERE sample_id in (${toSqlList(sampleIds)})` : "";
    const columns = getColumns(this.db as Database, nestedTables, sampleIds !== undefined);
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
    const { orderByClauses, distinctOrderByClauses, orderCols } = getSortClauses(sortOrders, nestedTables);
    const nestedJoins = getNestedJoins(nestedTables);

    const sql = `
      SELECT DISTINCT ${selectCols}
        FROM (${getPagingQuery(orderCols, sampleIds !== undefined, sampleJoinQuery, nestedJoins, whereClause, distinctOrderByClauses, size, page)}) v
        LEFT JOIN info n ON n.variant_id = v.id
        ${nestedJoins} 
        ${sampleIds !== undefined ? `LEFT JOIN (SELECT * FROM format ${sampleJoinQuery}) f ON f.variant_id = v.id` : ""}
        ${whereClause}
        ${orderByClauses.length ? "ORDER BY " + orderByClauses.join(", ") : ""}
    `;
    const rows = executeSql(this.db, sql, values);
    return mapRows(rows, meta, categories, nestedTables);
  }

  countMatchingVariants(query: Query | undefined): TableSize {
    const meta = this.getMetadata();
    const categories = this.getCategories();
    const nestedTables: string[] = getNestedTables(meta);
    const { partialStatement, values } =
      query !== undefined
        ? complexQueryToSql(query, categories, nestedTables, meta)
        : { partialStatement: "", values: {} };
    const whereClause = query !== undefined ? `WHERE ${partialStatement}` : "";
    const nestedJoins = getNestedJoins(nestedTables);

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

    const rows = executeSql(this.db, sql, values);
    if (!rows || rows.length === 0 || rows[0] === undefined) return { size: 0, totalSize: 0 };
    return { size: (rows[0]["count"] ?? 0) as number, totalSize: (rows[0]["total_size"] ?? 0) as number };
  }

  loadVcfRecordById(id: number, sampleIds: number[] | undefined): VcfRecord {
    const meta = this.getMetadata();
    const nestedTables: string[] = getNestedTables(meta);
    let nestedJoins: string = "";
    for (const nestedTable of nestedTables) {
      nestedJoins += ` LEFT JOIN variant_${nestedTable} ${nestedTable} ON ${nestedTable}.variant_id = v.id`;
    }

    const sampleJoinQuery =
      sampleIds !== undefined && sampleIds.length > 0 ? `WHERE sample_id in (${toSqlList(sampleIds)})` : "";
    const columns = getColumns(this.db, nestedTables, sampleIds !== undefined);

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
                    ${sampleIds !== undefined ? `LEFT JOIN (SELECT * FROM format ${sampleJoinQuery}) f ON f.variant_id = v.id` : ""}
                  ${nestedJoins}
                  WHERE v.id = :id
                `;

    const rows = executeSql(this.db, sql, { ":id": id });
    if (rows.length === 0) {
      throw new Error(`No VCF Record returned for id ${id}`);
    }
    const mapped = mapRows(rows, meta, this.getCategories(), nestedTables);
    if (mapped.length > 1) {
      throw new Error(`More than 1 VCF Record returned for id ${id}`);
    }
    return mapped[0]!.data;
  }

  getCategories(): Categories {
    if (this.categories === undefined) {
      const sql = "SELECT field, id, value FROM categories";
      const rows: SqlRow[] = executeSql(this.db, sql, {});
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

  countMatchingSamples(query: Query | undefined): TableSize {
    const categories = this.getCategories();
    const { partialStatement, values } =
      query !== undefined ? simpleQueryToSql(query, categories, {}) : { partialStatement: "", values: {} };
    const whereClause = query !== undefined ? `WHERE ${partialStatement}` : "";
    const sql = `SELECT 
                        (SELECT COUNT(*) FROM sample) AS total_size, 
                        COUNT(DISTINCT id) AS count
                     from sample ${whereClause}`;
    const rows = executeSql(this.db, sql, values);
    if (!rows || rows.length === 0 || rows[0] === undefined) return { size: 0, totalSize: 0 };
    return { size: (rows[0]["count"] ?? 0) as number, totalSize: (rows[0]["total_size"] ?? 0) as number };
  }

  countMatchingPhenotypes(query: Query | undefined): TableSize {
    const categories = this.getCategories();
    const { partialStatement, values } =
      query !== undefined ? simpleQueryToSql(query, categories, {}) : { partialStatement: "", values: {} };
    const whereClause = query !== undefined ? `WHERE ${partialStatement}` : "";
    const sql = `SELECT (SELECT COUNT(*) FROM phenotype) AS total_size,
                            COUNT(DISTINCT p.id) AS count
                                 FROM samplePhenotype sp
                                          JOIN phenotype p ON sp.phenotype_id = p.id
                                          JOIN sample sample ON sp.sample_id = sample.id
                                     ${whereClause}`;
    const rows = executeSql(this.db, sql, values);
    if (!rows || rows.length === 0 || rows[0] === undefined) return { size: 0, totalSize: 0 };
    return { size: (rows[0]["count"] ?? 0) as number, totalSize: (rows[0]["total_size"] ?? 0) as number };
  }
}
