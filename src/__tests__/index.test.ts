import Api, { Params } from '../index';

let api: Api;
const record0 = {
  c: '1',
  p: 10042538,
  i: ['rs123'],
  r: 'C',
  a: ['T'],
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
      format: []
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

test('get - all records sorted descending on position', async () => {
  const params: Params = {
    sort: 'p',
    desc: true,
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record1, record0],
    page: { number: 0, size: 10, totalElements: 2 },
    total: 32,
  });
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
