import ascii85 from 'ascii85';

const table = [
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z',
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h',
  'i',
  'j',
  'k',
  'l',
  'm',
  'n',
  'o',
  'p',
  'q',
  'r',
  's',
  't',
  'u',
  'v',
  'w',
  'x',
  'y',
  'z',
  '!',
  '#',
  '$',
  '%',
  '&',
  '(',
  ')',
  '*',
  '+',
  '-',
  ';',
  '<',
  '=',
  '>',
  '?',
  '@',
  '^',
  '_',
  '`',
  '{',
  '|',
  '}',
  '~'
];

export class Base85 {
  private ascii85: ascii85.Ascii85;

  constructor() {
    this.ascii85 = new ascii85.Ascii85({ table });
  }

  encode(buffer: Buffer): string {
    return this.ascii85.encode(buffer).toString();
  }

  decode(str: string): Buffer {
    return this.ascii85.decode(str);
  }
}
