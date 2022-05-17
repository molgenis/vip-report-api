import { parseVcf } from "@molgenis/vip-report-vcf/src/VcfParser";
import { ApiClient, ReportData } from "./ApiClient";

export type EncodedReport = ReportData & {
  base85?: EncodedReportData;
};

export type EncodedReportData = {
  vcfGz: string;
  fastaGz?: { [key: string]: string };
  genesGz?: string;
  bam?: { [key: string]: string };
  decisionTreeGz?: string;
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
    const vcf = parseVcf(new TextDecoder().decode(reportData.binary.vcf));
    reportData.metadata.records = vcf.metadata;
    reportData.data.records = vcf.data;
    delete reportData.binary.vcf;
    super(reportData);
  }
}
