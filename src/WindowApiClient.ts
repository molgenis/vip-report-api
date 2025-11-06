import { ReportData } from "./index";
import { ApiClient } from "./apiClient";
import initSqlJs from "sql.js";
import { ReportDatabase } from "./ReportDatabase";

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

/**
 * {@link ApiClient} factory that uses {@link EncodedReport} data stored in <code>window.api</code> as data source.
 */
export class WindowApiClientFactory {
  static async create(): Promise<ApiClient> {
    const reportData = window.api;
    if (reportData === undefined) {
      alert("This is a report template. Use the vip-report tool to create reports using this template and data.");
    }

    const database = await this.createReportDatabase(reportData);
    return new ApiClient(database, reportData);
  }

  private static async createReportDatabase(reportData: ReportData): Promise<ReportDatabase> {
    // create SQLite application
    const wasmBinary = reportData.wasmBinary;
    if (wasmBinary === undefined) {
      throw new Error("Report data is missing the required 'reportData.wasmBinary'.");
    }
    const SQL = await initSqlJs({ wasmBinary: wasmBinary.buffer as ArrayBuffer });

    // load SQLite database file
    const database = reportData.database;
    if (database === undefined) {
      throw new Error("Report data is missing the required 'reportData.database'.");
    }
    const sqlDatabase = new SQL.Database(database);

    // make available for garbage collection
    delete reportData.wasmBinary;
    delete reportData.database;

    return new ReportDatabase(sqlDatabase);
  }
}
