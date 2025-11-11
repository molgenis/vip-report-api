import type { InfoOrder, VcfMetadata, VcfRecord } from "@molgenis/vip-report-vcf";
import { mapRows } from "./recordMapper";

import { AppMetadata, DecisionTree, HtsFileMetadata, Json, Query, Sample, SortOrder } from "./index";
import {
  complexQueryToSql,
  executeSql,
  getColumns,
  getNestedJoins,
  getNestedTables,
  getPagingQuery,
  getSimpleSortClauses,
  getSortClauses,
  simpleQueryToSql,
  toSqlList,
} from "./sqlUtils";
import { mapSample, mapSamples } from "./sampleMapper";
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
import { mapSqlRowsToVcfMetadata } from "./MetadataMapper";

export class ReportDatabase {
  // lazy loaded and cached
  private _meta: VcfMetadata | undefined;
  private _categories: Categories | undefined;

  constructor(private readonly db: Database) {}

  getMetadata(): VcfMetadata {
    if (this._meta === undefined) {
      this._meta = this.loadMetadata();
    }
    return this._meta;
  }

  loadDecisionTree(id: string): DecisionTree | null {
    const sql = "SELECT tree from decisiontree WHERE id = :id";
    const rows = executeSql(this.db, sql, { ":id": id });
    if (rows.length < 1 || rows[0] === undefined) return null;
    return JSON.parse(rows[0]["tree"] as string);
  }

  loadInfoOrder(): InfoOrder {
    const sql =
      "SELECT infoOrder.variantId, metadata.name, infoOrder.infoIndex " +
      "FROM infoOrder " +
      "JOIN metadata ON infoOrder.metadataId = metadata.id ";
    const rows = executeSql(this.db, sql, {});
    const variantInfoOrder: InfoOrder = {};

    for (const row of rows) {
      const variantId = row.variantId as string;
      if (variantInfoOrder[variantId] === undefined) {
        variantInfoOrder[variantId] = new Map<string, number>();
      }
      variantInfoOrder[variantId].set(row.fieldname as string, Number(row.info_order));
    }
    return variantInfoOrder;
  }

  loadAppMetadata(): AppMetadata {
    const sql = `SELECT *
                 from appMetadata`;
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
    const sql = `SELECT sample.sampleIndex,
                        sample.familyId,
                        sample.individualId,
                        paternal.individualId AS paternalId,
                        maternal.individualId AS maternalId,
                        sex.value             AS sex,
                        affectedStatus.value  AS affectedStatus,
                        sample.proband
                 FROM sample
                        LEFT JOIN sample paternal ON sample.paternalId = paternal.sampleIndex
                        LEFT JOIN sample maternal ON sample.maternalId = maternal.sampleIndex
                        LEFT JOIN sex ON sample.sex = sex.id
                        LEFT JOIN affectedStatus ON sample.affectedStatus = affectedStatus.id
                 WHERE sample.sampleIndex = :id`;
    const rows = executeSql(this.db, sql, { ":id": id });
    if (rows.length < 1 || rows[0] === undefined) throw new Error("Could not find sample with id: " + id);
    return mapSample(rows[0]).data;
  }

  loadConfig(): Json {
    const sql = `SELECT *
                 from config`;
    const rows = executeSql(this.db, sql, {});
    if (rows.length < 1 || rows[0] === undefined) return null;
    return Object.fromEntries(rows.map((row) => [row.id, JSON.parse(row.value as string)]));
  }

