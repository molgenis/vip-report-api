declare module 'ascii85' {
  export class Ascii85 {
    constructor(param: { table: string[] });
    encode(buffer: Buffer): string;
    decode(str: string): Buffer;
  }
}
