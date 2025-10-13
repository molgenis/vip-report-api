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
