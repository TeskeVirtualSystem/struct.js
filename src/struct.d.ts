export const LITTLE_ENDIAN: 0;
export const BIG_ENDIAN: 1;

export class StructError extends Error {
  constructor(message: string);
  name: "StructError";
}

type UnpackValue = string | number | bigint | boolean;

type StructInput = string | ArrayBuffer | DataView;

export function unpack(fmt: string, input: StructInput): UnpackValue[];

export function pack(fmt: string, ...values: UnpackValue[]): ArrayBuffer;

export function calcSize(fmt: string): number;
