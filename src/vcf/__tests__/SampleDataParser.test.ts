import { determineGenotypeType, parseFormatValue, parseGenotype, parseRecordSample } from '../SampleDataParser';
import { FormatMetadata } from '../MetadataParser';

test('determine genotype type - miss single', () => {
  expect(determineGenotypeType([null])).toBe('miss');
});

test('determine genotype type - miss multiple', () => {
  expect(determineGenotypeType([null, null])).toBe('miss');
});

test('determine genotype type - part', () => {
  expect(determineGenotypeType([0, null])).toBe('part');
});

test('determine genotype type - homozygous reference single', () => {
  expect(determineGenotypeType([0])).toBe('hom_r');
});

test('determine genotype type - homozygous reference multiple', () => {
  expect(determineGenotypeType([0, 0])).toBe('hom_r');
});

test('determine genotype type - homozygous alternate single', () => {
  expect(determineGenotypeType([2])).toBe('hom_a');
});

test('determine genotype type - homozygous alternate multiple', () => {
  expect(determineGenotypeType([2, 2])).toBe('hom_a');
});

test('determine genotype type - heterozygous two', () => {
  expect(determineGenotypeType([0, 1])).toBe('het');
});

test('determine genotype type - heterozygous three', () => {
  expect(determineGenotypeType([0, 1, 2])).toBe('het');
});

test('parse genotype - single', () => {
  expect(parseGenotype('0')).toStrictEqual({ a: [0], t: 'hom_r' });
});

test('parse genotype - multiple phased', () => {
  expect(parseGenotype('0|1')).toStrictEqual({ a: [0, 1], p: true, t: 'het' });
});

test('parse genotype - multiple unphased', () => {
  expect(parseGenotype('1/1')).toStrictEqual({ a: [1, 1], p: false, t: 'hom_a' });
});

const dpFormatMetadata: FormatMetadata = {
  id: 'DP',
  number: { type: 'NUMBER', count: 1 },
  type: 'INTEGER',
  description: 'Depth'
};

test('parse format value', () => {
  expect(parseFormatValue('5', dpFormatMetadata)).toStrictEqual(5);
});

const gtFormatMetadata: FormatMetadata = {
  id: 'GT',
  number: { type: 'NUMBER', count: 1 },
  type: 'STRING',
  description: 'Genotype'
};

test('parse format value - genotype', () => {
  expect(parseFormatValue('1/.', gtFormatMetadata)).toStrictEqual({ a: [1, null], p: false, t: 'part' });
});

test('parse record sample', () => {
  expect(
    parseRecordSample('0|1:5', ['GT', 'DP'], {
      GT: gtFormatMetadata,
      DP: dpFormatMetadata
    })
  ).toStrictEqual({ GT: { a: [0, 1], p: true, t: 'het' }, DP: 5 });
});

test('parse record sample - drop trailing fields', () => {
  expect(
    parseRecordSample('0|1', ['GT', 'DP'], {
      GT: gtFormatMetadata,
      DP: dpFormatMetadata
    })
  ).toStrictEqual({ GT: { a: [0, 1], p: true, t: 'het' } });
});