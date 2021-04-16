import { parseVcf } from '../VcfParser';

// trailing info semi-colon placed on purpose
const vcf = `
##fileformat=VCFv4.2
##INFO=<ID=DP,Number=1,Type=Integer,Description="Total Depth">
##INFO=<ID=H2,Number=0,Type=Flag,Description="HapMap2 membership">
##FORMAT=<ID=GT,Number=1,Type=String,Description="Genotype">
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tS0
1\t12\t.\tC\tT\t.\tPASS\tDP=2;H2;\tGT\t0/1
`;

test('parse vcf', () => {
  expect(parseVcf(vcf)).toStrictEqual({
    metadata: {
      format: {
        GT: {
          id: 'GT',
          description: 'Genotype',
          type: 'STRING',
          number: {
            count: 1,
            type: 'NUMBER'
          }
        }
      },
      info: {
        DP: {
          id: 'DP',
          description: 'Total Depth',
          type: 'INTEGER',
          number: {
            count: 1,
            type: 'NUMBER'
          }
        },
        H2: {
          id: 'H2',
          description: 'HapMap2 membership',
          type: 'FLAG',
          number: {
            count: 0,
            type: 'NUMBER'
          }
        }
      }
    },
    header: {
      samples: ['S0']
    },
    data: [
      {
        c: '1',
        p: 12,
        i: [],
        r: 'C',
        a: ['T'],
        q: null,
        f: ['PASS'],
        n: {
          DP: 2,
          H2: true
        },
        s: [
          {
            GT: {
              a: [0, 1],
              p: false,
              t: 'het'
            }
          }
        ]
      }
    ]
  });
});

const vcfNoSamples = `
##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
1\t12\t.\tC\tT\t1.2\t.\t.
`;

test('parse vcf - no samples', () => {
  expect(parseVcf(vcfNoSamples)).toStrictEqual({
    metadata: {
      format: {},
      info: {}
    },
    header: {
      samples: []
    },
    data: [
      {
        c: '1',
        p: 12,
        i: [],
        r: 'C',
        a: ['T'],
        q: 1.2,
        f: [],
        n: {},
        s: []
      }
    ]
  });
});