  loadSamples(
    page: number,
    size: number,
    sort: SortOrder | SortOrder[] | undefined,
    query: Query | undefined,
  ): DatabaseSample[] {
    const { partialStatement, values } =
      query !== undefined ? simpleQueryToSql(query, {}) : { partialStatement: "", values: {} };
    const whereClause = query !== undefined ? `WHERE ${partialStatement}` : "";
    const sortOrders = Array.isArray(sort) ? sort : sort ? [sort] : [];
    const orderByClauses = getSimpleSortClauses(sortOrders);
    const selectClause = `SELECT sample.sampleIndex,
                                 sample.familyId,
                                 sample.individualId,
                                 paternal.individualId AS paternalId,
                                 maternal.individualId AS maternalId,
                                 sex.value             AS sex,
                                 affectedStatus.value  AS affectedStatus,
                                 sample.proband
                          FROM sample
                                 LEFT JOIN sample paternal ON sample.paternalId = paternal.sampleIndex
                                 LEFT JOIN sample maternal ON sample.maternalId = maternal.sampleIndex
                                 LEFT JOIN sex ON sample.sex = sex.id
                                 LEFT JOIN affectedStatus ON sample.affectedStatus = affectedStatus.id`;
    const orderClause = `${orderByClauses.length ? "ORDER BY " + orderByClauses.join(", ") : ""}`;
    const pagingSql = page !== -1 && size !== -1 ? ` LIMIT ${size} OFFSET ${page * size}` : ``;
    const sql = `${selectClause} ${whereClause} ${orderClause} ${pagingSql}`;
    const rows = executeSql(this.db, sql, values);
    return mapSamples(rows);
  }

