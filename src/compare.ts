class CompareTypeError extends Error {
  constructor(value: unknown) {
    super(`can't compare values of type '${typeof value}'.`);
    this.name = "CompareTypeError";
  }
}

export function compareDesc(a: unknown, b: unknown) {
  if (a === null) {
    return b === null ? 0 : 1;
  } else if (b === null) {
    return -1;
  } else if (Array.isArray(a) && Array.isArray(b)) {
    return compareDescArray(a, b);
  } else {
    return compareAscNonNullPrimitives(b, a);
  }
}

export function compareAsc(a: unknown, b: unknown): number {
  if (a === null) {
    return b === null ? 0 : 1;
  } else if (b === null) {
    return -1;
  } else if (Array.isArray(a) && Array.isArray(b)) {
    return compareAscArray(a, b);
  } else {
    return compareAscNonNullPrimitives(a, b);
  }
}

function compareAscNonNullPrimitives(a: unknown, b: unknown): number {
  if (typeof a === "number" && typeof b === "number") {
    return compareAscNumber(a, b);
  } else if (typeof a === "string" && typeof b === "string") {
    return compareAscString(a, b);
  } else if (typeof a === "boolean" && typeof b === "boolean") {
    return compareAscBoolean(a, b);
  } else {
    throw new CompareTypeError(a);
  }
}

function compareAscNumber(a: number, b: number): number {
  return a - b;
}

function compareAscString(a: string, b: string): number {
  return a.toUpperCase().localeCompare(b.toUpperCase());
}

function compareAscBoolean(a: boolean, b: boolean): number {
  if (a === b) {
    return 0;
  } else {
    return a ? -1 : 1;
  }
}

function checkArrays(arrays: unknown[][]) {
  for (const array of arrays) {
    const firstA = array.find((value) => value !== null);
    if (firstA !== undefined && typeof firstA !== "number" && typeof firstA !== "string")
      throw new CompareTypeError(firstA);
  }
}

function compareAscArray(a: unknown[], b: unknown[]): number {
  if (a.length === 0) {
    return b.length === 0 ? 0 : 1;
  } else if (b.length === 0) {
    return -1;
  } else {
    checkArrays([a, b]);

    // sort on first array item
    const sortedA = a.slice().sort(compareAsc);
    const sortedB = b.slice().sort(compareAsc);
    return compareAsc(sortedA[0], sortedB[0]);
  }
}

function compareDescArray(a: unknown[], b: unknown[]): number {
  if (a.length === 0) {
    return b.length === 0 ? 0 : 1;
  } else if (b.length === 0) {
    return -1;
  } else {
    checkArrays([a, b]);

    // sort on first array item
    const sortedA = a.slice().sort(compareDesc);
    const sortedB = b.slice().sort(compareDesc);
    return compareDesc(sortedA[0], sortedB[0]);
  }
}
