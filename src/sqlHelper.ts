// sql-helpers.ts
import { Database } from "sql.js";

type SqlRow = { [column: string]: string | number | boolean | null | undefined };
// Value escaping for SQL values
import { ComposedQueryOperator, Query, QueryClause, SelectorPart } from "./index";

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
  // For strings: single quote escape for SQL
  return "'" + String(val).replace(/'/g, "''") + "'";
}

// Transform any (array or scalar) argument to an SQL list (for IN)
export function toSqlList(
  arg: string | number | boolean | string[] | (string | null)[] | number[] | (number | null)[] | null | undefined,
): string {
  return Array.isArray(arg) ? arg.map(sqlEscape).join(", ") : sqlEscape(arg);
}

export function mapField(part: SelectorPart) {
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

// Compose a CSQ aggregate SQL snippet to MAX/MIN within a JSON array field (used for ordering)
export function csqAggregateOrderSql(csqJsonCol: string, csqField: string, direction: "max" | "min"): string {
  // Cast as NUMERIC for numbers; for strings remove the CAST.
  return `(SELECT ${direction.toUpperCase()}(CAST(json_extract(csq_item.value, '$.${csqField}') AS NUMERIC)) FROM json_each(${csqJsonCol}) csq_item)`;
}

export function splitCsqQuery(query: Query | undefined): {
  rest?: Query | undefined;
  csq?: Query | undefined;
  fmt?: Query | undefined;
} {
  if (!query) return { rest: undefined, csq: undefined, fmt: undefined };
  if ("args" in query && Array.isArray(query.args) && (query.operator === "and" || query.operator === "or")) {
    const rest: Query[] = [],
      csq: Query[] = [],
      fmt: Query[] = [];
    for (const arg of query.args) {
      const split = splitCsqQuery(arg);
      if (split.rest) rest.push(split.rest);
      if (split.csq) csq.push(split.csq);
      if (split.fmt) fmt.push(split.fmt);
    }
    return {
      rest: rest.length ? { operator: query.operator, args: rest } : undefined,
      csq: csq.length ? { operator: query.operator, args: csq } : undefined,
      fmt: fmt.length ? { operator: query.operator, args: fmt } : undefined,
    };
  } else {
    const clause = query as QueryClause;
    if (Array.isArray(clause.selector) && clause.selector.length > 2) {
      if (clause.selector[1] === "CSQ") return { rest: undefined, csq: clause, fmt: undefined };
      if (clause.selector[0] === "s") return { rest: undefined, csq: undefined, fmt: clause };
    }
    return { rest: clause, csq: undefined, fmt: undefined };
  }
}

export function queryToSql(query: Query): string {
  if ("args" in query && Array.isArray(query.args) && (query.operator === "and" || query.operator === "or")) {
    const joinWord = query.operator.toUpperCase();
    return "(" + query.args.map(queryToSql).join(` ${joinWord} `) + ")";
  }
  // Single clause (LEAF)
  const clause = query as QueryClause;
  let parts: SelectorPart[];
  if (Array.isArray(clause.selector)) {
    parts = clause.selector.slice();
  } else {
    parts = [clause.selector];
  }

  // non-nested field
  if (parts.length === 1) {
    const sqlCol = mapField(parts[0] as SelectorPart);
    return mapOperatorToSql(clause, sqlCol);
  }
  // info/format or two-segment
  if (parts.length === 2) {
    const prefix = parts[0];
    const field = parts[1];
    const sqlCol = `${prefix}.${field}`;
    return mapOperatorToSql(clause, sqlCol);
  }
  // If more than 2, this is a nested array/JSON thing and belongs in nestedQueryToSql
  throw new Error("Can't convert triple/complex selector to flat SQL: " + JSON.stringify(parts));
}

function mapOperatorToSql(clause: QueryClause, sqlCol: string): string {
  if (clause.args === null || clause.args === undefined) {
    switch (clause.operator) {
      case "==":
        return `${sqlCol} IS NULL`;
      case "!=":
        return `${sqlCol} IS NOT NULL`;
      default:
        throw new Error("Unsupported op: " + clause.operator + "for NULL arg");
    }
  }
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
      throw new Error("Unsupported op: " + clause.operator);
  }
}

export function nestedQueryToSql(query: Query, prefix: string): string {
  if (
    "args" in query &&
    Array.isArray(query.args) &&
    ((query.operator as ComposedQueryOperator) === "and" || query.operator === "or")
  ) {
    const joinWord = query.operator.toUpperCase();
    return "(" + query.args.map((arg) => nestedQueryToSql(arg as Query, prefix)).join(` ${joinWord} `) + ")";
  }
  // leaf
  const clause = query as QueryClause;
  let parts: SelectorPart[];
  if (Array.isArray(clause.selector)) {
    parts = clause.selector.slice();
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
    default:
      throw new Error(`Unsupported operator for nested subquery: ${clause.operator}`);
  }
}

export function buildJsonPatchSql(db: Database, table: string, handle: string): string | undefined {
  const batchSize = 20; // 20 columns per json_object (40 args)
  const columnChunks = chunkArray(getColumnNames(db, table), batchSize);

  const jsonObjects = columnChunks.map(
    (chunk) => `json_object(${chunk.map((col) => `'${col}', ${handle}.${col}`).join(", ")})`,
  );
  return jsonObjects.length > 1
    ? jsonObjects.reduce((acc, obj) => (acc ? `json_patch(${acc}, ${obj})` : obj), "")
    : jsonObjects[0];
}

function chunkArray<T>(arr: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < arr.length; index += chunkSize) {
    chunks.push(arr.slice(index, index + chunkSize));
  }
  return chunks;
}

function getColumnNames(db: Database, table: string): string[] {
  const rows = executeSql(db, `PRAGMA table_info(${table});`);
  return rows
    .map((row) => row.name as string)
    .filter((name) => name !== "id" && name !== "variant_id" && name !== "sample_id");
}