  loadPhenotypes(page: number, size: number, query: Query | undefined): DatabaseResource[] {
    const { partialStatement, values } =
      query !== undefined ? simpleQueryToSql(query, {}) : { partialStatement: "", values: {} };
    const whereClause = query !== undefined ? `WHERE ${partialStatement}` : "";

    const sql = `
      SELECT sp.sampleIndex, phenotype.id AS phenotypeId, phenotype.label AS phenotypeLabel
      FROM samplePhenotype sp
             JOIN phenotype ON sp.phenotypeId = phenotype.id
             JOIN sample ON sp.sampleIndex = sample.sampleIndex ${whereClause}
            LIMIT ${size}
      OFFSET ${page * size}
    `;
    const rows = executeSql(this.db, sql, values);
    const grouped: Record<number, { id: string; label: string }[]> = {};
    for (const row of rows) {
      const sampleIndex = row.sampleIndex as number;
      grouped[sampleIndex] ??= [];
      if (grouped[row.sampleIndex as number]) {
        grouped[sampleIndex].push({ id: row.phenotypeId as string, label: row.phenotypeLabel as string });
      }
    }

    return Object.entries(grouped).map(([sampleIndex, features]) => ({
      id: Number(sampleIndex),
      data: {
        subject: { id: sampleIndex },
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
      sampleIds !== undefined && sampleIds.length > 0 ? `WHERE sampleIndex in (${toSqlList(sampleIds)})` : "";
    const columns = getColumns(this.db as Database, nestedTables, sampleIds !== undefined);
    const sortOrders = Array.isArray(sort) ? sort : sort ? [sort] : [];
    const selectCols = [
      "v.id as v_variantId",
      "contig.value as chrom",
      "v.pos",
      "v.idVcf",
      "v.ref",
      "v.alt",
      "v.qual",
      "v.filter",
      "formatLookup.value as format",
      ...columns,
    ];
    const { orderByClauses, distinctOrderByClauses, orderCols } = getSortClauses(sortOrders, nestedTables);
    const nestedJoins = getNestedJoins(nestedTables);

    const sql = `
      SELECT DISTINCT ${selectCols}
      FROM (${getPagingQuery(orderCols, sampleIds !== undefined, sampleJoinQuery, nestedJoins, whereClause, distinctOrderByClauses, size, page)}) v
             LEFT JOIN info n ON n.variantId = v.id
             LEFT JOIN contig contig ON contig.id = v.chrom
             LEFT JOIN formatLookup ON formatLookup.id = v.format
        ${nestedJoins} ${sampleIds !== undefined ? `LEFT JOIN (SELECT * FROM format ${sampleJoinQuery}) f ON f.variantId = v.id` : ""}
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
      SELECT COUNT(DISTINCT v.id) AS count, 
      v.id as v_variantId,
      (SELECT COUNT(*) FROM vcf) AS total_size
      FROM
        (SELECT * FROM vcf) v
        LEFT JOIN info n
      ON n.variantId = v.id
        ${nestedJoins}
        LEFT JOIN format f ON f.variantId = v.id
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
      nestedJoins += ` LEFT JOIN variant_${nestedTable} ${nestedTable} ON ${nestedTable}.variantId = v.id`;
    }

    const sampleJoinQuery =
      sampleIds !== undefined && sampleIds.length > 0 ? `WHERE sampleIndex in (${toSqlList(sampleIds)})` : "";
    const columns = getColumns(this.db, nestedTables, sampleIds !== undefined);

    const selectCols = [
      "v.id as v_variantId",
      "contig.value as chrom",
      "v.pos",
      "v.idVcf",
      "v.ref",
      "v.alt",
      "v.qual",
      "v.filter",
      "formatLookup.value as format",
      ...columns,
    ];
    const sql = `
      SELECT ${selectCols}
      FROM (SELECT * FROM vcf) v
             LEFT JOIN info n ON n.variantId = v.id
             LEFT JOIN contig ON contig.id = v.chrom
             LEFT JOIN formatLookup ON formatLookup.id = v.format
        ${sampleIds !== undefined ? `LEFT JOIN (SELECT * FROM format ${sampleJoinQuery}) f ON f.variantId = v.id` : ""} ${nestedJoins}
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
    if (this._categories === undefined) {
      this._categories = this.loadCategories();
    }
    return this._categories;
  }

  countMatchingSamples(query: Query | undefined): TableSize {
    const { partialStatement, values } =
      query !== undefined ? simpleQueryToSql(query, {}) : { partialStatement: "", values: {} };
    const whereClause = query !== undefined ? `WHERE ${partialStatement}` : "";
    const sql = `SELECT (SELECT COUNT(*) FROM sample) AS total_size,
                        COUNT(DISTINCT sampleIndex) AS count
                 from sample ${whereClause}`;
    const rows = executeSql(this.db, sql, values);
    if (!rows || rows.length === 0 || rows[0] === undefined) return { size: 0, totalSize: 0 };
    return { size: (rows[0]["count"] ?? 0) as number, totalSize: (rows[0]["total_size"] ?? 0) as number };
  }

  countMatchingPhenotypes(query: Query | undefined): TableSize {
    const { partialStatement, values } =
      query !== undefined ? simpleQueryToSql(query, {}) : { partialStatement: "", values: {} };
    const whereClause = query !== undefined ? `WHERE ${partialStatement}` : "";
    const sql = `SELECT (SELECT COUNT(*) FROM sample) AS total_size,
                        COUNT(DISTINCT sp.sampleIndex) AS count
                 FROM samplePhenotype sp
                   JOIN phenotype
                 ON sp.phenotypeId = phenotype.id
                   JOIN sample ON sp.sampleIndex = sample.sampleIndex
                   ${whereClause}`;
    const rows = executeSql(this.db, sql, values);
    if (!rows || rows.length === 0 || rows[0] === undefined) return { size: 0, totalSize: 0 };
    return { size: (rows[0]["count"] ?? 0) as number, totalSize: (rows[0]["total_size"] ?? 0) as number };
  }

  private loadMetadata(): VcfMetadata {
    const sql = `SELECT m.id,
                        m.name,
                        ft.value AS fieldType,
                        vt.value AS valueType,
                        nt.value AS numberType,
                        m.numberCount,
                        m.required,
                        m.separator,
                        m.nestedSeparator,
                        m.categories,
                        m.label,
                        m.description,
                        m.parent,
                        m.nested,
                        m.nestedIndex,
                        m.nullValue
                 FROM metadata m
                        LEFT JOIN fieldType ft ON m.fieldType = ft.id
                        LEFT JOIN valueType vt ON m.valueType = vt.id
                        LEFT JOIN numberType nt ON m.numberType = nt.id
                 ORDER BY m.label ASC`; //sort on label since this is what the user sees
    const rows = executeSql(this.db, sql, {});
    const headerSql = "SELECT * FROM header";
    const headerLines = executeSql(this.db, headerSql, {});
    const headers: string[] = [];
    for (const row of headerLines) {
      headers.push(row["line"] as string);
    }
    const samples = this.loadSamples(-1, -1, undefined, undefined);
    const sampleNames: string[] = [];
    for (const row of samples) {
      sampleNames.push(row.data.person.individualId);
    }
    return mapSqlRowsToVcfMetadata(rows, headers, sampleNames);
  }

  private loadCategories(): Categories {
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
    return result;
  }
}
