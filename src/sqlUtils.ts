import { Database, ParamsObject, SqlValue } from "sql.js";

import { ComposedQuery, Query, QueryClause, SelectorPart, SortOrder } from "./index";
import { FieldMetadata, Value, type VcfMetadata } from "@molgenis/vip-report-vcf";
import { ArgsValue, Categories, FieldCategories, PartialStatement, SqlRow } from "./sql";
import { FieldType } from "./sqlDataParser";

export function executeSql(db: Database | undefined, sql: string, values: ParamsObject): SqlRow[] {
  if (!db) throw new Error("Database not initialized");
  const stmt = db.prepare(sql);
  stmt.bind(values);
  const rows: SqlRow[] = [];
  try {
    while (stmt.step()) rows.push(stmt.getAsObject() as SqlRow);
  } finally {
    stmt.free();
  }
  return rows;
}

export function sqlEscape(val: unknown): string | number {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? 1 : 0;
  return String(val);
}

export function toSqlList(arg: Value): SqlValue {
  if (arg === null) {
    throw new Error("Sql list value cannot be null.");
  }
  return Array.isArray(arg) ? arg.map(sqlEscape).join(", ") : sqlEscape(arg);
}

export function mapField(part: string) {
  switch (part) {
    case "c":
      return `contig.value`;
    case "p":
      return `v.pos`;
    case "i":
      return `v.idVcf`;
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

export function mapFormatField(field: SelectorPart, type: "FORMAT" | "INFO") {
  if (type === "FORMAT" && field === "GT_type") {
    field = "gtType";
  }
  return field;
}

export function complexQueryToSql(
  query: Query,
  categories: Categories,
  nestedTables: string[],
  meta: VcfMetadata,
): PartialStatement {
  let values = {};
  let partialStatement;
  const tables = usedTables(query);
  let joins = "vcf v";
  if (tables.has("s")) joins += " JOIN format f ON f.variantId = v.id";
  joins += " LEFT JOIN contig contig ON contig.id = v.chrom";
  for (const nestedTable of nestedTables) {
    if (tables.has(nestedTable))
      joins += ` JOIN variant_${nestedTable} ${nestedTable} ON ${nestedTable}.variantId = v.id`;
  }
  if (tables.has("n")) joins += " JOIN info n ON n.variantId = v.id";

  let nestedFilter = "";
  for (const nestedTable of nestedTables) {
    const nestedQuery = extractNestedQuery(query, nestedTable);
    if (nestedQuery) {
      ({ partialStatement, values } = queryToSql(nestedQuery, categories, nestedTables, meta, values));
      nestedFilter += " AND " + partialStatement;
    }
  }
  ({ partialStatement, values } = queryToSql(query, categories, nestedTables, meta, values));

  const statement = `
v.id IN (
  SELECT v.id
  FROM ${joins}
  WHERE ${partialStatement}
)
${nestedFilter}`.trim();
  return { partialStatement: statement, values: values };
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
    throw new Error(`Unexpected number of query parts for query: '${query}'`);
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
    return { operator: query.operator, args: subCSQs } as Query;
  }
  const clause = query as QueryClause;
  const parts = Array.isArray(clause.selector) ? clause.selector : [clause.selector];
  if (parts.length === 3 && parts[1] === nestedTable) return query;
  return undefined;
}

function nestedQuerytoSql(
  query: ComposedQuery & {
    args: unknown;
  },
  categories: Map<string, FieldCategories>,
  meta: VcfMetadata,
  nestedTables: string[],
  values: ParamsObject,
) {
  const joinWord = query.operator.toUpperCase();
  let statement = "(";
  for (const subQuery of query.args) {
    let partialStatement;
    ({ partialStatement, values } = queryToSql(subQuery, categories, nestedTables, meta, values));
    if (statement !== "(") {
      statement += ` ${joinWord} `;
    }
    statement += partialStatement;
  }
  statement += ")";
  return { partialStatement: statement, values: values };
}

function mapQueryOnNestedField(
  parts: SelectorPart[],
  clause: QueryClause,
  categories: Map<string, FieldCategories>,
  meta: VcfMetadata,
  values: ParamsObject,
) {
  const type: FieldType = parts[0] === "s" ? "FORMAT" : "INFO";
  const prefix = parts[0] === "s" ? "f." : parts[1] + ".";
  const parent = type === "INFO" ? parts[1] : null;
  const field = mapFormatField(parts[2] as SelectorPart, type);
  let newClause = clause;
  const key = parent === null ? `${type}/${field}` : `${type}/${parent}/${field}`;
  if (categories.has(key)) {
    newClause = mapQueryCategories(categories, key, clause);
  }
  const sqlCol = `${prefix}${field}`;
  let partialStatement;
  ({ partialStatement, values } = mapOperatorToSql(newClause, sqlCol, meta, values));
  const sampleKey = getUniqueKey(values, "sampleIndex");
  if (parts[0] === "s" && parts[1] !== "*") {
    values[sampleKey] = parts[1] as string;
    partialStatement = `(${partialStatement} AND ${prefix}sampleIndex = ${sampleKey})`;
  }
  return { partialStatement, values };
}

function MapQueryOnInfoOrFormat(
  parts: SelectorPart[],
  clause: QueryClause,
  categories: Map<string, FieldCategories>,
  meta: VcfMetadata,
  values: ParamsObject,
) {
  const type: FieldType = parts[0] === "s" ? "FORMAT" : "INFO";
  const prefix = parts[0] === "s" ? "f" : parts[0];
  const field = mapFormatField(parts[1] as SelectorPart, type);
  let newClause = clause;
  const key = `${type}/${field}`;
  if (categories.has(key)) {
    newClause = mapQueryCategories(categories, key, clause);
  }
  const sqlCol = `${prefix}.${field}`;
  return mapOperatorToSql(newClause, sqlCol, meta, values);
}

function queryToSql(
  query: Query,
  categories: Categories,
  nestedTables: string[],
  meta: VcfMetadata,
  values: ParamsObject,
): PartialStatement {
  if (
    query &&
    typeof query === "object" &&
    "args" in query &&
    Array.isArray(query.args) &&
    (query.operator === "and" || query.operator === "or")
  ) {
    return nestedQuerytoSql(query, categories, meta, nestedTables, values);
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
    return mapOperatorToSql(clause, sqlCol, meta, values);
  }
  if (parts.length === 2) {
    return MapQueryOnInfoOrFormat(parts, clause, categories, meta, values);
  }
  if (parts.length === 3) {
    return mapQueryOnNestedField(parts, clause, categories, meta, values);
  }
  throw new Error("Could not convert selector '" + JSON.stringify(parts) + "' to SQL.");
}

function parseString(sqlCol: string): {
  field_type: FieldType;
  parent_field: string | undefined;
  field: string | undefined;
} {
  const [table, field] = sqlCol.split(".", 2);
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
  } else if (parent_field !== undefined) {
    const parentMeta = meta.info[parent_field];
    if (parentMeta === undefined) {
      throw new Error(`Parent metadata missing for: '${parent_field}'`);
    }
    if (parentMeta.nested === undefined) {
      throw new Error(`Nested fields missing in parent metadata: '${parent_field}'`);
    }
    for (const nested of parentMeta.nested.items) {
      if (nested.id === field) {
        return nested;
      }
    }
  } else {
    return meta.info[field];
  }
}

