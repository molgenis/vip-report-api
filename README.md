[![Build Status](https://app.travis-ci.com/molgenis/vip-report-api.svg?branch=master)](https://app.travis-ci.com/molgenis/vip-report-api)

# vip-report-api
Report data API for Variant Call Format (VCF) Report templates (see https://github.com/molgenis/vip-report-template).

# Usage
This repository provides an API to query report data:
```ts
export interface Api {
  getRecordsMeta(): Promise<RecordMetadata>;
  getRecords(params: Params): Promise<PagedItems<Record>>;
  getRecordById(id: number): Promise<Item<Record>>;
  getSamples(params: Params): Promise<PagedItems<Sample>>;
  getSampleById(id: number): Promise<Item<Sample>>;
  getPhenotypes(params: Params): Promise<PagedItems<Phenotype>>;
  getFastaGz(contig: string, pos: number): Promise<Uint8Array | null>;
  getGenesGz(): Promise<Uint8Array | null>;
  getBam(sampleId: string): Promise<Uint8Array | null>;
  getHtsFileMetadata(): Promise<HtsFileMetadata>;
  getAppMetadata(): Promise<AppMetadata>;
  getDecisionTree(): Promise<DecisionTree | null>;
}
```
The API can be used through either the ApiClient class or the WindowApiClient class. The ApiClient is backed by an object containing all report data whereas the WindowApiClient is backed by window.api.
```ts
import { ApiClient } from './ApiClient';
import { Api } from './Api';

const reportData = { ... };
const apiClient: Api = new ApiClient();
```
```ts
import { WindowApiClient } from './WindowApiClient';
import { Api } from './Api';

const apiClient: Api = WindowApiClient(); 
```
