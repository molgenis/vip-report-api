import { Person } from "./index";
import { DatabaseSample, SqlRow } from "./sql";

export function mapSample(row: SqlRow): DatabaseSample {
  return {
    id: row.sampleIndex as number,
    data: {
      person: {
        familyId: row.familyId as string,
        individualId: row.individualId as string,
        paternalId: row.paternalId === null ? "0" : (row.paternalId as string),
        maternalId: row.maternalId === null ? "0" : (row.maternalId as string),
        sex: mapSex(row.sex as string),
        affectedStatus: mapAffectedStatus(row.affectedStatus as string),
      },
      index: row.sampleIndex as number,
      proband: row.proband === 1,
    },
  };
}

export function mapSamples(rows: SqlRow[]): DatabaseSample[] {
  return rows.map(mapSample);
}

function mapSex(dbValue: string): Person["sex"] {
  switch (dbValue) {
    case "UNKNOWN":
      return "UNKNOWN_SEX";
    case "FEMALE":
      return "FEMALE";
    case "MALE":
      return "MALE";
    case "OTHER":
      return "OTHER_SEX";
    default:
      throw new Error(`Invalid sex value: ${dbValue}`);
  }
}

function mapAffectedStatus(dbValue: string): Person["affectedStatus"] {
  switch (dbValue) {
    case "MISSING":
      return "MISSING";
    case "UNAFFECTED":
      return "UNAFFECTED";
    case "AFFECTED":
      return "AFFECTED";
    default:
      throw new Error(`Invalid affectedStatus value: ${dbValue}`);
  }
}
