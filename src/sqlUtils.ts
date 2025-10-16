import { Database } from "sql.js";

import { Query, QueryClause, SelectorPart, SortOrder } from "./index";
import { FieldMetadata, Value, type VcfMetadata } from "@molgenis/vip-report-vcf";
import { ArgsValue, Categories, FieldCategories, SqlRow } from "./sql";
import { FieldType } from "./DataParser";

export function executeSql(db: Database, sql: string): SqlRow[] {
  if (!db) throw new Error("Database not initialized");
  const stmt = db.prepare(sql);
  const rows: SqlRow[] = [];
  try {
    while (stmt.step()) rows.push(stmt.getAsObject() as SqlRow);
  } finally {
    stmt.free();
  }
  return rows;
}

export function sqlEscape(val: unknown): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "number") return String(val);
  if (typeof val === "boolean") return val ? "1" : "0";
  return "'" + String(val).replace(/'/g, "''") + "'";
}

export function toSqlList(arg: Value): string {
  return Array.isArray(arg) ? arg.map(sqlEscape).join(", ") : sqlEscape(arg);
}

export function mapField(part: string) {
  switch (part) {
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
      return part.toString();
  }
}

function mapCategories(categories: Map<string, FieldCategories>, key: string) {
  if (!categories.has(key)) {
    throw new Error(`No categorical values found for field '${key}'.`);
  }
  return categories.get(key) as FieldCategories;
}

function mapQueryCategories(categories: Map<string, FieldCategories>, key: string, clause: QueryClause): QueryClause {
  const fieldCategories = mapCategories(categories, key);
  let args;
  if (Array.isArray(clause.args)) {
    const newArgs: (number | null)[] = [];
    for (const [number, category] of fieldCategories.entries()) {
      for (const argument of clause.args) {
        if (category === argument) {
          newArgs.push(number);
        } else if (argument === null) {
          newArgs.push(null);
        }
      }
    }
    args = newArgs;
  } else {
    for (const [number, category] of fieldCategories.entries()) {
      if (category === clause.args) {
        args = number;
      }
    }
  }
  return { args: args, operator: clause.operator, selector: clause.selector };
}

export function complexQueryToSql(
  query: Query,
  categories: Categories,
  nestedTables: string[],
  meta: VcfMetadata,
): string {
  const tables = usedTables(query);
  let joins = "vcf v_inner";
  if (tables.has("s")) joins += " JOIN format f_inner ON f_inner.variant_id = v_inner.id";
  for (const nestedTable of nestedTables) {
    if (tables.has(nestedTable))
      joins += ` JOIN variant_${nestedTable} ${nestedTable}_inner ON ${nestedTable}_inner.variant_id = v_inner.id`;
  }
  if (tables.has("n")) joins += " JOIN info n_inner ON n_inner.variant_id = v_inner.id";

  let nestedFilter = "";
  for (const nestedTable of nestedTables) {
    const nestedQuery = extractNestedQuery(query, nestedTable);
    if (nestedQuery) {
      const oldPrefix = `${nestedTable}_inner.`;
      const newPrefix = `${nestedTable}.`;
      const pattern = new RegExp(oldPrefix, "g");
      nestedFilter += " AND " + queryToSql(nestedQuery, categories, nestedTables, meta).replace(pattern, newPrefix);
    }
  }

  return `
v.id IN (
  SELECT v_inner.id
  FROM ${joins}
  WHERE ${queryToSql(query, categories, nestedTables, meta)}
)
${nestedFilter}`.trim();
}

function usedTables(query: Query, tables = new Set<string>()): Set<string> {
  if (
    query &&
    typeof query === "object" &&
    "args" in query &&
    Array.isArray(query.args) &&
    (query.operator === "and" || query.operator === "or")
  ) {
    for (const subQuery of query.args) usedTables(subQuery as Query, tables);
    return tables;
  }
  const clause = query as QueryClause;
  let parts: SelectorPart[];
  if (Array.isArray(clause.selector)) {
    parts = clause.selector.slice();
  } else {
    parts = [clause.selector];
  }
  if (parts.length > 3) {
    throw Error(`Unexpected number of query parts for query: '${query}'`);
  }
  if (parts[0] === "s") {
    tables.add("s");
  } else if (parts.length === 3) {
    tables.add(parts[1] as string);
  } else {
    tables.add(parts[0] as string);
  }
  return tables;
}

