export const LITTLE_ENDIAN = 0;
export const BIG_ENDIAN = 1;

export class StructError extends Error {
  constructor(message) {
    super(message);
    this.name = "StructError";
  }
}

const VALID_FORMAT_CHARS = new Set([
  "x", "c", "b", "B", "?", "h", "H", "i", "I", "l", "L",
  "q", "Q", "f", "d", "s", "p", "P",
]);

const INT_RANGES = {
  b: [-128, 127],
  B: [0, 255],
  h: [-32768, 32767],
  H: [0, 65535],
  i: [-2147483648, 2147483647],
  I: [0, 4294967295],
  l: [-2147483648, 2147483647],
  L: [0, 4294967295],
  P: [0, 4294967295],
};

function typeSize(code) {
  switch (code) {
    case "x":
    case "c":
    case "b":
    case "B":
    case "?":
      return 1;
    case "h":
    case "H":
      return 2;
    case "i":
    case "I":
    case "l":
    case "L":
    case "f":
    case "P":
      return 4;
    case "q":
    case "Q":
    case "d":
      return 8;
    default:
      return 0;
  }
}

function tokenByteSize(token) {
  if (token.code === "s" || token.code === "p" || token.code === "x") {
    return token.count;
  }
  return typeSize(token.code) * token.count;
}

function tokensTotalSize(tokens) {
  let size = 0;
  for (const token of tokens) {
    size += tokenByteSize(token);
  }
  return size;
}

function tokensValueCount(tokens) {
  let count = 0;
  for (const token of tokens) {
    if (token.code === "x") continue;
    if (token.code === "s" || token.code === "p") {
      count += 1;
    } else {
      count += token.count;
    }
  }
  return count;
}

function parseFormat(fmt) {
  if (fmt.length === 0) {
    throw new StructError("Empty format string");
  }

  let pos = 0;
  let endianness = LITTLE_ENDIAN;

  const first = fmt[0];
  if (first === "@" || first === "=" || first === "<") {
    endianness = LITTLE_ENDIAN;
    pos = 1;
  } else if (first === ">" || first === "!") {
    endianness = BIG_ENDIAN;
    pos = 1;
  }

  const tokens = [];
  while (pos < fmt.length) {
    let countStr = "";
    while (pos < fmt.length && fmt[pos] >= "0" && fmt[pos] <= "9") {
      countStr += fmt[pos];
      pos++;
    }

    if (pos >= fmt.length) {
      throw new StructError(`Trailing digits in format string: "${countStr}"`);
    }

    const code = fmt[pos];
    pos++;

    if (!VALID_FORMAT_CHARS.has(code)) {
      throw new StructError(`Invalid format character: "${code}"`);
    }

    const count = countStr.length > 0 ? parseInt(countStr, 10) : 1;
    if (!Number.isFinite(count) || count < 0) {
      throw new StructError(`Invalid count for format character "${code}"`);
    }

    tokens.push({ code, count });
  }

  if (tokens.length === 0) {
    throw new StructError("Format string has no format characters");
  }

  return { endianness, tokens };
}

function stringToDataView(input) {
  if (input instanceof DataView) return input;
  if (input instanceof ArrayBuffer) return new DataView(input);
  if (typeof input === "string") {
    const buf = new ArrayBuffer(input.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < input.length; i++) {
      view[i] = input.charCodeAt(i) & 0xff;
    }
    return new DataView(buf);
  }
  throw new StructError("Input must be a string, ArrayBuffer, or DataView");
}

function validateInt(value, code) {
  const range = INT_RANGES[code];
  if (range) {
    const [min, max] = range;
    if (typeof value === "bigint") {
      if (value < BigInt(min) || value > BigInt(max)) {
        throw new StructError(
          `Value ${value} out of range for format "${code}" (needs ${min}..${max})`
        );
      }
    } else {
      if (!Number.isInteger(value)) {
        throw new StructError(
          `Non-integer value ${value} for integer format "${code}"`
        );
      }
      if (value < min || value > max) {
        throw new StructError(
          `Value ${value} out of range for format "${code}" (needs ${min}..${max})`
        );
      }
    }
    return;
  }

  if (code === "q" || code === "Q") {
    if (typeof value === "bigint") {
      const min = code === "q" ? -9223372036854775808n : 0n;
      const max = code === "q" ? 9223372036854775807n : 18446744073709551615n;
      if (value < min || value > max) {
        throw new StructError(`Value ${value} out of range for format "${code}"`);
      }
    } else if (typeof value === "number") {
      if (!Number.isInteger(value)) {
        throw new StructError(
          `Non-integer value ${value} for integer format "${code}"`
        );
      }
    } else {
      throw new StructError(
        `Non-integer value for integer format "${code}"`
      );
    }
  }
}

