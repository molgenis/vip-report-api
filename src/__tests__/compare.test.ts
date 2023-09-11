import { describe, expect, test } from "vitest";
import { compareAsc, compareDesc } from "../compare";

describe("compare functions", () => {
  test("sort strings ascending", () => {
    expect(["b", null, "A", "c", "b"].sort(compareAsc)).toStrictEqual(["A", "b", "b", "c", null]);
  });

  test("sort strings descending", () => {
    expect(["b", null, null, "A", "c"].sort(compareDesc)).toStrictEqual(["c", "b", "A", null, null]);
  });

  test("sort numbers ascending", () => {
    expect([2, null, 1, 3].sort(compareAsc)).toStrictEqual([1, 2, 3, null]);
  });

  test("sort numbers descending", () => {
    expect([null, 2, 1, 1, 3].sort(compareDesc)).toStrictEqual([3, 2, 1, 1, null]);
  });

  test("sort boolean ascending", () => {
    expect([true, null, true, false].sort(compareAsc)).toStrictEqual([true, true, false, null]);
  });

  test("sort boolean descending", () => {
    expect([true, null, false].sort(compareDesc)).toStrictEqual([false, true, null]);
  });

  test("sort array ascending", () => {
    const array0 = [3, 2, 4];
    const array1 = [2, null, 1, 3];
    const array2: string[] = [];
    const array3: string[] = [];
    const array4 = [null, 4, 5, 6];
    const array5 = [null];
    expect([array0, array1, array2, array3, array4, array5].sort(compareAsc)).toStrictEqual([
      array1,
      array0,
      array4,
      array5,
      array2,
      array3,
    ]);
  });

  test("sort array descending", () => {
    const array0 = [3, 2, 4];
    const array1 = [2, null, 1, 3];
    const array2: string[] = [];
    const array3: string[] = [];
    const array4 = [null, 4, 5, 6];
    const array5 = [null];
    expect([array0, array1, array2, array3, array4, array5].sort(compareDesc)).toStrictEqual([
      array4,
      array0,
      array1,
      array5,
      array2,
      array3,
    ]);
  });

  test("sort arrays throws an error", () => {
    expect(() => [[{ x: 0, y: 1 }], [{ x: 1, y: 2 }]].sort(compareAsc)).toThrowError(
      "can't compare values of type 'object'.",
    );
  });

  test("sort object throws an error", () => {
    expect(() =>
      [
        { x: 0, y: 1 },
        { x: 1, y: 2 },
      ].sort(compareAsc),
    ).toThrowError("can't compare values of type 'object'.");
  });
});
