import { Query, QueryClause, SelectorPart } from "./index";
import { FieldMetadata, VcfMetadata } from "@molgenis/vip-report-vcf";

function validate(fieldMeta: FieldMetadata, clause: QueryClause) {
  switch (clause.operator) {
    case "==":
    case "~=":
    case "!=":
      if (!Array.isArray(clause.args)) {
        if (fieldMeta.type === "INTEGER" || fieldMeta.type === "FLOAT") {
          validateNumber(clause);
        } else if (fieldMeta.type === "FLAG") {
          validateFlag(clause);
        } else {
          validateString(clause);
        }
      }
      break;
    case ">":
    case ">=":
    case "<":
    case "<=":
      if (fieldMeta.type === "INTEGER" || fieldMeta.type === "FLOAT") {
        validateNumber(clause);
      } else {
        throw new Error(`Numerical operators are not allowed for values of type 'string'`);
      }
      break;
    case "in":
    case "!in":
      validateArray(clause);
      break;
  }
}

function validateString(clause: QueryClause) {
  if (typeof clause.args !== "string") {
    throw new Error(`Argument '${clause.args}' is of type '${typeof clause.args}' instead of string.`);
  }
}

function validateFlag(clause: QueryClause) {
  if (clause.args !== "1" && clause.args !== "0") {
    throw new Error(`Argument for a field of type 'FLAG' can only be '1' or '0'.`);
  }
}

function validateNumber(clause: QueryClause) {
  if (typeof clause.args !== "number") {
    throw new Error(`Argument '${clause.args}' is of type '${typeof clause.args}' instead of number.`);
  }
}

function validateArray(clause: QueryClause) {
  if (!Array.isArray(clause.args)) {
    throw new Error(`Argument '${clause.args}' is of type '${typeof clause.args}' instead of array.`);
  }
}

export function validateQuery(meta: VcfMetadata, query: Query | undefined) {
  if (query === undefined || query.args === null || query.args === undefined) return;
  if (
    query &&
    typeof query === "object" &&
    "args" in query &&
    Array.isArray(query.args) &&
    (query.operator === "and" || query.operator === "or")
  ) {
    for (const subQuery of query.args) {
      validateQuery(meta, subQuery);
    }
  } else {
    const clause = query as QueryClause;
    let parts: SelectorPart[];
    if (Array.isArray(clause.selector)) {
      parts = clause.selector.slice();
    } else {
      parts = [clause.selector];
    }
    if (parts.length === 1) {
      switch (parts[0]) {
        case "c":
        case "i":
        case "r":
          if (clause.operator == "in" || clause.operator == "!in") {
            validateArray(clause);
          } else {
            validateString(clause);
          }
          break;
        case "p":
        case "q":
          if (clause.operator == "in" || clause.operator == "!in") {
            validateArray(clause);
          } else {
            validateNumber(clause);
          }
          break;
        case "a":
        case "f":
          validateArray(clause);
          break;
        default:
          throw new Error(`Unknown field: ${parts[0]}`);
      }
    } else if (!(parts.length === 3 && parts[0] === "s" && parts[2] === "GT_type")) {
      const fieldMeta = getFieldFromSelector(parts, meta);
      validate(fieldMeta, clause);
    }
  }

  function getFieldFromSelector(parts: SelectorPart[], meta: VcfMetadata): FieldMetadata {
    let fieldMeta;
    if (parts.length === 2) {
      if ((parts[0] as string) === "n") {
        const field = parts[1] as SelectorPart;
        fieldMeta = meta.info[field];
      } else if ((parts[0] as string) === "s") {
        throw new Error(`Format fields should have 3 parts: s, sampleId or * and field, got: ${parts}`);
      }
    }
    if (parts.length === 3) {
      if (parts[0] === "s") {
        const field = parts[2] as SelectorPart;
        fieldMeta = meta.format[field];
      } else {
        const parent = parts[1] as SelectorPart;
        const parentMeta = meta.info[parent];
        if (parentMeta === undefined) {
          throw new Error(`Unknown parent field in selector: '${parts}'`);
        }
        let field = parts[2] as SelectorPart;
        if (field === "_GT_type") {
          field = "gtType";
        }
        fieldMeta = parentMeta.nested?.items
          ? Object.values(parentMeta.nested.items).find((fm) => fm.id === field)
          : undefined;
      }
    }
    if (fieldMeta === undefined) {
      throw new Error(`Unknown field in selector: '${parts}'`);
    }
    return fieldMeta;
  }
}