// Extract only the Nested parts of the query
function extractNestedQuery(query: Query, nestedTable: string): Query | undefined {
  if (
    query &&
    typeof query === "object" &&
    "args" in query &&
    Array.isArray(query.args) &&
    (query.operator === "and" || query.operator === "or")
  ) {
    const subCSQs = query.args.map((q) => extractNestedQuery(q as Query, nestedTable)).filter(Boolean) as Query[];
    if (subCSQs.length === 0) return undefined;
    if (subCSQs.length === 1) return subCSQs[0];
    return { operator: query.operator, args: subCSQs as Query[] } as Query;
  }
  const clause = query as QueryClause;
  const parts = Array.isArray(clause.selector) ? clause.selector : [clause.selector];
  if (parts.length === 3 && parts[1] === nestedTable) return query;
  return undefined;
}

function queryToSql(query: Query, categories: Categories, nestedTables: string[], meta: VcfMetadata): string {
  if (
    query &&
    typeof query === "object" &&
    "args" in query &&
    Array.isArray(query.args) &&
    (query.operator === "and" || query.operator === "or")
  ) {
    const joinWord = query.operator.toUpperCase();
    return (
      "(" +
      query.args.map((subQuery) => queryToSql(subQuery, categories, nestedTables, meta)).join(` ${joinWord} `) +
      ")"
    );
  }
  const clause = query as QueryClause;
  let parts: SelectorPart[];
  if (Array.isArray(clause.selector)) {
    parts = clause.selector.slice();
  } else {
    parts = [clause.selector];
  }
  if (parts.length === 1) {
    const sqlCol = mapField((parts[0] as SelectorPart).toString());
    return mapOperatorToSql(clause, sqlCol, meta);
  }
  if (parts.length === 2) {
    const type = parts[0] === "s" ? "FORMAT" : "INFO";
    const prefix = parts[0] === "s" ? "f" : parts[0];
    const field = parts[1];
    let newClause = clause;
    const key = `${type}/${field}`;
    if (categories.has(key)) {
      newClause = mapQueryCategories(categories, key, clause);
    }
    const sqlCol = `${prefix}_inner.${field}`;
    return mapOperatorToSql(newClause, sqlCol, meta);
  }
  if (parts.length === 3) {
    const type = parts[0] === "s" ? "FORMAT" : "INFO";
    const prefix = parts[0] === "s" ? "f_inner" : parts[1] + "_inner";
    const parent = type === "INFO" ? parts[1] : null;
    const field = parts[2];
    let newClause = clause;
    const key = parent === null ? `${type}/${field}` : `${type}/${parent}/${field}`;
    if (categories.has(key)) {
      newClause = mapQueryCategories(categories, key, clause);
    }
    const sqlCol = `${prefix}.${field}`;
    let where = mapOperatorToSql(newClause, sqlCol, meta);
    if (parts[0] === "s" && parts[1] !== "*") {
      where = `(${where} AND ${prefix}.sample_id = ${parts[1]})`;
    }
    return where;
  }
  throw new Error("Could not convert selector '" + JSON.stringify(parts) + "' to SQL.");
}

function parseString(sqlCol: string): {
  field_type: FieldType;
  parent_field: string | undefined;
  field: string | undefined;
} {
  const [rawTable, field] = sqlCol.split(".", 2);
  const table = rawTable!.endsWith("_inner") ? rawTable!.slice(0, -6) : rawTable;
  let field_type: FieldType;
  let parent_field: string | undefined;
  if (table === "f") {
    field_type = "FORMAT";
  } else {
    field_type = "INFO";
  }
  if (table !== "n" && table !== "v") {
    parent_field = table;
  }
  return { field_type, parent_field, field };
}

