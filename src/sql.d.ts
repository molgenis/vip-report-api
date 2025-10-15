import { VcfRecord } from "@molgenis/vip-report-vcf";
import { Phenotype, Resource, Sample } from "./index";

export type FieldCategories = Map<number, string>;
export type Categories = Map<string, FieldCategories>;
export type TableSize = { size: number; totalSize: number };
export type SqlRow = { [column: string]: string | number | boolean | null | undefined };
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
  id: number;
  data: VcfRecord;
}

export interface DatabaseSample extends DatabaseResource {
  id: number;
  data: Sample;
}

export interface DatabasePhenotype extends DatabaseResource {
  id: number;
  data: Phenotype;
}
