import Api, { Params } from '../index';

let api: Api;
const record0 = {
  c: '1',
  p: 10042538,
  i: ['rs123'],
  r: 'C',
  a: ['T'],
  n: {
    n_bool0: true,
    n_bool1: true,
    n_bool2: true,
    n_bool3: false,
    n_bool4: false,
    n_bool5: false,
    n_number0: 0,
    n_number1: 0,
    n_number2: 1,
    n_string0: 'a',
    n_string1: 'a',
    n_string2: 'A',
    n_string3: 'b',
    n_string4: 'b',
    n_array0: [],
    n_object0: { n_object0: { n_string0: 'a' } },
  },
  s: [
    {
      gt: {
        a: ['T', 'C'],
        p: true,
        t: 'het',
      },
    },
    {
      gt: {
        a: ['C', 'C'],
        p: true,
        t: 'hom_r',
      },
    },
    {
      gt: {
        a: ['C', 'C'],
        p: true,
        t: 'hom_r',
      },
    },
  ],
};
const record1 = {
  c: '1',
  p: 16376412,
  r: 'G',
  a: ['A'],
  n: {
    n_bool0: true,
    n_bool1: false,
    n_bool3: true,
    n_bool4: false,
    n_bool6: true,
    n_bool7: false,
    n_number0: 0,
    n_number1: 1,
    n_number2: 0,
    n_string0: 'a',
    n_string1: 'b',
    n_string2: 'b',
    n_string3: 'a',
    n_string4: 'A',
    n_array0: [],
    n_object0: {},
  },
  s: [
    {
      gt: {
        a: ['A', 'G'],
        p: true,
        t: 'het',
      },
    },
    {
      gt: {
        a: ['G', 'A'],
        p: true,
        t: 'het',
      },
    },
    {
      gt: {
        a: ['A', 'G'],
        p: true,
        t: 'het',
      },
    },
  ],
};

const sortAllExpected = {
  page: { number: 0, size: 10, totalElements: 2 },
  total: 32,
};

beforeEach(() => {
  const reportData = {
    metadata: {
      app: {
        name: 'vcf-report',
        version: '0.0.1',
        args: '-i test.vcf -d',
      },
      htsFile: {
        htsFormat: 'VCF',
        uri: 'file://file0.vcf.gz',
        genomeAssembly: 'GRCh38',
      },
      records: {
        info: [],
        format: [],
      },
    },
    data: {
      samples: {
        items: [
          {
            name: 'Patient',
          },
          {
            name: 'Mother',
          },
          {
            name: 'Father',
          },
        ],
        total: 3,
      },
      records: {
        items: [record0, record1],
        total: 32,
      },
      phenotypes: {
        items: [],
        total: 0,
      },
    },
  };
  api = new Api(reportData);
});

test('getMeta', async () => {
  const metadata = await api.getMeta();
  expect(metadata).toEqual({
    app: {
      name: 'vcf-report',
      version: '0.0.1',
      args: '-i test.vcf -d',
    },
    htsFile: {
      htsFormat: 'VCF',
      uri: 'file://file0.vcf.gz',
      genomeAssembly: 'GRCh38',
    },
    records: {
      info: [],
      format: [],
    },
  });
});

test('get - all samples', async () => {
  const samples = await api.getSamples();
  expect(samples).toEqual({
    items: [{ name: 'Patient' }, { name: 'Mother' }, { name: 'Father' }],
    page: { number: 0, size: 10, totalElements: 3 },
    total: 3,
  });
});

test('get - all records', async () => {
  const records = await api.getRecords();
  expect(records).toEqual({
    items: [record0, record1],
    page: { number: 0, size: 10, totalElements: 2 },
    total: 32,
  });
});

test('get - page of records', async () => {
  const params: Params = {
    page: 1,
    size: 1,
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record1],
    page: { number: 1, size: 1, totalElements: 2 },
    total: 32,
  });
});

test('get - one record', async () => {
  const params: Params = {
    query: {
      selector: ['p'],
      operator: '==',
      args: 10042538,
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record0],
    page: { number: 0, size: 10, totalElements: 1 },
    total: 32,
  });
});

test('get - one record array', async () => {
  const params: Params = {
    query: {
      selector: ['a', 0],
      operator: '==',
      args: 'T',
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record0],
    page: { number: 0, size: 10, totalElements: 1 },
    total: 32,
  });
});

test('get - one record with invalid selector', async () => {
  const params: Params = {
    query: {
      selector: ['p', 'x', 'y', 'z'],
      operator: '==',
      args: 10042538,
    },
  };
  await expect(api.getRecords(params)).rejects.toThrow("value '10042538' is of type 'number' instead of 'object'");
});

test('get - records with greater than query', async () => {
  const params: Params = {
    query: {
      selector: ['n', 'n_number2'],
      operator: '>',
      args: 0,
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record0],
    page: { number: 0, size: 10, totalElements: 1 },
    total: 32,
  });
});

