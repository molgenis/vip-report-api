import { VcfMetadata } from "@molgenis/vip-report-vcf";

const data: VcfMetadata = {
  format: {
    AD: {
      categories: undefined,
      description: "Allelic depths for the ref and alt alleles in the order listed",
      id: "AD",
      label: "AD",
      nullValue: undefined,
      number: { count: undefined, type: "PER_ALT_AND_REF" },
      required: false,
      type: "INTEGER",
    },
    DP: {
      categories: undefined,
      description: "Approximate read depth (reads with MQ=255 or with bad mates are filtered)",
      id: "DP",
      label: "DP",
      nullValue: undefined,
      number: { count: 1, type: "NUMBER" },
      required: false,
      type: "INTEGER",
    },
    GT: {
      categories: undefined,
      description: "Genotype",
      id: "GT",
      label: "GT",
      nullValue: undefined,
      number: { count: 1, type: "NUMBER" },
      required: false,
      type: "STRING",
    },
    TEST: {
      categories: undefined,
      description: "TEST",
      id: "TEST",
      label: "TEST",
      nullValue: undefined,
      number: { count: 1, type: "NUMBER" },
      required: false,
      type: "STRING",
    },
    VIAB: {
      categories: undefined,
      description: "VIAB",
      id: "VIAB",
      label: "VIAB",
      nullValue: undefined,
      number: { count: 1, type: "NUMBER" },
      required: false,
      type: "FLOAT",
    },
    VIPC_S: {
      categories: {
        U1: { description: "Usable: probably", label: "probably" },
        U2: { description: "Usable: maybe", label: "maybe" },
        U3: { description: "Usable: probably not", label: "probably not" },
      },
      description: "VIP decision tree classification sample.",
      id: "VIPC_S",
      label: "VIPC_S",
      nullValue: undefined,
      number: { count: undefined, type: "OTHER" },
      required: false,
      type: "CATEGORICAL",
    },
    VIPP_S: {
      categories: undefined,
      description: "VIP decision tree path sample.",
      id: "VIPP_S",
      label: "VIPP_S",
      nullValue: undefined,
      number: { count: undefined, type: "OTHER" },
      required: false,
      type: "STRING",
    },
  },
  info: {
    CSQ: {
      categories: undefined,
      description: "Consequence annotations from Ensembl VEP. Format: Allele|VIPC",
      id: "CSQ",
      label: "CSQ",
      nested: {
        items: {
          "0": {
            categories: undefined,
            description: undefined,
            id: "Allele",
            label: "Allele",
            nullValue: undefined,
            number: { count: 1, type: "NUMBER" },
            parent: undefined,
            required: false,
            type: "STRING",
          },
          "1": {
            categories: {
              B: { description: "", label: "Benign" },
              LB: { description: "", label: "Likely Benign" },
              LP: { description: "", label: "Likely Pathogenic" },
              LQ: { description: "Low quality variants.", label: "LowQual" },
              P: { description: "", label: "Pathogenic" },
              VUS: { description: "", label: "Unknown Significance" },
            },
            description:
              "Variant consequence classification predicted by the Variant Interpretation Pipeline (VIP), see https://vip.molgeniscloud.org/ and https://doi.org/10.1101/2024.04.11.24305656",
            id: "VIPC",
            label: "VIP classification",
            nullValue: undefined,
            number: { count: 1, type: "NUMBER" },
            parent: undefined,
            required: true,
            type: "CATEGORICAL",
          },
        },
        separator: "|",
      },
      nullValue: undefined,
      number: { count: undefined, type: "OTHER" },
      required: false,
      type: "STRING",
    },
    n_array0: {
      categories: undefined,
      description: "n_array0",
      id: "n_array0",
      label: "n_array0",
      nullValue: undefined,
      number: { count: undefined, type: "OTHER" },
      required: false,
      type: "STRING",
    },
    n_array1: {
      categories: undefined,
      description: "n_array1",
      id: "n_array1",
      label: "n_array1",
      nullValue: undefined,
      number: { count: undefined, type: "OTHER" },
      required: false,
      type: "STRING",
    },
    n_bool3: {
      categories: undefined,
      description: "n_bool3",
      id: "n_bool3",
      label: "n_bool3",
      nullValue: undefined,
      number: { count: 0, type: "NUMBER" },
      required: false,
      type: "FLAG",
    },
    n_bool6: {
      categories: undefined,
      description: "n_bool6",
      id: "n_bool6",
      label: "n_bool6",
      nullValue: undefined,
      number: { count: 0, type: "NUMBER" },
      required: false,
      type: "FLAG",
    },
    n_bool7: {
      categories: undefined,
      description: "n_bool7",
      id: "n_bool7",
      label: "n_bool7",
      nullValue: undefined,
      number: { count: 0, type: "NUMBER" },
      required: false,
      type: "FLAG",
    },
    n_cat1: {
      categories: undefined,
      description: "n_cat1",
      id: "n_cat1",
      label: "n_cat1",
      nullValue: undefined,
      number: { count: 1, type: "NUMBER" },
      required: false,
      type: "STRING",
    },
    n_cat2: {
      categories: undefined,
      description: "n_cat2",
      id: "n_cat2",
      label: "n_cat2",
      nullValue: undefined,
      number: { count: 1, type: "NUMBER" },
      required: false,
      type: "STRING",
    },
    n_number2: {
      categories: undefined,
      description: "n_number2",
      id: "n_number2",
      label: "n_number2",
      nullValue: undefined,
      number: { count: 1, type: "NUMBER" },
      required: false,
      type: "INTEGER",
    },
    n_object0: {
      categories: undefined,
      description: "Annotations from Object test. Format: n_string1|n_string2|n_array1",
      id: "n_object0",
      label: "n_object0",
      nested: {
        items: {
          "0": {
            categories: undefined,
            description: "Test string 1",
            id: "n_string1",
            label: "String",
            nullValue: undefined,
            number: { count: 1, type: "NUMBER" },
            parent: undefined,
            required: false,
            type: "STRING",
          },
          "3": {
            categories: {
              false: { description: "A DESC", label: "A" },
              BB: { description: "B DESC", label: "B" },
            },
            description: "Test categorical",
            id: "n_cat1",
            label: "Categorical",
            nullValue: undefined,
            number: { count: 1, type: "NUMBER" },
            parent: undefined,
            required: false,
            type: "CATEGORICAL",
          },
          "4": {
            categories: {
              AA: { description: "A DESC", label: "A" },
              BB: { description: "B DESC", label: "B" },
            },
            description: "Test categorical 2",
            id: "n_cat2",
            label: "Categorical2 ",
            nullValue: { description: "Default", label: "D" },
            number: { count: 1, type: "NUMBER" },
            parent: undefined,
            required: false,
            type: "CATEGORICAL",
          },
          "2": {
            categories: undefined,
            description: "Test array",
            id: "n_array1",
            label: "Array",
            nullValue: undefined,
            number: { count: undefined, type: "OTHER" },
            parent: undefined,
            required: false,
            type: "STRING",
          },
          "1": {
            categories: undefined,
            description: "Test string 2",
            id: "n_string2",
            label: "String",
            nullValue: undefined,
            number: { count: 1, type: "NUMBER" },
            parent: undefined,
            required: false,
            type: "STRING",
          },
        },
        separator: "|",
      },
      nullValue: undefined,
      number: { count: undefined, type: "OTHER" },
      required: false,
      type: "STRING",
    },
    n_string0: {
      categories: undefined,
      description: "n_string0",
      id: "n_string0",
      label: "n_string0",
      nullValue: undefined,
      number: { count: 1, type: "NUMBER" },
      required: false,
      type: "STRING",
    },
    n_string3: {
      categories: undefined,
      description: "n_string3",
      id: "n_string3",
      label: "n_string3",
      nullValue: undefined,
      number: { count: 1, type: "NUMBER" },
      required: false,
      type: "STRING",
    },
    n_string4: {
      categories: undefined,
      description: "n_string4",
      id: "n_string4",
      label: "n_string4",
      nullValue: undefined,
      number: { count: 1, type: "NUMBER" },
      required: false,
      type: "STRING",
    },
    n_string5: {
      categories: undefined,
      description: "n_string5",
      id: "n_string5",
      label: "n_string5",
      nullValue: undefined,
      number: { count: 1, type: "NUMBER" },
      required: false,
      type: "STRING",
    },
  },
  lines: [
    "##fileformat=VCFv4.2",
    '##INFO=<ID=n_bool3,Number=0,Type=Flag,Description="n_bool3">',
    '##INFO=<ID=n_bool6,Number=0,Type=Flag,Description="n_bool6">',
    '##INFO=<ID=n_bool7,Number=0,Type=Flag,Description="n_bool7">',
    '##INFO=<ID=n_number2,Number=1,Type=Integer,Description="n_number2">',
    '##INFO=<ID=n_string0,Number=1,Type=String,Description="n_string0">',
    '##INFO=<ID=n_string3,Number=1,Type=String,Description="n_string3">',
    '##INFO=<ID=n_string4,Number=1,Type=String,Description="n_string4">',
    '##INFO=<ID=n_string5,Number=1,Type=String,Description="n_string5">',
    '##INFO=<ID=n_cat1,Number=1,Type=String,Description="n_cat1">',
    '##INFO=<ID=n_cat2,Number=1,Type=String,Description="n_cat2">',
    '##INFO=<ID=n_array0,Number=.,Type=String,Description="n_array0">',
    '##INFO=<ID=n_array1,Number=.,Type=String,Description="n_array1">',
    '##INFO=<ID=n_object0,Number=.,Type=String,Description="Annotations from Object test. Format: n_string1|n_string2|n_array1">',
    '##INFO=<ID=CSQ,Number=.,Type=String,Description="Consequence annotations from Ensembl VEP. Format: Allele|VIPC">',
    '##FORMAT=<ID=DP,Number=1,Type=Integer,Description="Approximate read depth (reads with MQ=255 or with bad mates are filtered)">',
    '##FORMAT=<ID=AD,Number=R,Type=Integer,Description="Allelic depths for the ref and alt alleles in the order listed">',
    '##FORMAT=<ID=GT,Number=1,Type=String,Description="Genotype">',
    '##FORMAT=<ID=VIAB,Number=1,Type=Float,Description="VIAB">',
    '##FORMAT=<ID=TEST,Number=1,Type=String,Description="TEST">',
    '##FORMAT=<ID=VIPC_S,Number=.,Type=String,Description="VIP decision tree classification sample.">',
    '##FORMAT=<ID=VIPP_S,Number=.,Type=String,Description="VIP decision tree path sample.">',
    "##contig=<ID=1,length=1234>",
    "#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tPatient\tMother\tFather",
  ],
  samples: ["Patient", "Mother", "Father"],
};

function assignParentFieldsToData(data: VcfMetadata): VcfMetadata {
  // Helper: assign parent to each item in a nested array, recurse into deeper nesting
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function assignParent(obj: any) {
    if (obj.nested.items && typeof obj.nested.items === "object") {
      const orderedKeys = Object.keys(obj.nested.items)
        .map(Number)
        .sort((a, b) => a - b);
      for (const index of orderedKeys) {
        const item = obj.nested.items[index];
        item.parent = obj;
      }
    }
  }

  // Assign parents in format properties
  if (data.format) {
    for (const key of Object.keys(data.format)) {
      const formatItem = data.format[key];
      if (formatItem.nested && typeof formatItem.nested === "object" && formatItem.nested.items) {
        assignParent(formatItem.nested);
      }
    }
  }

  // Assign parents in info properties
  if (data.info) {
    for (const key of Object.keys(data.info)) {
      const infoItem = data.info[key];
      if (infoItem.nested && typeof infoItem.nested === "object" && infoItem.nested.items) {
        assignParent(infoItem);
      }
    }
  }
  return data;
}

export const expectedMeta: VcfMetadata = assignParentFieldsToData(data);
