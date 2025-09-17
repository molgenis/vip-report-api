import { Database } from "sql.js";

type SqlRow = { [column: string]: string | number | boolean | null | undefined };
import { Query, QueryClause, SelectorPart } from "./index";
import { Categories, FieldCategories } from "./loader";
import { Value } from "@molgenis/vip-report-vcf";

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

export function toSqlList(
    arg: Value,
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
      return part.toString();
  }
}

function mapCategories(categories: Map<string, FieldCategories>, field: string | number, clause: QueryClause): QueryClause {
  //FIXME: Error on unmappable categories
  const fieldCategories: FieldCategories = categories.get(field as string) as FieldCategories;
  let args;
  if (Array.isArray(clause.args)) {
    const newArgs: (number | null)[] = [];
    for (const [number, category] of fieldCategories.entries()) {
      for (const argument of clause.args) {
        if (category === argument) {
          newArgs.push(number);
        } else if(argument === null){
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
  return {args: args, operator: clause.operator, selector: clause.selector};
}

export function complexQueryToSql(query: Query, categories: Categories): string {
  // 1. Helper to find referenced tables
  function usedTables(query: Query, tables = new Set<string>()): Set<string> {
    if (query && typeof query === "object" && "args" in query && Array.isArray(query.args) && (query.operator === "and" || query.operator === "or")) {
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
    if (parts.length === 3) {
      if (parts[1] === "CSQ") {
        tables.add("c");
      } else if (parts[0] === "s") {
        tables.add("s");
      } else {
        tables.add(parts[0] as string);
      }
    }
    else {
      tables.add(parts[0] as string);
    }
    return tables;
  }

  // 2. Helper: recursively extract only the CSQ portions of the query
  function extractCSQQuery(query: Query): Query | undefined {
    if (query && typeof query === "object" && "args" in query && Array.isArray(query.args) && (query.operator === "and" || query.operator === "or")) {
      const subCSQs = query.args.map(q => extractCSQQuery(q as Query)).filter(Boolean) as Query[];
      if (subCSQs.length === 0) return undefined;
      if (subCSQs.length === 1) return subCSQs[0];
      return { operator: query.operator, args: subCSQs as Query[] } as Query;
    }
    const clause = query as QueryClause;
    const parts = Array.isArray(clause.selector) ? clause.selector : [clause.selector];
    if (parts.length === 3 && parts[1] === "CSQ") return query;
    return undefined;
  }

  // 3. Your existing WHERE clause generator with alias handling
  function queryToSql(query: Query, categories: Categories): string {
    if (query && typeof query === "object" && "args" in query && Array.isArray(query.args) && (query.operator === "and" || query.operator === "or")) {
      const joinWord = query.operator.toUpperCase();
      return "(" + query.args.map(subQuery => queryToSql(subQuery, categories)).join(` ${joinWord} `) + ")";
    }
    const clause = query as QueryClause;
    let parts: SelectorPart[];
    if (Array.isArray(clause.selector)) {
      parts = clause.selector.slice();
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
      let newClause = clause;
      if (categories.has(field as string)) {
        newClause = mapCategories(categories, field as string, clause);
      }
      const sqlCol = `${prefix}_inner.${field}`;
      return mapOperatorToSql(newClause, sqlCol);
    }
    if (parts.length === 3) {
      const prefix = parts[1] === "CSQ" ? "c_inner" : parts[0] === "s" ? "f_inner" : parts[0] + "_inner";
      const field = parts[2];
      let newClause = clause;
      if (categories.has(field as string)) {
        newClause = mapCategories(categories, field as string, clause);
      }
      const sqlCol = `${prefix}.${field}`;
      let where = mapOperatorToSql(newClause, sqlCol);
      if(parts[0] === "s" && parts[1] !== "*") {
        where = `(${where} AND ${prefix}.sample_id = ${parts[1]})`
      }
      return where;
    }
    throw new Error("Can't convert selector to flat SQL: " + JSON.stringify(parts));
  }

  // 4. Gather tables referenced
  const tables = usedTables(query);
  let joins = "vcf v_inner";
  if (tables.has("s")) joins += " JOIN format f_inner ON f_inner.variant_id = v_inner.id";
  if (tables.has("c")) joins += " JOIN variant_CSQ c_inner ON c_inner.variant_id = v_inner.id";
  if (tables.has("n")) joins += " JOIN info n_inner ON n_inner.variant_id = v_inner.id";

  // 5. Build only-CSQ WHERE portion for main join
  const csqQuery = extractCSQQuery(query);
  let csqFilter = "";
  if (csqQuery) {
    // Use queryToSql but adapt alias for the main query (c. instead of c_inner.)
    csqFilter = "AND " + queryToSql(csqQuery, categories)
        .replace(/c_inner\./g, "c.")
        .replace(/CSQ_inner\./g, "CSQ."); // In case other variations
  }

  // 6. Return WHERE clause for use in outer SELECT
  return `
v.id IN (
  SELECT v_inner.id
  FROM ${joins}
  WHERE ${queryToSql(query, categories)}
)
${csqFilter}`.trim();
}

function mapOperatorToSql(clause: QueryClause, sqlCol: string): string {
  // Helper for proper escaping/list creation, assumed defined elsewhere
  const {args, operator} = clause;

  // Handle NULL/no args
  if (args === null || args === undefined) {
    switch (operator) {
      case "==":
        return `${sqlCol} IS NULL`;
      case "!=":
        return `${sqlCol} IS NOT NULL`;
      default:
        throw new Error("Unsupported op: " + operator + " for NULL arg");
    }
  }

  if ((operator === "in" || operator === "!in") && Array.isArray(args)) {
    const nonNulls = args.filter(v => v !== null && v !== undefined);
    const hasNull = args.some(v => v === null || v === undefined);

    // Compose value list for SQL
    let sqlFrag = "";
    if (nonNulls.length > 0) {
      const valueList = toSqlList(nonNulls);
      const existsClause = `
        EXISTS (
          SELECT 1
          FROM json_each(${sqlCol})
          WHERE CAST(json_each.value as TEXT) IN (${valueList})
        )
      `;
      sqlFrag = operator === "in"
          ? existsClause
          : `NOT ${existsClause}`;
    }

    // NULL handling for the array column itself
    if (hasNull) {
      const nullCheck = operator === "in"
          ? `${sqlCol} IS NULL`
          : `${sqlCol} IS NOT NULL`;
      if (sqlFrag.trim()) {
        sqlFrag = operator === "in"
            ? `(${sqlFrag} OR ${nullCheck})`
            : `(${sqlFrag} AND ${nullCheck})`;
      } else {
        sqlFrag = nullCheck;
      }
    }
    return sqlFrag;
  }

  // Scalar cases
  switch (operator) {
    case "==":
      return `${sqlCol} = ${sqlEscape(args)}`;
    case "!=":
      return `${sqlCol} != ${sqlEscape(args)}`;
    case ">":
      return `${sqlCol} > ${sqlEscape(args)}`;
    case ">=":
      return `${sqlCol} >= ${sqlEscape(args)}`;
    case "<":
      return `${sqlCol} < ${sqlEscape(args)}`;
    case "<=":
      return `${sqlCol} <= ${sqlEscape(args)}`;
    default:
      throw new Error("Unsupported op: " + operator);
  }
}

export function simpleQueryToSql(query: Query, categories: Categories): string {
  if ("args" in query && Array.isArray(query.args) && (query.operator === "and" || query.operator === "or")) {
    const joinWord = query.operator.toUpperCase();
    return "(" + query.args.map(subQuery => simpleQueryToSql(subQuery ,categories)).join(` ${joinWord} `) + ")";
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
  else if (parts.length === 2) {
    const prefix = parts[0];
    const field = parts[1];
    if(categories.has(field as string)) {
      //FIXME: Error on unmappable categories
      const fieldCategories: FieldCategories = categories.get(field as string) as FieldCategories;
      if (Array.isArray(clause.args)) {
        const newArgs: number[] = [];
        for(const [number, category] of fieldCategories.entries()){
          for(const argument of clause.args) {
            if (category === argument) {
              newArgs.push(number);
            }
          }
        }
        clause.args = newArgs;
      }else{
        for(const [number, category] of fieldCategories.entries()){
          if(category === clause.args) {
            clause.args = number;
          }
        }
      }
    }
    const sqlCol = `${prefix}.${field}`;
    return mapOperatorToSql(clause, sqlCol);
  }

  throw new Error("Unsupported query:" + JSON.stringify(parts));
}

export function getColumnNames(db: Database, table: string): string[] {
  const rows = executeSql(db, `PRAGMA table_info(${table});`);
  return rows
      .map((row) => row.name as string);
}