test('get - records with greater than or equal query', async () => {
  const params: Params = {
    query: {
      selector: ['n', 'n_number2'],
      operator: '>=',
      args: 1,
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record0],
    page: { number: 0, size: 10, totalElements: 1 },
    total: 32,
  });
});

test('get - records with less than query', async () => {
  const params: Params = {
    query: {
      selector: ['n', 'n_number2'],
      operator: '<',
      args: 1,
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record1],
    page: { number: 0, size: 10, totalElements: 1 },
    total: 32,
  });
});

test('get - records with less than or equal query', async () => {
  const params: Params = {
    query: {
      selector: ['n', 'n_number2'],
      operator: '<=',
      args: 1,
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record0, record1],
    page: { number: 0, size: 10, totalElements: 2 },
    total: 32,
  });
});

test('get - one record with invalid selector', async () => {
  const params: Params = {
    query: {
      selector: ['p', 'x', 'y', 'z'],
      operator: '==',
      args: 10042538,
    },
  };
  await expect(api.getRecords(params)).rejects.toThrow("value '10042538' is of type 'number' instead of 'object'");
});

test('get - one record with invalid selector', async () => {
  const params: Params = {
    query: {
      selector: ['p', 'x', 'y', 'z'],
      operator: '==',
      args: 10042538,
    },
  };
  await expect(api.getRecords(params)).rejects.toThrow("value '10042538' is of type 'number' instead of 'object'");
});

test('get - one record with invalid selector', async () => {
  const params: Params = {
    query: {
      selector: ['p', 'x', 'y', 'z'],
      operator: '==',
      args: 10042538,
    },
  };
  await expect(api.getRecords(params)).rejects.toThrow("value '10042538' is of type 'number' instead of 'object'");
});

test('get - one record using composed and query', async () => {
  const params: Params = {
    query: {
      operator: 'and',
      args: [
        {
          selector: 'c',
          operator: '==',
          args: '1',
        },
        {
          selector: 'p',
          operator: '==',
          args: 10042538,
        },
      ],
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record0],
    page: { number: 0, size: 10, totalElements: 1 },
    total: 32,
  });
});