function getMetadataForColumn(sqlCol: string, meta: VcfMetadata): FieldMetadata | undefined {
  const { field_type, parent_field, field } = parseString(sqlCol);
  if (field === undefined) {
    throw new Error(`Invalid column: '${sqlCol}'`);
  }
  if (field_type === "FORMAT") {
    return meta.format[field];
  } else {
    if (parent_field !== undefined) {
      const parentMeta = meta.info[parent_field];
      if (parentMeta === undefined) {
        throw new Error(`Parent metadata missing for: '${parent_field}'`);
      }
      if (parentMeta.nested === undefined) {
        throw new Error(`Nested fields missing in parent metadata: '${parent_field}'`);
      }
      for (const nested of parentMeta.nested.items as FieldMetadata[]) {
        if (nested.id === field) {
          return nested;
        }
      }
    } else {
      return meta.info[field!];
    }
  }
}

function mapInQueryRegular(sqlCol: string, inClause: string, nonNulls: (string | number)[]) {
  switch (sqlCol) {
    case "v.chrom":
    case "v.ref":
      inClause = `${sqlCol} IN (${nonNulls.map((s) => `"${s}"`).join(", ")})`;
      break;
    case "v.pos":
    case "v.qual":
      inClause = `${sqlCol} IN (${toSqlList(nonNulls)})`;
      break;
    case "v.alt":
    case "v.id_vcf":
    case "v.filter":
      inClause = `EXISTS (
            SELECT 1 FROM json_each(${sqlCol})
            WHERE CAST(json_each.value as TEXT) IN (${toSqlList(nonNulls)})
          )`;
      break;
    default:
      throw Error(`Unknown column '${sqlCol}'`);
  }
  return inClause;
}

function mapInQuery(
  args: string | number | string[] | (string | null)[] | number[] | (number | null)[] | boolean,
  sqlCol: string,
  operator: "in" | "!in",
  meta: VcfMetadata | null,
): string {
  let inClause: string = "";
  if (!Array.isArray(args)) {
    throw new Error(`value '${args}' is of type '${typeof args}' instead of 'array'`);
  }
  const nonNulls = args.filter((v) => v !== null && v !== undefined);
  const hasNull = args.some((v) => v === null || v === undefined);
  let query: string | null = null;

  if (meta == null) {
    inClause = `${sqlCol} IN (${toSqlList(nonNulls)})`;
  } else {
    if (nonNulls.length > 0) {
      const fieldMeta = getMetadataForColumn(sqlCol, meta);
      if (fieldMeta == null) {
        inClause = mapInQueryRegular(sqlCol, inClause, nonNulls);
      } else {
        const valueList = toSqlList(nonNulls);
        if (fieldMeta?.number.count !== 1) {
          inClause = `EXISTS (
        SELECT 1 FROM json_each(${sqlCol})
        WHERE CAST(json_each.value as TEXT) IN (${valueList})
      )`;
        } else {
          switch (fieldMeta.type) {
            case "CHARACTER":
            case "STRING":
              inClause = `${sqlCol} IN (${nonNulls.map((s) => `"${s}"`).join(", ")})`;
              break;
            case "CATEGORICAL":
            case "INTEGER":
            case "FLAG":
            case "FLOAT":
              inClause = `${sqlCol} IN (${valueList})`;
              break;
            default:
              throw new Error(`Unknown FieldType: '${fieldMeta.type}'`);
          }
        }
      }
    }
  }
  query = operator === "in" ? inClause : `NOT ${inClause}`;
  if (hasNull) {
    const nullCheck = operator === "in" ? `${sqlCol} IS NULL` : `${sqlCol} IS NOT NULL`;
    if (query !== null && query.trim()) {
      query = operator === "in" ? `(${query} OR ${nullCheck})` : `(${query} AND ${nullCheck})`;
    } else {
      query = nullCheck;
    }
  }
  if (!query) {
    throw new Error(`An error occurred while mapping the IN query for column '${sqlCol}'`);
  }
  return query;
}

