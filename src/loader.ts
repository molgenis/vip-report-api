import initSqlJs, { Database } from "sql.js";
import type { VcfMetadata, VcfRecord } from "@molgenis/vip-report-vcf";
import { mapRow, mapRows } from "./recordMapper";
import { mapSqlRowsToVcfMetadata } from "./MetadataMapper";
import { SQLBASE64 } from "./base64";

import { Query, ReportData, SortOrder } from "./index";
import {
  buildJsonPatchSql,
  csqAggregateOrderSql,
  executeSql,
  mapField,
  nestedQueryToSql,
  queryToSql,
  splitCsqQuery,
} from "./sqlHelper";

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
    return mapSqlRowsToVcfMetadata(rows);
  }

  loadVcfRecords(
    meta: VcfMetadata,
    page: number,
    size: number,
    sort: SortOrder | SortOrder[] | undefined,
    query: Query | undefined,
  ): VcfRecord[] {
    const csqJsonCol = "CSQ.csq_json";
    const { rest: mainQuery, csq: csqQuery, fmt: fmtQuery } = splitCsqQuery(query);

    let whereClause = "";
    if (mainQuery) whereClause = `WHERE ${queryToSql(mainQuery)}`;

    let csqSubQueryWhere = "";
    if (csqQuery) csqSubQueryWhere = "WHERE " + nestedQueryToSql(csqQuery, "c");

    let fmtSubQueryWhere = "";
    if (fmtQuery) fmtSubQueryWhere = "WHERE " + nestedQueryToSql(fmtQuery, "f");

    const sortOrders = Array.isArray(sort) ? sort : sort ? [sort] : [];
    const selectCols = [
      "v.id as variant_id",
      "v.chrom",
      "v.pos",
      "v.id_vcf",
      "v.ref",
      "v.alt",
      "v.qual",
      "v.filter",
      "n.*",
      "FMT.fmt_json AS FMT",
      "CSQ.csq_json AS CSQ",
    ];
    const orderByClauses: string[] = [];

    for (const order of sortOrders) {
      if (Array.isArray(order.property) && order.property.length === 3 && order.property[1] === "CSQ") {
        const csqField = order.property[2] as string;
        const direction = order.compare === "asc" ? "min" : "max";
        const csqOrderExpr = csqAggregateOrderSql(csqJsonCol, csqField, direction);
        selectCols.push(`${csqOrderExpr} AS vip_sort_${direction}_${csqField}`);
        orderByClauses.push(`${csqOrderExpr} ${order.compare === "asc" ? "ASC" : "DESC"}`);
      } else {
        let col: string;
        if (Array.isArray(order.property) && order.property.length === 1) {
          col = mapField(order.property[0] as string);
        } else {
          col = `n.${order.property[1]}`;
        }
        orderByClauses.push(`${col} ${order.compare === "desc" ? "DESC" : "ASC"}`);
      }
    }

    // Assume these are implemented in your class!
    const csqJsonPatchSql = buildJsonPatchSql(this.db as Database, "variant_CSQ", "c");
    const formatJsonPatchSql = buildJsonPatchSql(this.db as Database, "format", "f");

    const sql = `
SELECT
  ${selectCols.join(",\n  ")}
FROM vcf v
LEFT JOIN info n ON n.variant_id = v.id
LEFT JOIN (
  SELECT
    f.variant_id,
    json_group_array(
      ${formatJsonPatchSql}
    ) AS fmt_json
  FROM format f
  ${fmtSubQueryWhere}
  GROUP BY f.variant_id
) FMT ON FMT.variant_id = v.id
LEFT JOIN (
  SELECT
    c.variant_id,
    json_group_array(
      ${csqJsonPatchSql}
    ) AS csq_json
  FROM variant_CSQ c
  ${csqSubQueryWhere}
  GROUP BY c.variant_id
) CSQ ON CSQ.variant_id = v.id
${whereClause}
GROUP BY v.id
${orderByClauses.length ? "ORDER BY " + orderByClauses.join(", ") : ""}
LIMIT ${size} OFFSET ${page * size}
`;

    const rows = executeSql(this.db as Database, sql);
    return mapRows(rows, meta);
  }

  loadVcfRecordById(meta: VcfMetadata, id: number): VcfRecord {
    const csqJsonPatchSql = buildJsonPatchSql(this.db as Database, "variant_CSQ", "c");
    const formatJsonPatchSql = buildJsonPatchSql(this.db as Database, "format", "f");

    const sql = `
SELECT
  v.id as variant_id,
  v.chrom, v.pos, v.id_vcf, v.ref, v.alt, v.qual, v.filter,
  n.*,
  FMT.fmt_json AS FMT,
  CSQ.csq_json AS CSQ
FROM vcf v
LEFT JOIN info n ON n.variant_id = v.id
LEFT JOIN (
  SELECT f.variant_id,
    json_group_array(
      ${formatJsonPatchSql}
    ) AS fmt_json
  FROM format f
  GROUP BY f.variant_id
) AS FMT ON FMT.variant_id = v.id
LEFT JOIN (
  SELECT c.variant_id,
    json_group_array(
      ${csqJsonPatchSql}
    ) AS csq_json
  FROM variant_CSQ c
  GROUP BY c.variant_id
) AS CSQ ON CSQ.variant_id = v.id
WHERE v.id = ${id}
GROUP BY v.id
`;

    const rows = executeSql(this.db as Database, sql);
    if (rows.length < 1 || rows[0] === undefined) throw Error("Could not find VcfRecord with id: " + id);
    return mapRow(rows[0], undefined, meta);
  }

  countMatchingVariants(meta: VcfMetadata, query: Query | undefined): number {
    const { rest: mainQuery, csq: csqQuery, fmt: fmtQuery } = splitCsqQuery(query);

    let csqSubQueryWhere = "";
    if (csqQuery) {
      const csqFilter = nestedQueryToSql(csqQuery, "c");
      csqSubQueryWhere = "WHERE " + csqFilter;
    }
    let fmtSubQueryWhere = "";
    if (fmtQuery) {
      const fmtFilter = nestedQueryToSql(fmtQuery, "f");
      fmtSubQueryWhere = "WHERE " + fmtFilter;
    }

    const whereConditions: string[] = [];
    if (mainQuery) whereConditions.push(queryToSql(mainQuery));
    if (csqQuery) whereConditions.push("CSQ.csq_json IS NOT NULL AND CSQ.csq_json != '[]'");
    if (fmtQuery) whereConditions.push("FMT.fmt_json IS NOT NULL AND FMT.fmt_json != '[]'");
    const whereClause = whereConditions.length ? `WHERE ${whereConditions.join(" AND ")}` : "";

    const csqJsonPatchSql = buildJsonPatchSql(this.db as Database, "variant_CSQ", "c");
    const formatJsonPatchSql = buildJsonPatchSql(this.db as Database, "format", "f");

    const sql = `
SELECT COUNT(*)
FROM vcf v
LEFT JOIN info n ON n.variant_id = v.id
LEFT JOIN (
  SELECT f.variant_id,
    json_group_array(
      ${formatJsonPatchSql}
    ) AS fmt_json
  FROM format f
  ${fmtSubQueryWhere}
  GROUP BY f.variant_id
) FMT ON FMT.variant_id = v.id
LEFT JOIN (
  SELECT c.variant_id,
    json_group_array(
      ${csqJsonPatchSql}
    ) AS csq_json
  FROM variant_CSQ c
  ${csqSubQueryWhere}
  GROUP BY c.variant_id
) CSQ ON CSQ.variant_id = v.id
${whereClause}
`;

    const rows = executeSql(this.db as Database, sql);
    if (!rows || rows.length === 0 || rows[0] === undefined) return 0;
    return (rows[0]["COUNT(*)"] ?? rows[0]["count"] ?? 0) as number;
  }
}
