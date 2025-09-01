import type {
  VcfMetadata,
  InfoMetadata,
  VcfRecord,
  Value,
  ValueArray,
  FieldMetadata,
  Genotype,
  GenotypeType,
  GenotypeAllele,
  RecordSampleType,
} from "@molgenis/vip-report-vcf";
import { SQLBASE64 } from "./base64";
import initSqlJs, { Database } from "sql.js";
import { Query, QueryClause, ReportData, SelectorPart, SortOrder } from "./index";
import { parseMultiValue, parseSingleValue, parseValue } from "./DataParser";
import { parseIntegerValue } from "./ValueParser";

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
type SqlRow = {
  [column: string]: string | number | boolean | null | undefined;
};
type CsqObject = Record<string, Value>;
type CsqArray = CsqObject[];

function sqlEscape(val: unknown): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "number") return String(val);
  if (typeof val === "boolean") return val ? "1" : "0";
  return "'" + String(val).replace(/'/g, "''") + "'";
}

function toSqlList(
  arg: string | number | boolean | string[] | (string | null)[] | number[] | (number | null)[] | null | undefined,
): string {
  return Array.isArray(arg) ? arg.map(sqlEscape).join(", ") : sqlEscape(arg);
}

function splitCsqQuery(query: Query | undefined): {
  rest: Query | undefined;
  csq: Query | undefined;
  fmt: Query | undefined;
} {
  if (!query) return { rest: undefined, csq: undefined, fmt: undefined };
  if ("args" in query && Array.isArray(query.args) && (query.operator === "and" || query.operator === "or")) {
    const rest: Query[] = [],
      csq: Query[] = [],
      fmt: Query[] = [];
    for (const arg of query.args) {
      const splitResult = splitCsqQuery(arg);
      if (splitResult.rest) rest.push(splitResult.rest);
      if (splitResult.csq) csq.push(splitResult.csq);
      if (splitResult.fmt) fmt.push(splitResult.fmt);
    }
    return {
      rest: rest.length ? { operator: query.operator, args: rest } : undefined,
      csq: csq.length ? { operator: query.operator, args: csq } : undefined,
      fmt: fmt.length ? { operator: query.operator, args: fmt } : undefined,
    };
  } else {
    const clause = query as QueryClause;
    if (Array.isArray(clause.selector) && clause.selector.length > 2) {
      if (clause.selector[1] === "CSQ") {
        return { rest: undefined, csq: clause, fmt: undefined };
      } else if (clause.selector[0] === "s") {
        return { rest: undefined, csq: undefined, fmt: clause };
      }
    }
    return { rest: clause, csq: undefined, fmt: undefined };
  }
}

function mapField(part: SelectorPart) {
  switch (part.toString()) {
    case "c":
      return `v.chrom`;
    case "p":
      return `v.pos`;
    case "i":
      return `v.id_vcf`;
    case "r":
      return `v.ref`;
    case "a":
      return `v.alt`;
    case "q":
      return `v.qual`;
    case "f":
      return `v.filter`;
    default:
      throw new Error(`Unsupported op for none nested column: ${part.toString()}`);
  }
}

function mapOperatorToSql(clause: QueryClause, sqlCol: string) {
  switch (clause.operator) {
    case "in":
      return `${sqlCol} IN (${toSqlList(clause.args)})`;
    case "!in":
      return `${sqlCol} NOT IN (${toSqlList(clause.args)})`;
    case "==":
      return `${sqlCol} = ${sqlEscape(clause.args)}`;
    case "!=":
      return `${sqlCol} != ${sqlEscape(clause.args)}`;
    case ">":
      return `${sqlCol} > ${sqlEscape(clause.args)}`;
    case ">=":
      return `${sqlCol} >= ${sqlEscape(clause.args)}`;
    case "<":
      return `${sqlCol} < ${sqlEscape(clause.args)}`;
    case "<=":
      return `${sqlCol} <= ${sqlEscape(clause.args)}`;
    default:
      throw new Error(`Unsupported op for none nested column: ${clause.operator}`);
  }
}