function mapOperatorToSql(clause: QueryClause, sqlCol: string, meta: VcfMetadata | null): string {
  const { args, operator } = clause;

  if (args === null || args === undefined || (Array.isArray(args) && (args as Array<ArgsValue>).length === 0)) {
    switch (operator) {
      case "==":
        return `${sqlCol} IS NULL`;
      case "!=":
        return `${sqlCol} IS NOT NULL`;
      default:
        throw new Error("Unsupported op: " + operator + " for NULL arg");
    }
  }

  if (operator === "in" || operator === "!in") {
    return mapInQuery(args, sqlCol, operator, meta);
  }

  switch (operator) {
    case "==":
    case "!=":
      return `${sqlCol} ${operator} ${sqlEscape(args)}`;
    case ">":
    case ">=":
    case "<":
    case "<=":
      if (typeof args !== "number") {
        throw new Error(`value '${args}' is of type '${typeof args}' instead of 'number'`);
      }
      return `${sqlCol} ${operator} ${sqlEscape(args)}`;
    default:
      throw new Error("Unsupported op: " + operator);
  }
}

export function simpleQueryToSql(query: Query, categories: Categories): string {
  if ("args" in query && Array.isArray(query.args) && (query.operator === "and" || query.operator === "or")) {
    const joinWord = query.operator.toUpperCase();
    return "(" + query.args.map((subQuery) => simpleQueryToSql(subQuery, categories)).join(` ${joinWord} `) + ")";
  }

  const clause = query as QueryClause;
  let parts: SelectorPart[];
  if (Array.isArray(clause.selector)) {
    parts = clause.selector.slice();
  } else {
    parts = [clause.selector];
  }

  if (parts.length === 1) {
    const sqlCol = mapField((parts[0] as SelectorPart).toString());
    return mapOperatorToSql(clause, sqlCol, null);
  } else if (parts.length === 2) {
    const prefix = parts[0];
    const type = prefix === "s" ? "FORMAT" : "INFO";
    const field = parts[1];
    const sqlCol = `${prefix}.${field}`;
    const key = `${type}/${field}`;
    if (categories.has(key)) {
      mapQueryCategories(categories, key, clause);
    }
    return mapOperatorToSql(clause, sqlCol, null);
  }
  throw new Error("Unsupported query:" + JSON.stringify(parts));
}

export function getColumnNames(db: Database, table: string): string[] {
  const rows = executeSql(db, `PRAGMA table_info(${table});`);
  return rows.map((row) => row.name as string);
}

export function getNestedJoins(nestedTables: string[]) {
  let nestedJoins: string = "";
  for (const nestedTable of nestedTables) {
    nestedJoins += ` LEFT JOIN variant_${nestedTable} ${nestedTable} ON ${nestedTable}.variant_id = v.id`;
  }
  return nestedJoins;
}

export function getPagingQuery(
  orderCols: string[],
  includeFormat: boolean,
  sampleJoinQuery: string,
  nestedJoins: string,
  whereClause: string,
  distinctOrderByClauses: string[],
  size: number,
  page: number,
) {
  return `SELECT DISTINCT v.*
                FROM (SELECT v.*,
                             v.id AS v_variant_id
                          ${orderCols.length ? "," + orderCols.join(", ") : ""}
                      FROM vcf v
                          LEFT JOIN info n ON n.variant_id = v.id
                          ${includeFormat ? `LEFT JOIN (SELECT * FROM format ${sampleJoinQuery}) f ON f.variant_id = v.id` : ""}
                          ${nestedJoins} 
                          ${whereClause}
                      GROUP BY v.id ${distinctOrderByClauses.length ? "ORDER BY " + distinctOrderByClauses.join(", ") : ""}) v
                    LIMIT ${size} OFFSET ${page * size}`;
}

export function getSortClauses(sortOrders: SortOrder[], nestedTables: string[]) {
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

export function getColumns(db: Database, nestedTables: string[], includeFormat: boolean) {
  let columns: string[] = [];
  for (const nestedTable of nestedTables) {
    columns = columns.concat(
      getColumnNames(db as Database, `variant_${nestedTable}`).map(
        (col) => `${nestedTable}.${col} AS "${nestedTable}^${col}"`,
      ),
    );
  }
  if (includeFormat) {
    columns = columns.concat(getColumnNames(db as Database, "format").map((col) => `f.${col} AS FMT_${col} `));
  }
  columns = columns.concat(getColumnNames(db as Database, "info").map((col) => `n.${col} AS INFO_${col} `));
  return columns;
}

export function getNestedTables(meta: VcfMetadata): string[] {
  const filtered = Object.entries(meta.info).filter(([, info]) => info.nested != null);
  return filtered.map(([key]) => key);
}