function processValueList(nonNulls: (string | number)[], values: ParamsObject, sqlCol: string) {
  const keys = [];
  for (const nonNull of nonNulls) {
    const key = getUniqueKey(values, sqlCol);
    keys.push(key);
    values[key] = toSqlList(nonNull);
  }
  return keys;
}

function mapInQueryRegular(sqlCol: string, nonNulls: (string | number)[], values: ParamsObject): PartialStatement {
  const keys = processValueList(nonNulls, values, sqlCol);
  let inClause;
  switch (sqlCol) {
    case "contig.value":
    case "v.ref":
      inClause = `${sqlCol} IN (${keys})`;
      break;
    case "v.pos":
    case "v.qual":
      inClause = `${sqlCol} IN (${keys})`;
      break;
    case "v.alt":
    case "v.idVcf":
    case "v.filter":
      inClause = `EXISTS (
            SELECT 1 FROM json_each(${sqlCol})
            WHERE CAST(json_each.value as TEXT) IN (${keys})
          )`;
      break;
    default:
      throw new Error(`Unknown column '${sqlCol}'`);
  }
  return { partialStatement: inClause, values: values };
}

function mapInQueryInfoFormat(fieldMeta: FieldMetadata, inClause: string, sqlCol: string, keys: string[]) {
  if (fieldMeta?.number.count !== 1) {
    inClause = `EXISTS (
      SELECT 1 FROM json_each(${sqlCol})
      WHERE CAST(json_each.value as TEXT) IN (${keys})
    )`;
  } else {
    switch (fieldMeta.type) {
      case "CHARACTER":
      case "STRING":
        inClause = `${sqlCol} IN (${keys})`;
        break;
      case "CATEGORICAL":
      case "INTEGER":
      case "FLAG":
      case "FLOAT":
        inClause = `${sqlCol} IN (${keys})`;
        break;
      default:
        throw new Error(`Unknown FieldType: '${fieldMeta.type}'`);
    }
  }
  return inClause;
}