function unpack(fmt, input) {
  const dv = stringToDataView(input);
  const { endianness, tokens } = parseFormat(fmt);
  const expectedSize = tokensTotalSize(tokens);

  if (dv.byteLength < expectedSize) {
    throw new StructError(
      `Buffer too small for format: need ${expectedSize} bytes, got ${dv.byteLength}`
    );
  }
  if (dv.byteLength > expectedSize) {
    throw new StructError(
      `Buffer too large for format: expected ${expectedSize} bytes, got ${dv.byteLength}`
    );
  }

  const result = [];
  let strpos = 0;
  const le = endianness === LITTLE_ENDIAN;

  for (const token of tokens) {
    const { code, count } = token;

    switch (code) {
      case "c":
        for (let i = 0; i < count; i++) {
          result.push(String.fromCharCode(dv.getUint8(strpos)));
          strpos += 1;
        }
        break;

      case "b":
        for (let i = 0; i < count; i++) {
          result.push(dv.getInt8(strpos));
          strpos += 1;
        }
        break;

      case "B":
        for (let i = 0; i < count; i++) {
          result.push(dv.getUint8(strpos));
          strpos += 1;
        }
        break;

      case "?":
        for (let i = 0; i < count; i++) {
          result.push(dv.getUint8(strpos) > 0);
          strpos += 1;
        }
        break;

      case "h":
        for (let i = 0; i < count; i++) {
          result.push(dv.getInt16(strpos, le));
          strpos += 2;
        }
        break;

      case "H":
        for (let i = 0; i < count; i++) {
          result.push(dv.getUint16(strpos, le));
          strpos += 2;
        }
        break;

      case "i":
        for (let i = 0; i < count; i++) {
          result.push(dv.getInt32(strpos, le));
          strpos += 4;
        }
        break;

      case "I":
        for (let i = 0; i < count; i++) {
          result.push(dv.getUint32(strpos, le));
          strpos += 4;
        }
        break;

      case "l":
        for (let i = 0; i < count; i++) {
          result.push(dv.getInt32(strpos, le));
          strpos += 4;
        }
        break;

      case "L":
        for (let i = 0; i < count; i++) {
          result.push(dv.getUint32(strpos, le));
          strpos += 4;
        }
        break;

      case "q":
        for (let i = 0; i < count; i++) {
          result.push(dv.getBigInt64(strpos, le));
          strpos += 8;
        }
        break;

      case "Q":
        for (let i = 0; i < count; i++) {
          result.push(dv.getBigUint64(strpos, le));
          strpos += 8;
        }
        break;

      case "f":
        for (let i = 0; i < count; i++) {
          result.push(dv.getFloat32(strpos, le));
          strpos += 4;
        }
        break;

      case "d":
        for (let i = 0; i < count; i++) {
          result.push(dv.getFloat64(strpos, le));
          strpos += 8;
        }
        break;

      case "P":
        for (let i = 0; i < count; i++) {
          result.push(dv.getUint32(strpos, le));
          strpos += 4;
        }
        break;

      case "s": {
        const chars = [];
        for (let i = 0; i < count; i++) {
          chars.push(String.fromCharCode(dv.getUint8(strpos + i)));
        }
        result.push(chars.join(""));
        strpos += count;
        break;
      }

      case "p": {
        const len = dv.getUint8(strpos);
        const dataLen = Math.max(0, count - 1);
        const readLen = Math.min(len, dataLen);
        const chars = [];
        for (let i = 0; i < readLen; i++) {
          chars.push(String.fromCharCode(dv.getUint8(strpos + 1 + i)));
        }
        result.push(chars.join(""));
        strpos += count;
        break;
      }

      case "x":
        strpos += count;
        break;

      default:
        throw new StructError(`Invalid format character: "${code}"`);
    }
  }

  return result;
}

