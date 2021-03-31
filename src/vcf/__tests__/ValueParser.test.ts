import {
  parseCharacterValue,
  parseFlagValue,
  parseFloatValue,
  parseFloatValueNonNull,
  parseIntegerValue,
  parseIntegerValueNonNull,
  parseStringArray,
  parseStringArrayNonNullValues,
  parseStringValue,
  parseStringValueNonNull,
  parseTypedValue
} from '../ValueParser';

test('parse typed value - CHARACTER', () => {
  expect(parseTypedValue('a', 'CHARACTER')).toBe('a');
});

test('parse typed value - STRING', () => {
  expect(parseTypedValue('xx', 'STRING')).toBe('xx');
});

test('parse typed value - INTEGER', () => {
  expect(parseTypedValue('12', 'INTEGER')).toBe(12);
});

test('parse typed value - FLAG', () => {
  expect(parseTypedValue('true', 'FLAG')).toBe(true);
});

test('parse typed value - FLOAT', () => {
  expect(parseTypedValue('1.2', 'FLOAT')).toBeCloseTo(1.2);
});

test('parse typed value - invalid type', () => {
  expect(() => parseTypedValue('xx', 'NESTED')).toThrow("invalid value type 'NESTED'");
});

test('parse character', () => {
  expect(parseCharacterValue('x')).toBe('x');
});

test('parse character - empty string', () => {
  expect(parseCharacterValue('')).toBeNull();
});

test('parse character - missing value', () => {
  expect(parseCharacterValue('.')).toBeNull();
});

test('parse character - multiple characters', () => {
  expect(() => parseCharacterValue('xx')).toThrow("invalid character 'xx'");
});

test('parse string', () => {
  expect(parseStringValue('xx')).toBe('xx');
});

test('parse string - empty string', () => {
  expect(parseStringValue('')).toBeNull();
});

test('parse string - missing value', () => {
  expect(parseStringValue('.')).toBeNull();
});

test('parse string - escape characters', () => {
  expect(parseStringValue('%%3A%3B%3D%25%2C%0D%0A%09%3A')).toBe('%:;=%,\r\n\t:');
});

test('parse string non null - empty string', () => {
  expect(() => parseStringValueNonNull('')).toThrow("invalid string ''");
});

test('parse string non null - missing value', () => {
  expect(() => parseStringValueNonNull('.')).toThrow("invalid string '.'");
});

test('parse string array', () => {
  expect(parseStringArray('x,y', ',')).toStrictEqual(['x', 'y']);
});

test('parse string array - empty string', () => {
  expect(parseStringArray('', ',')).toStrictEqual([]);
});

test('parse string array - missing value', () => {
  expect(parseStringArray('.', ',')).toStrictEqual([]);
});

test('parse string array - missing value element', () => {
  expect(parseStringArray('x;.', ';')).toStrictEqual(['x', null]);
});

test('parse string array non null values - empty string', () => {
  expect(parseStringArrayNonNullValues('', ',')).toStrictEqual([]);
});

test('parse string array non null values - missing value', () => {
  expect(parseStringArrayNonNullValues('.', ',')).toStrictEqual([]);
});

test('parse string array non null values - missing value element', () => {
  expect(() => parseStringArrayNonNullValues('x;.', ';')).toThrow("invalid string '.'");
});

test('parse integer', () => {
  expect(parseIntegerValue('12')).toBe(12);
});

test('parse integer - empty string', () => {
  expect(parseIntegerValue('')).toBeNull();
});

test('parse integer - missing value', () => {
  expect(parseIntegerValue('.')).toBeNull();
});

test('parse integer - positive infinity', () => {
  expect(parseIntegerValue('INF')).toBe(Number.POSITIVE_INFINITY);
});

test('parse integer - positive infinity lowercase', () => {
  expect(parseIntegerValue('infinity')).toBe(Number.POSITIVE_INFINITY);
});

test('parse integer - negative infinity', () => {
  expect(parseIntegerValue('-INF')).toBe(Number.NEGATIVE_INFINITY);
});

test('parse integer - positive infinity lowercase', () => {
  expect(parseIntegerValue('-infinity')).toBe(Number.NEGATIVE_INFINITY);
});

test('parse integer - NaN', () => {
  expect(parseIntegerValue('NaN')).toBe(Number.NaN);
});

test('parse integer - NaN lowercase', () => {
  expect(parseIntegerValue('nan')).toBe(Number.NaN);
});

test('parse integer - invalid value', () => {
  expect(() => parseIntegerValue('xx')).toThrow("invalid integer 'xx'");
});

test('parse integer non null', () => {
  expect(parseIntegerValueNonNull('12')).toBe(12);
});

test('parse integer non null - empty string', () => {
  expect(() => parseIntegerValueNonNull('')).toThrow("invalid integer ''");
});

test('parse integer non null - missing value', () => {
  expect(() => parseIntegerValueNonNull('.')).toThrow("invalid integer '.'");
});

test('parse float', () => {
  expect(parseFloatValue('1.2')).toBeCloseTo(1.2);
});

test('parse float - empty string', () => {
  expect(parseFloatValue('')).toBeNull();
});

test('parse float - missing value', () => {
  expect(parseFloatValue('.')).toBeNull();
});

test('parse float - positive infinity', () => {
  expect(parseFloatValue('INF')).toBe(Number.POSITIVE_INFINITY);
});

test('parse float - positive infinity lowercase', () => {
  expect(parseFloatValue('infinity')).toBe(Number.POSITIVE_INFINITY);
});

test('parse float - negative infinity', () => {
  expect(parseFloatValue('-INF')).toBe(Number.NEGATIVE_INFINITY);
});

test('parse float - positive infinity lowercase', () => {
  expect(parseFloatValue('-infinity')).toBe(Number.NEGATIVE_INFINITY);
});

test('parse float - NaN', () => {
  expect(parseFloatValue('NaN')).toBe(Number.NaN);
});

test('parse float - NaN lowercase', () => {
  expect(parseFloatValue('nan')).toBe(Number.NaN);
});

test('parse float - invalid value', () => {
  expect(() => parseFloatValue('xx')).toThrow("invalid float 'xx'");
});

test('parse float non null', () => {
  expect(parseFloatValueNonNull('1.2')).toBeCloseTo(1.2);
});

test('parse float non null - empty string', () => {
  expect(() => parseFloatValueNonNull('')).toThrow("invalid float ''");
});

test('parse float non null - missing value', () => {
  expect(() => parseFloatValueNonNull('.')).toThrow("invalid float '.'");
});

test('parse flag - true', () => {
  expect(parseFlagValue('true')).toBe(true);
});

test('parse flag - false', () => {
  expect(parseFlagValue('false')).toBe(false);
});

test('parse float - invalid value', () => {
  expect(() => parseFlagValue('xx')).toThrow("invalid flag 'xx'");
});
