import { VcfRecord } from "@molgenis/vip-report-vcf";
import { Resource, Sample } from "./index";
import { ParamsObject } from "sql.js";

export type FieldCategories = Map<number, string>;
export type Categories = Map<string, FieldCategories>;
export type TableSize = { size: number; totalSize: number };
export type SqlRow = { [column: string]: SqlValue };
export type SqlValue = string | number | boolean | null;
export type ArgsValue =
  | string
  | number
  | boolean
  | string[]
  | (string | null)[]
  | number[]
  | (number | null)[]
  | undefined;
export interface DatabaseResource {
  id: number;
  data: Resource;
}
export interface DatabaseRecord extends DatabaseResource {
  data: VcfRecord;
}

export interface DatabaseSample extends DatabaseResource {
  data: Sample;
}

export type PartialStatement = { partialStatement: string; values: ParamsObject };
