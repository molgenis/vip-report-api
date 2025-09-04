import { ReportData } from "./index";
import { ApiClient } from "./apiClient";

export type EncodedReport = ReportData & {
  base85?: EncodedReportData;
};

export type EncodedReportData = {
  fastaGz?: { [key: string]: string };
  genesGz?: string;
  cram?: { [key: string]: { cram: string; crai: string } };
};

declare global {
  interface Window {
    api: EncodedReport;
  }
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
    super(reportData);
  }
}