function queryToSql(query: Query): string {
  if ("args" in query && Array.isArray(query.args) && (query.operator === "and" || query.operator === "or")) {
    const joinword = query.operator.toUpperCase();
    return "(" + query.args.map(queryToSql).join(` ${joinword} `) + ")";
  }
  const clause = query as QueryClause;
  let parts: SelectorPart[];
  if (Array.isArray(clause.selector)) {
    parts = (clause.selector as SelectorPart[]).slice();
  } else {
    parts = [clause.selector];
  }

  if (parts.length === 1) {
    const sqlCol = mapField(parts[0] as SelectorPart);
    return mapOperatorToSql(clause, sqlCol);
  }

  if (parts.length === 2) {
    const prefix = parts[0];
    const field = parts[1];
    const sqlCol = `${prefix}.${field}`;
    return mapOperatorToSql(clause, sqlCol);
  }

  if (parts.length > 2) {
    const arrayTable = parts[1] === "CSQ" ? "variant_CSQ" : "format"; //FIXME: dynamic
    const fieldInJson = parts[2];

    function existsClause(where: string) {
      return `EXISTS (
        SELECT 1 FROM ${arrayTable} c
        WHERE c.variant_id = v.id
        AND (
          c.${fieldInJson} IS NULL
          OR json_array_length(c.${fieldInJson}) IS NULL
          OR json_array_length(c.${fieldInJson}) = 0
          OR ${where}
        )
      )`;
    }

    switch (clause.operator) {
      case "in":
      case "has_any":
        return existsClause(`
          EXISTS (
            SELECT 1 FROM json_each(c.${fieldInJson})
            WHERE json_each.value IN (${toSqlList(clause.args)})
          )
        `);
      case "!in":
      case "!has_any":
        // No element matches
        return existsClause(`
          NOT EXISTS (
            SELECT 1 FROM json_each(c.${fieldInJson})
            WHERE json_each.value IN (${toSqlList(clause.args)})
          )
        `);
      case "any_has_any":
        return existsClause(`
          EXISTS (
            SELECT 1 FROM json_each(c.${fieldInJson})
            WHERE json_each.value IN (${toSqlList(clause.args)})
          )
        `);
      case "!any_has_any":
        return existsClause(`
          NOT EXISTS (
            SELECT 1 FROM json_each(json_each.value)
            WHERE json_each.value IN (${toSqlList(clause.args)})
          )
        `);
      case "==":
        return existsClause(`
          EXISTS (
            SELECT 1 FROM json_each(c.${fieldInJson})
            WHERE json_each.value = ${sqlEscape(clause.args)}
          )
        `);
      case "!=":
        return existsClause(`
          NOT EXISTS (
            SELECT 1 FROM json_each(c.${fieldInJson})
            WHERE json_each.value = ${sqlEscape(clause.args)}
          )
        `);
      case ">":
      case ">=":
      case "<":
      case "<=":
        return existsClause(`
          EXISTS (
            SELECT 1 FROM json_each(c.${fieldInJson})
            WHERE json_each.value ${clause.operator} ${sqlEscape(clause.args)}
          )
        `);
      default:
        throw new Error(`Unsupported operator for nested: ${clause.operator}`);
    }
  }

  throw new Error("Unsupported clause: " + JSON.stringify(query));
}

