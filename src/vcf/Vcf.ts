// this is .ts instead of .d.ts file to work around https://github.com/TypeStrong/ts-loader/issues/1036
import { FormatMetadataContainer, Genotype, RecordSample } from './SampleDataParser';
export { FormatMetadataContainer, Genotype, RecordSample };
import {
  FormatMetadata,
  InfoContainer,
  InfoMetadata,
  InfoMetadataContainer,
  NestedInfoMetadata,
  Value
} from './VcfParser';
export { FormatMetadata, InfoContainer, InfoMetadata, InfoMetadataContainer, NestedInfoMetadata, Value };

export interface Metadata {
  info: InfoMetadataContainer;
  format: FormatMetadataContainer;
}

export interface Container {
  metadata: Metadata;
  header: Header;
  data: Record[];
}

export interface Header {
  samples: string[];
}

export interface Record {
  c: string;
  p: number;
  i: string[];
  r: string;
  a: (string | null)[];
  q: number | null;
  f: string[];
  n: InfoContainer;
  s: RecordSample[];
}