function pack(fmt, ...values) {
  const { endianness, tokens } = parseFormat(fmt);
  const expectedSize = tokensTotalSize(tokens);
  const expectedValues = tokensValueCount(tokens);

  if (values.length < expectedValues) {
    throw new StructError(
      `pack requires ${expectedValues} values for format, got ${values.length}`
    );
  }
  if (values.length > expectedValues) {
    throw new StructError(
      `pack expected ${expectedValues} values for format, got ${values.length}`
    );
  }

  const buf = new ArrayBuffer(expectedSize);
  const dv = new DataView(buf);
  const le = endianness === LITTLE_ENDIAN;

  let strpos = 0;
  let valIdx = 0;

  for (const token of tokens) {
    const { code, count } = token;

    switch (code) {
      case "x":
        strpos += count;
        break;

      case "c":
        for (let i = 0; i < count; i++) {
          const value = values[valIdx++];
          const str = String(value);
          if (str.length === 0) {
            throw new StructError(
              `Expected a character for 'c' format, got empty string`
            );
          }
          dv.setUint8(strpos, str.charCodeAt(0) & 0xff);
          strpos += 1;
        }
        break;

      case "b":
        for (let i = 0; i < count; i++) {
          validateInt(values[valIdx], "b");
          dv.setInt8(strpos, values[valIdx++]);
          strpos += 1;
        }
        break;

      case "B":
        for (let i = 0; i < count; i++) {
          validateInt(values[valIdx], "B");
          dv.setUint8(strpos, values[valIdx++]);
          strpos += 1;
        }
        break;

      case "?":
        for (let i = 0; i < count; i++) {
          dv.setUint8(strpos, values[valIdx++] ? 1 : 0);
          strpos += 1;
        }
        break;

      case "h":
        for (let i = 0; i < count; i++) {
          validateInt(values[valIdx], "h");
          dv.setInt16(strpos, values[valIdx++], le);
          strpos += 2;
        }
        break;

      case "H":
        for (let i = 0; i < count; i++) {
          validateInt(values[valIdx], "H");
          dv.setUint16(strpos, values[valIdx++], le);
          strpos += 2;
        }
        break;

      case "i":
        for (let i = 0; i < count; i++) {
          validateInt(values[valIdx], "i");
          dv.setInt32(strpos, values[valIdx++], le);
          strpos += 4;
        }
        break;

      case "I":
        for (let i = 0; i < count; i++) {
          validateInt(values[valIdx], "I");
          dv.setUint32(strpos, values[valIdx++], le);
          strpos += 4;
        }
        break;

      case "l":
        for (let i = 0; i < count; i++) {
          validateInt(values[valIdx], "l");
          dv.setInt32(strpos, values[valIdx++], le);
          strpos += 4;
        }
        break;

      case "L":
        for (let i = 0; i < count; i++) {
          validateInt(values[valIdx], "L");
          dv.setUint32(strpos, values[valIdx++], le);
          strpos += 4;
        }
        break;

      case "q":
        for (let i = 0; i < count; i++) {
          validateInt(values[valIdx], "q");
          const big =
            typeof values[valIdx] === "bigint"
              ? values[valIdx]
              : BigInt(values[valIdx]);
          dv.setBigInt64(strpos, big, le);
          valIdx++;
          strpos += 8;
        }
        break;

      case "Q":
        for (let i = 0; i < count; i++) {
          validateInt(values[valIdx], "Q");
          const big =
            typeof values[valIdx] === "bigint"
              ? values[valIdx]
              : BigInt(values[valIdx]);
          dv.setBigUint64(strpos, big, le);
          valIdx++;
          strpos += 8;
        }
        break;

      case "f":
        for (let i = 0; i < count; i++) {
          dv.setFloat32(strpos, values[valIdx++], le);
          strpos += 4;
        }
        break;

      case "d":
        for (let i = 0; i < count; i++) {
          dv.setFloat64(strpos, values[valIdx++], le);
          strpos += 8;
        }
        break;

      case "P":
        for (let i = 0; i < count; i++) {
          validateInt(values[valIdx], "P");
          dv.setUint32(strpos, values[valIdx++], le);
          strpos += 4;
        }
        break;

      case "s": {
        const str = String(values[valIdx++]);
        for (let i = 0; i < count; i++) {
          dv.setUint8(
            strpos + i,
            i < str.length ? str.charCodeAt(i) & 0xff : 0
          );
        }
        strpos += count;
        break;
      }

      case "p": {
        const str = String(values[valIdx++]);
        const dataLen = Math.max(0, count - 1);
        const writeLen = Math.min(str.length, dataLen);
        dv.setUint8(strpos, writeLen);
        for (let i = 0; i < dataLen; i++) {
          dv.setUint8(
            strpos + 1 + i,
            i < writeLen ? str.charCodeAt(i) & 0xff : 0
          );
        }
        strpos += count;
        break;
      }

      default:
        throw new StructError(`Invalid format character: "${code}"`);
    }
  }

  return buf;
}

function calcSize(fmt) {
  const { tokens } = parseFormat(fmt);
  return tokensTotalSize(tokens);
}

export { unpack, pack, calcSize };