function composeInQuery(
  query: string | null,
  operator: "in" | "!in",
  inClause: string,
  hasNull: boolean,
  sqlCol: string,
) {
  query = operator === "in" ? inClause : `NOT ${inClause}`;
  if (hasNull) {
    const nullCheck = operator === "in" ? `${sqlCol} IS NULL` : `${sqlCol} IS NOT NULL`;
    if (query !== null && query.trim()) {
      query = operator === "in" ? `(${query} OR ${nullCheck})` : `(${query} AND ${nullCheck})`;
    } else {
      query = nullCheck;
    }
  }
  return query;
}

function mapInQuery(
  args: string | number | string[] | (string | null)[] | number[] | (number | null)[] | boolean,
  sqlCol: string,
  operator: "in" | "!in",
  meta: VcfMetadata | null,
  values: ParamsObject,
): PartialStatement {
  let inClause: string = "";
  if (!Array.isArray(args)) {
    throw new Error(`value '${args}' is of type '${typeof args}' instead of 'array'`);
  }
  const nonNulls = args.filter((v) => v !== null && v !== undefined);
  const keys = processValueList(nonNulls, values, sqlCol);
  const hasNull = args.some((v) => v === null || v === undefined);
  let query: string | null = null;

  if (meta == null) {
    inClause = `${sqlCol} IN (${keys})`;
  } else if (nonNulls.length > 0) {
    const fieldMeta = getMetadataForColumn(sqlCol, meta);
    if (fieldMeta == null) {
      ({ partialStatement: inClause, values } = mapInQueryRegular(sqlCol, nonNulls, values));
    } else {
      inClause = mapInQueryInfoFormat(fieldMeta, inClause, sqlCol, keys);
    }
  }
  query = composeInQuery(query, operator, inClause, hasNull, sqlCol);
  if (!query) {
    throw new Error(`An error occurred while mapping the IN query for column '${sqlCol}'`);
  }
  return { partialStatement: query, values: values };
}

function mapOperatorToSql(
  clause: QueryClause,
  sqlCol: string,
  meta: VcfMetadata | null,
  values: ParamsObject,
): PartialStatement {
  const key = getUniqueKey(values, sqlCol);
  const { args, operator } = clause;

  if (args === null || args === undefined || (Array.isArray(args) && (args as Array<ArgsValue>).length === 0)) {
    switch (operator) {
      case "==":
        return { partialStatement: `${sqlCol} IS NULL`, values: values };
      case "!=":
        return { partialStatement: `${sqlCol} IS NOT NULL`, values: values };
      default:
        throw new Error("Unsupported op: " + operator + " for NULL arg");
    }
  }

  if (operator === "in" || operator === "!in") {
    return mapInQuery(args, sqlCol, operator, meta, values);
  }

  values[key] = sqlEscape(args);
  let partialStatement;
  switch (operator) {
    case "==":
    case "!=":
      partialStatement = `${sqlCol} ${operator} ${key}`;
      break;
    case ">":
    case ">=":
    case "<":
    case "<=":
      if (typeof args !== "number") {
        throw new Error(`value '${args}' is of type '${typeof args}' instead of 'number'`);
      }
      partialStatement = `${sqlCol} ${operator} ${key}`;
      break;
    default:
      throw new Error("Unsupported op: " + operator);
  }
  return { partialStatement, values };
}

