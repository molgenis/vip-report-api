import { parseMultiValue, parseSingleValue, parseValue } from '../DataParser';
import { InfoMetadata, NumberMetadata } from '../MetadataParser';

const csqInfoMetadata: InfoMetadata = {
  id: 'CSQ',
  number: { type: 'OTHER', separator: ',' },
  type: 'STRING',
  description: 'Consequence annotations from Ensembl VEP. Format: X|Y',
  nested: {
    separator: '|',
    items: [
      { id: 'X', number: { type: 'NUMBER', count: 1 }, type: 'STRING', description: 'X' },
      {
        id: 'Y',
        number: { type: 'NUMBER', count: 2, separator: '&' },
        type: 'INTEGER',
        description: 'Y'
      }
    ]
  }
};

test('parse single value', () => {
  expect(
    parseSingleValue('12', { id: 'INT', number: { type: 'NUMBER', count: 1 }, type: 'INTEGER', description: 'Integer' })
  ).toBe(12);
});

test('parse single value - nested', () => {
  expect(parseSingleValue('xx|1&2', csqInfoMetadata)).toStrictEqual(['xx', [1, 2]]);
});

test('parse multiple value', () => {
  expect(
    parseMultiValue('1&2', {
      id: 'INT',
      number: { type: 'OTHER', separator: '&' },
      type: 'INTEGER',
      description: 'Integers'
    })
  ).toStrictEqual([1, 2]);
});

test('parse multiple value - nested', () => {
  expect(parseMultiValue('xx|1&2,yy|3&4', csqInfoMetadata)).toStrictEqual([
    ['xx', [1, 2]],
    ['yy', [3, 4]]
  ]);
});

test('parse multiple value with escaped chars - nested', () => {
  expect(parseMultiValue('xx|1&2,y%2Cy|3&4', csqInfoMetadata)).toStrictEqual([
    ['xx', [1, 2]],
    ['y,y', [3, 4]]
  ]);
});

test('parse value - number', () => {
  expect(
    parseValue('12', {
      id: 'INT',
      number: { type: 'NUMBER', count: 1 },
      type: 'INTEGER',
      description: 'Integer'
    })
  ).toBe(12);
});

test('parse value - number multiple', () => {
  expect(
    parseValue('1,2', {
      id: 'INT',
      number: { type: 'NUMBER', count: 2, separator: ',' },
      type: 'INTEGER',
      description: 'Integer'
    })
  ).toStrictEqual([1, 2]);
});

test('parse value - per alt', () => {
  expect(
    parseValue('1,2', {
      id: 'INT',
      number: { type: 'PER_ALT', separator: ',' },
      type: 'INTEGER',
      description: 'Integer'
    })
  ).toStrictEqual([1, 2]);
});

test('parse value - per alt and ref', () => {
  expect(
    parseValue('1,2', {
      id: 'INT',
      number: { type: 'PER_ALT_AND_REF', separator: ',' },
      type: 'INTEGER',
      description: 'Integer'
    })
  ).toStrictEqual([1, 2]);
});

test('parse value - per genotype', () => {
  expect(
    parseValue('1,2', {
      id: 'INT',
      number: { type: 'PER_GENOTYPE', separator: ',' },
      type: 'INTEGER',
      description: 'Integer'
    })
  ).toStrictEqual([1, 2]);
});

test('parse value - other', () => {
  expect(
    parseValue('', {
      id: 'INT',
      number: { type: 'OTHER', separator: ',' },
      type: 'INTEGER',
      description: 'Integer'
    })
  ).toStrictEqual([]);
});

test('parse value - invalid', () => {
  expect(() =>
    parseValue('', {
      id: 'INT',
      number: { type: 'xx', separator: ',' } as unknown as NumberMetadata,
      type: 'INTEGER',
      description: 'Integer'
    })
  ).toThrow("invalid number type 'xx'");
});