function nestedQueryToSql(query: Query, prefix: string): string {
  if ("args" in query && Array.isArray(query.args) && (query.operator === "and" || query.operator === "or")) {
    const joinword = query.operator.toUpperCase();
    return "(" + query.args.map((arg) => nestedQueryToSql(arg, prefix)).join(` ${joinword} `) + ")";
  }
  const clause = query as QueryClause;
  let parts: SelectorPart[];
  if (Array.isArray(clause.selector)) {
    parts = (clause.selector as SelectorPart[]).slice();
  } else {
    parts = [clause.selector];
  }
  const field = parts[parts.length - 1];
  const sqlCol = `${prefix}.${field}`;
  switch (clause.operator) {
    case "in":
      return `${sqlCol} IN (${toSqlList(clause.args)})`;
    case "!in":
      return `${sqlCol} NOT IN (${toSqlList(clause.args)})`;
    case "has_any":
    case "any_has_any":
      return `EXISTS (
                SELECT 1 FROM json_each(${sqlCol})
                WHERE json_each.value IN (${toSqlList(clause.args)})
              )`;
    case "!has_any":
    case "!any_has_any":
      return `EXISTS (
                SELECT 1 FROM json_each(${sqlCol})
                WHERE json_each.value NOT IN (${toSqlList(clause.args)})
              )`;
    case "==":
      return `${sqlCol} = ${sqlEscape(clause.args)}`;
    case "!=":
      return `${sqlCol} != ${sqlEscape(clause.args)}`;
    case ">":
      return `${sqlCol} > ${sqlEscape(clause.args)}`;
    case ">=":
      return `${sqlCol} >= ${sqlEscape(clause.args)}`;
    case "<":
      return `${sqlCol} < ${sqlEscape(clause.args)}`;
    case "<=":
      return `${sqlCol} <= ${sqlEscape(clause.args)}`;
    //FIXME: operators
    default:
      throw new Error(`Unsupported op for nested subquery: ${clause.operator}`);
  }
}

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
    return this;
  }

  private base64ToUint8Array(): Uint8Array {
    const binaryString = atob(SQLBASE64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let index = 0; index < len; index++) bytes[index] = binaryString.charCodeAt(index);
    return bytes;
  }

  private executeSql(sql: string): SqlRow[] {
    if (this.db === undefined) throw new Error("Database not initialized");
    const stmt = this.db.prepare(sql);
    const rows: SqlRow[] = [];
    try {
      while (stmt.step()) rows.push(stmt.getAsObject() as SqlRow);
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
    if (token === null) {
      return null;
    }
    switch (type) {
      case "NUMBER":
        if (infoMetadata.number.count === 0 || infoMetadata.number.count === 1) {
          value = parseSingleValue(token.toString(), infoMetadata); //FIXME
        } else {
          value = parseMultiValue(token.toString(), infoMetadata); //FIXME
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

  loadVcfRecordById(meta: VcfMetadata, id: number): VcfRecord {
    console.log("loadVcfRecordById");
    const csqJsonPatchSql = this.buildJsonPatchSql("variant_CSQ", "c");
    const formatJsonPatchSql = this.buildJsonPatchSql("format", "f");

    const sql = `
    SELECT
      v.id as variant_id,
      v.chrom, v.pos, v.id_vcf, v.ref, v.alt, v.qual, v.filter,
      i.*,
      FMT.fmt_json AS FMT,
      CSQ.csq_json AS CSQ
    FROM vcf v
      LEFT JOIN info i ON i.variant_id = v.id

      -- Pre-aggregate format rows per variant
      LEFT JOIN (
        SELECT f.variant_id,
            json_group_array(
              ${formatJsonPatchSql}
            ) AS fmt_json
        FROM format f
        GROUP BY f.id
      ) AS FMT ON FMT.variant_id = v.id

      -- Pre-aggregate CSQ rows per variant
      LEFT JOIN (
        SELECT c.variant_id,
            json_group_array(
              ${csqJsonPatchSql}
            ) AS csq_json
        FROM variant_CSQ c
        GROUP BY c.id
      ) AS CSQ ON CSQ.variant_id = v.id
       WHERE v.id = ${id}
          GROUP BY v.id`;
    const rows = this.executeSql(sql);
    if (rows.length < 1 || rows[0] === undefined) {
      throw Error("Could not find VcfRecord wiht id: " + id);
    }
    return this.mapRow(rows[0], undefined, meta);
  }

  loadVcfRecords(
    meta: VcfMetadata,
    page: number,
    size: number,
    sort: SortOrder | SortOrder[] | undefined,
    query: Query | undefined,
  ): VcfRecord[] {
    console.log("loadVcfRecords");
    const csqJsonPatchSql = this.buildJsonPatchSql("variant_CSQ", "c");
    const formatJsonPatchSql = this.buildJsonPatchSql("format", "f");

    const { rest: mainQuery, csq: csqQuery, fmt: fmtQuery } = splitCsqQuery(query);

    let whereClause = "";
    if (mainQuery) {
      const whereSql = queryToSql(mainQuery);
      whereClause = `WHERE ${whereSql}`;
    }

    let csqSubQueryWhere = "";
    if (csqQuery) {
      const csqFilter = nestedQueryToSql(csqQuery, "c");
      csqSubQueryWhere = "WHERE " + csqFilter;
    }

    if (csqSubQueryWhere !== "") {
      if (whereClause !== "") {
        whereClause = whereClause + "AND";
      } else {
        whereClause = whereClause + "WHERE";
      }
      whereClause = whereClause + " (CSQ.csq_json IS NOT NULL AND CSQ.csq_json != '[]')";
    }

    let fmtSubQueryWhere = "";
    if (fmtQuery) {
      const fmtFilter = nestedQueryToSql(fmtQuery, "f");
      fmtSubQueryWhere = "WHERE " + fmtFilter;
    }

    if (fmtSubQueryWhere !== "") {
      if (whereClause !== "") {
        whereClause = whereClause + "AND";
      } else {
        whereClause = whereClause + "WHERE";
      }
      whereClause = whereClause + " (FMT.fmt_json IS NOT NULL AND FMT.fmt_json != '[]')";
    }

    const sql = `
              SELECT
                v.id as variant_id,
                v.chrom, v.pos, v.id_vcf, v.ref, v.alt, v.qual, v.filter,
                i.*,
                FMT.fmt_json AS FMT,
                CSQ.csq_json AS CSQ
              FROM vcf v
                LEFT JOIN info i ON i.variant_id = v.id
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
              LIMIT ${size} OFFSET ${page * size}
            `;

    const rows = this.executeSql(sql);
    return this.mapRows(rows, meta);
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
    if (mainQuery) {
      whereConditions.push(queryToSql(mainQuery));
    }
    if (csqQuery) {
      // Only count variants with at least one matching CSQ (not null and not empty)
      whereConditions.push("CSQ.csq_json IS NOT NULL AND CSQ.csq_json != '[]'");
    }
    if (fmtQuery) {
      // Only count variants with at least one matching CSQ (not null and not empty)
      whereConditions.push("FMT.fmt_json IS NOT NULL AND FMT.fmt_json != '[]'");
    }

    const whereClause = whereConditions.length ? `WHERE ${whereConditions.join(" AND ")}` : "";

    const sql = `
    SELECT COUNT(*)
    FROM vcf v
    LEFT JOIN info i ON i.variant_id = v.id
    LEFT JOIN (
      SELECT
        f.variant_id,
        json_group_array(
          ${this.buildJsonPatchSql("format", "f")}
        ) AS fmt_json
      FROM format f
      ${fmtSubQueryWhere}
      GROUP BY f.variant_id
    ) FMT ON FMT.variant_id = v.id
    LEFT JOIN (
      SELECT c.variant_id,
        json_group_array(
          ${this.buildJsonPatchSql("variant_CSQ", "c")}
        ) AS csq_json
      FROM variant_CSQ c
      ${csqSubQueryWhere}
      GROUP BY c.variant_id
    ) CSQ ON CSQ.variant_id = v.id
    ${whereClause}
  `;

    const rows = this.executeSql(sql);
    // Will return [{ "COUNT(*)": number }]
    if (rows.length !== 1 || rows[0] === undefined) {
      throw new Error("Unable to count rows for query: " + query);
    }
    return rows[0] && ((rows[0]["COUNT(*)"] ?? rows[0]["count"] ?? 0) as number);
  }

  chunkArray<T>(arr: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let index = 0; index < arr.length; index += chunkSize) {
      chunks.push(arr.slice(index, index + chunkSize));
    }
    return chunks;
  }

  buildJsonPatchSql(table: string, handle: string): string | undefined {
    const batchSize = 20; // 20 columns per json_object (40 args)
    const columnChunks = this.chunkArray(this.getColumnNames(table), batchSize);

    const jsonObjects = columnChunks.map(
      (chunk) => `json_object(${chunk.map((col) => `'${col}', ${handle}.${col}`).join(", ")})`,
    );
    return jsonObjects.length > 1
      ? jsonObjects.reduce((acc, obj) => (acc ? `json_patch(${acc}, ${obj})` : obj), "")
      : jsonObjects[0];
  }

  getColumnNames(table: string): string[] {
    const rows = this.executeSql(`PRAGMA table_info(${table});`);
    return rows
      .map((row) => row.name as string)
      .filter((name) => name !== "id" && name !== "variant_id" && name !== "sample_id");
  }

  mapRows(rows: SqlRow[], meta: VcfMetadata) {
    const variantsById = new Map<number, VcfRecord>();
    //FIXME grouped by, so never more than one row
    for (const row of rows) {
      const id = Number(row.variant_id);
      const variantRecord = variantsById.get(id);
      variantsById.set(id, this.mapRow(row, variantRecord, meta));
    }

    return Array.from(variantsById.values());
  }

  private mapRow(row: SqlRow, record: VcfRecord | undefined, meta: VcfMetadata): VcfRecord {
    if (!record) {
      record = {
        c: String(row.chrom),
        p: Number(row.pos),
        i: JSON.parse(row.id_vcf as string),
        r: String(row.ref),
        a: JSON.parse(row.alt as string),
        q: row.qual == null ? null : Number(row.qual),
        f: JSON.parse(row.filter as string),
        n: {}, // InfoContainer, filled below
        s: [], // Samples (RecordSample[])
      };

      const noneInfoCols: string[] = [
        "chrom",
        "pos",
        "ref",
        "alt",
        "qual",
        "filter",
        "id_vcf",
        "FMT",
        "CSQ",
        "variant_id",
        "id",
      ];
      for (const [key, value] of Object.entries(row)) {
        if (!noneInfoCols.includes(key)) {
          if (meta.info[key] === undefined) {
            throw new Error("Unknown info field: " + key);
          }
          record.n[key] = parseValue(value + "", meta.info[key]); //FIXME: string hack
        }
      }
    }
    this.mapSampleFields(row, record, meta);
    this.mapCsqFields(row, meta, record);
    return record;
  }

  private mapCsqFields(row: SqlRow, meta: VcfMetadata, vrec: VcfRecord) {
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

  private mapSampleFields(row: SqlRow, vrec: VcfRecord, meta: VcfMetadata) {
    if (row.FMT) {
      const nestedMetaMap = new Map<string, FieldMetadata>(Object.entries(meta.format));

      if (!vrec.n.CSQ) vrec.n.FMT = [];
      for (const [key, value] of Object.entries(row)) {
        if (key === "FMT") {
          vrec.s = this.parseNestedValues(value as string, nestedMetaMap);
        }
      }
    }
  }

  parseNestedValues(value: string, nestedMetaMap: Map<string, FieldMetadata>): CsqArray {
    const csqArray: CsqArray = JSON.parse(value);

    return csqArray.map((csqObj) => {
      const mapped: CsqObject = {};
      for (const key of Object.keys(csqObj)) {
        if (!nestedMetaMap.has(key)) {
          throw new Error("Unknown nested field: " + key);
        }
        const rawVal = csqObj[key];
        mapped[key] =
          rawVal !== null && rawVal !== undefined
            ? parseValue(rawVal.toString(), nestedMetaMap.get(key) as InfoMetadata)
            : null;
      }
      return mapped;
    });
  }
}