export function simpleQueryToSql(
  query: Query,
  categories: Categories,
  values: ParamsObject,
  prefix: string | undefined = undefined,
): PartialStatement {
  if ("args" in query && Array.isArray(query.args) && (query.operator === "and" || query.operator === "or")) {
    const joinWord = query.operator.toUpperCase();
    let statement = "(";
    for (const subQuery of query.args) {
      let partialStatement;
      ({ partialStatement, values } = simpleQueryToSql(subQuery, categories, values, prefix));
      if (statement !== "(") {
        statement += ` ${joinWord} `;
      }
      statement += partialStatement;
    }
    statement += ")";
    return { partialStatement: statement, values: values };
  }

  const clause = query as QueryClause;
  let parts: SelectorPart[];
  if (Array.isArray(clause.selector)) {
    parts = clause.selector.slice();
  } else {
    parts = [clause.selector];
  }

  if (parts.length === 1) {
    const sqlCol =
      prefix !== undefined
        ? `${prefix}.${mapField((parts[0] as SelectorPart).toString())}`
        : mapField((parts[0] as SelectorPart).toString());
    return mapOperatorToSql(clause, sqlCol, null, values);
  } else if (parts.length === 2) {
    const prefix = parts[0];
    const type = prefix === "s" ? "FORMAT" : "INFO";
    const field = parts[1];
    const sqlCol = `${prefix}.${field}`;
    const key = `${type}/${field}`;
    if (categories.has(key)) {
      mapQueryCategories(categories, key, clause);
    }
    return mapOperatorToSql(clause, sqlCol, null, values);
  }
  throw new Error("Unsupported query:" + JSON.stringify(parts));
}

export function getColumnNames(db: Database | undefined, table: string): string[] {
  const rows = executeSql(db, `PRAGMA table_info(${table});`, {});
  return rows.map((row) => row.name as string);
}

export function getNestedJoins(nestedTables: string[]) {
  let nestedJoins: string = "";
  for (const nestedTable of nestedTables) {
    nestedJoins += ` LEFT JOIN variant_${nestedTable} ${nestedTable} ON ${nestedTable}.variantId = v.id`;
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
                             contig.value as chrom,
                             v.id AS v_variantId
                          ${orderCols.length ? "," + orderCols.join(", ") : ""}
                      FROM vcf v
                          LEFT JOIN info n ON n.variantId = v.id
                          LEFT JOIN contig contig ON contig.id = v.chrom
                          ${includeFormat ? `LEFT JOIN (SELECT * FROM format ${sampleJoinQuery}) f ON f.variantId = v.id` : ""}
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
        throw new Error("Unknown nested field: " + order.property[1]);
      }
      col = `${key}.${order.property[2]}`;
    }
    if (col === undefined) {
      throw new Error("Error determining sort column for:" + order);
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

export function getColumns(db: Database | undefined, nestedTables: string[], includeFormat: boolean) {
  let columns: string[] = [];
  for (const nestedTable of nestedTables) {
    columns = columns.concat(
      getColumnNames(db, `variant_${nestedTable}`).map((col) => `${nestedTable}.${col} AS "${nestedTable}^${col}"`),
    );
  }
  if (includeFormat) {
    columns = columns.concat(getColumnNames(db, "format").map((col) => `f.${col} AS FMT_${col} `));
  }
  columns = columns.concat(getColumnNames(db, "info").map((col) => `n.${col} AS INFO_${col} `));
  return columns;
}

export function getNestedTables(meta: VcfMetadata): string[] {
  const filtered = Object.entries(meta.info).filter(([, info]) => info.nested != null);
  return filtered.map(([key]) => key);
}

function getUniqueKey(valueObject: ParamsObject, key: string): string {
  let suffix = 1;
  key = ":" + key.replaceAll(".", "_");
  let newKey = key;
  while (Object.hasOwn(valueObject, newKey)) {
    newKey = `${key}_${suffix}`;
    suffix++;
  }
  return newKey;
}
