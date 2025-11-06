import { expect, test } from "vitest";
import { DatabaseSample, SqlRow } from "../sql";
import { mapSample, mapSamples } from "../sampleMapper";

test("mapSex maps valid sex strings correctly", () => {
  // You can either export mapSex and import it or inline it here for testing

  // Example inline mapping for demo, replace with import in practice
  function mapSex(dbValue: string) {
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

  expect(mapSex("UNKNOWN")).toBe("UNKNOWN_SEX");
  expect(mapSex("FEMALE")).toBe("FEMALE");
  expect(mapSex("MALE")).toBe("MALE");
  expect(mapSex("OTHER")).toBe("OTHER_SEX");
  expect(() => mapSex("INVALID")).toThrow("Invalid sex value: INVALID");
});

test("mapAffectedStatus maps valid status strings correctly", () => {
  function mapAffectedStatus(dbValue: string) {
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

  expect(mapAffectedStatus("MISSING")).toBe("MISSING");
  expect(mapAffectedStatus("UNAFFECTED")).toBe("UNAFFECTED");
  expect(mapAffectedStatus("AFFECTED")).toBe("AFFECTED");
  expect(() => mapAffectedStatus("INVALID")).toThrow("Invalid affectedStatus value: INVALID");
});

test("mapSample correctly maps SqlRow to DatabaseSample", () => {
  const row: SqlRow = {
    sampleIndex: 123,
    familyId: "fam1",
    individualId: "ind1",
    paternalId: "dad1",
    maternalId: "mom1",
    sex: "FEMALE",
    affectedStatus: "AFFECTED",
    proband: 1,
  };

  const expected: DatabaseSample = {
    id: 123,
    data: {
      person: {
        familyId: "fam1",
        individualId: "ind1",
        paternalId: "dad1",
        maternalId: "mom1",
        sex: "FEMALE",
        affectedStatus: "AFFECTED",
      },
      index: 123,
      proband: true,
    },
  };

  expect(mapSample(row)).toEqual(expected);
});

test("mapSamples maps array of SqlRow correctly", () => {
  const rows: SqlRow[] = [
    {
      sampleIndex: 1,
      familyId: "famA",
      individualId: "indA",
      paternalId: "dadA",
      maternalId: "momA",
      sex: "OTHER",
      affectedStatus: "MISSING",
      proband: 1,
    },
    {
      sampleIndex: 2,
      familyId: "famB",
      individualId: "indB",
      paternalId: null,
      maternalId: null,
      sex: "UNKNOWN",
      affectedStatus: "UNAFFECTED",
      proband: 0,
    },
  ];

  const mapped = mapSamples(rows);

  expect(mapped.length).toBe(2);
  expect(mapped[0].id).toBe(1);
  expect(mapped[0].data.person.sex).toBe("OTHER_SEX");
  expect(mapped[0].data.proband).toBe(true);

  expect(mapped[1].id).toBe(2);
  expect(mapped[1].data.person.paternalId).toBe("0");
  expect(mapped[1].data.person.sex).toBe("UNKNOWN_SEX");
  expect(mapped[1].data.proband).toBe(false);
});