test('get - all records sorted on n.n_bool0', async () => {
  const params: Params = {
    sort: { property: ['n', 'n_bool0'] },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test('get - all records sorted on n.n_bool1', async () => {
  const params: Params = {
    sort: { property: ['n', 'n_bool1'] },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test('get - all records sorted on n.n_bool2', async () => {
  const params: Params = {
    sort: { property: ['n', 'n_bool2'] },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test('get - all records sorted on n.n_bool3', async () => {
  const params: Params = {
    sort: { property: ['n', 'n_bool3'] },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record1, record0] } });
});

test('get - all records sorted on n.n_bool4', async () => {
  const params: Params = {
    sort: { property: ['n', 'n_bool4'] },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test('get - all records sorted on n.n_bool5', async () => {
  const params: Params = {
    sort: { property: ['n', 'n_bool5'] },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test('get - all records sorted on n.n_bool6', async () => {
  const params: Params = {
    sort: { property: ['n', 'n_bool6'] },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record1, record0] } });
});

test('get - all records sorted on n.n_bool7', async () => {
  const params: Params = {
    sort: { property: ['n', 'n_bool7'] },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record1, record0] } });
});

test('get - all records sorted on n.n_bool8', async () => {
  const params: Params = {
    sort: { property: ['n', 'n_bool8'] },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test('get - all records sorted on n.n_number0', async () => {
  const params: Params = {
    sort: { property: ['n', 'n_number0'] },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test('get - all records sorted on n.n_number1', async () => {
  const params: Params = {
    sort: { property: ['n', 'n_number1'] },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test('get - all records sorted on n.n_number2', async () => {
  const params: Params = {
    sort: { property: ['n', 'n_number2'] },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record1, record0] } });
});

test('get - all records sorted on n.n_string0', async () => {
  const params: Params = {
    sort: { property: ['n', 'n_string0'] },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test('get - all records sorted on n.n_string1', async () => {
  const params: Params = {
    sort: { property: ['n', 'n_string1'] },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test('get - all records sorted on n.n_string2', async () => {
  const params: Params = {
    sort: { property: ['n', 'n_string2'] },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test('get - all records sorted on n.n_string3', async () => {
  const params: Params = {
    sort: { property: ['n', 'n_string3'] },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record1, record0] } });
});

test('get - all records sorted on n.n_string4', async () => {
  const params: Params = {
    sort: { property: ['n', 'n_string4'] },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record1, record0] } });
});

test('get - all records sorted on n.n_array0 throws an error', async () => {
  const params: Params = {
    sort: { property: ['n', 'n_array0'] },
  };
  // note: [] is an object
  await expect(api.getRecords(params)).rejects.toThrow(
    "can't compare values of type 'object'. consider providing a custom compare function."
  );
});

test('get - all records sorted on n.n_object0 throws an error', async () => {
  const params: Params = {
    sort: { property: ['n', 'n_object0'] },
  };
  await expect(api.getRecords(params)).rejects.toThrow(
    "can't compare values of type 'object'. consider providing a custom compare function."
  );
});

test('get - all records sorted on n.n_object0.n_object0_object0.n_object0_string0', async () => {
  const params: Params = {
    sort: { property: ['n', 'n_object0', 'n_object0_object0', 'n_object0_object0_string0'] },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test('get - all records sorted on n.n_array0 throws an error for invalid path', async () => {
  const params: Params = {
    sort: { property: ['n', 'n_array0', 'invalid'] },
  };
  await expect(api.getRecords(params)).rejects.toThrow('invalid path n,n_array0,invalid');
});

test('get - all records sorted ascending on position implicitly', async () => {
  const params: Params = {
    sort: { property: 'p' },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test('get - all records sorted ascending on position', async () => {
  const params: Params = {
    sort: { property: 'p', compare: 'asc' },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test('get - all records sorted descending on position', async () => {
  const params: Params = {
    sort: { property: 'p', compare: 'desc' },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record1, record0] } });
});

test('get - all records sorted ascending on reference', async () => {
  const params: Params = {
    sort: { property: 'r', compare: 'asc' },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test('get - all records sorted descending on reference', async () => {
  const params: Params = {
    sort: { property: 'r', compare: 'desc' },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record1, record0] } });
});

test('get - all records sorted custom on identifier', async () => {
  const params: Params = {
    sort: {
      property: 'i',
      compare: function (a: any, b: any) {
        if (a === null || a.length === 0) {
          return b === null || b.length === 0 ? 0 : 1;
        } else {
          return b === null || b.length === 0 ? -1 : a[0].localeCompare(b[0]);
        }
      },
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test('get - not one record', async () => {
  const params: Params = {
    query: {
      selector: ['p'],
      operator: '!=',
      args: 16376412,
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record0],
    page: { number: 0, size: 10, totalElements: 1 },
    total: 32,
  });
});

test('get - some records', async () => {
  const params: Params = {
    query: {
      selector: ['p'],
      operator: 'in',
      args: [10042537, 10042538, 10042539],
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record0],
    page: { number: 0, size: 10, totalElements: 1 },
    total: 32,
  });
});

test('get - some records with invalid selector', async () => {
  const params: Params = {
    query: {
      selector: ['p', 'x', 'y', 'z'],
      operator: 'in',
      args: [10042537, 10042538, 10042539],
    },
  };
  await expect(api.getRecords(params)).rejects.toThrow("value '10042538' is of type 'number' instead of 'object'");
});

test('get - some records using wildcard selector part with has_any', async () => {
  const params: Params = {
    query: {
      selector: ['s', '*', 'gt', 't'],
      operator: 'has_any',
      args: ['hom_a', 'hom_r'],
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record0],
    page: { number: 0, size: 10, totalElements: 1 },
    total: 32,
  });
});

test('get - some records using wildcard selector part with !has_any', async () => {
  const params: Params = {
    query: {
      selector: ['s', '*', 'gt', 't'],
      operator: '!has_any',
      args: ['hom_a', 'hom_r'],
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record1],
    page: { number: 0, size: 10, totalElements: 1 },
    total: 32,
  });
});

test('get - some records using wildcard selector part with any_has_any', async () => {
  const params: Params = {
    query: {
      selector: ['s', '*', 'gt', 'a'],
      operator: 'any_has_any',
      args: ['GG', 'G'],
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record1],
    page: { number: 0, size: 10, totalElements: 1 },
    total: 32,
  });
});

test('get - some records using wildcard selector part with !any_has_any', async () => {
  const params: Params = {
    query: {
      selector: ['s', '*', 'gt', 'a'],
      operator: '!any_has_any',
      args: ['GG', 'G'],
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record0],
    page: { number: 0, size: 10, totalElements: 1 },
    total: 32,
  });
});

test('get - some records using composed query', async () => {
  const params: Params = {
    query: {
      operator: 'or',
      args: [
        {
          selector: 'p',
          operator: '==',
          args: 10042538,
        },
        {
          selector: 'r',
          operator: '==',
          args: 'G',
        },
      ],
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record0, record1],
    page: { number: 0, size: 10, totalElements: 2 },
    total: 32,
  });
});

test('get - not some records', async () => {
  const params: Params = {
    query: {
      selector: ['p'],
      operator: '!in',
      args: [16376411, 16376412, 16376413],
    },
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record0],
    page: { number: 0, size: 10, totalElements: 1 },
    total: 32,
  });
});

test('get - unknown resource', async () => {
  try {
    await api.get('unknown');
  } catch (err) {
    expect(err).toEqual("unknown resource 'unknown'");
  }
});

test('get - all phenotypes', async () => {
  const phenotypes = await api.getPhenotypes();
  expect(phenotypes).toEqual({
    items: [],
    page: { number: 0, size: 10, totalElements: 0 },
    total: 0,
  });
});
