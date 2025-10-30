import { ReportData } from "./index";
import { ApiClient } from "./apiClient";
import initSqlJs, { Database } from "sql.js";

export type EncodedReport = ReportData & {
  base85?: EncodedReportData;
};

export type EncodedReportData = {
  fastaGz?: { [key: string]: string };
  genesGz?: string;
  cram?: { [key: string]: { cram: string; crai: string } };
  wasmBinary: string;
};

declare global {
  interface Window {
    api: EncodedReport;
  }
}

async function createDatabase(wasmBinaryBytes: Uint8Array, database: Uint8Array): Promise<Database> {
  const wasmBinary = wasmBinaryBytes.buffer as ArrayBuffer;
  const SQL = await initSqlJs({ wasmBinary });
  return new SQL.Database(database);
}

/**
 * API client that uses window.api object as data source.
 */
export class WindowApiClient extends ApiClient {
  constructor() {
    const reportData = window.api;
    if (reportData === undefined) {
      alert("This is a report template. Use the vip-report tool to create reports using this template and data.");
    }
    if (reportData.binary.wasmBinary === undefined) {
      throw new Error("Reportdata is missing the required 'reportData.binary.wasmBinary'.");
    }
    if (reportData.database === undefined) {
      throw new Error("Reportdata is missing the required 'reportData.database'.");
    }
    const wasmBinary = reportData.binary.wasmBinary;
    const database = reportData.database;
    super(reportData, createDatabase(wasmBinary, database));
    delete reportData.binary.wasmBinary;
    delete reportData.database;
  }
}
