      _                   _      _     
  ___| |_ _ __ _   _  ___| |_   (_)___ 
 / __| __| '__| | | |/ __| __|  | / __|
 \__ \ |_| |  | |_| | (__| |_ _ | \__ \
 |___/\__|_|   \__,_|\___|\__(_)/ |___/
                              |__/     

Python `struct` module port to JavaScript — pack and unpack binary data using format strings.

Works in Node.js and browsers (no dependencies, uses Web APIs: `ArrayBuffer`, `DataView`, `BigInt`).

## Install

```bash
npm install struct.js
```

## Usage

```javascript
import { pack, unpack, calcSize } from "struct.js";

// Pack an unsigned int (1234) — returns ArrayBuffer
const buf = pack("I", 1234);

// Unpack it back
unpack("I", buf); // [1234]

// Pack multiple fields
const buf2 = pack("Ifc", 9184, 10.5, "a");
unpack("Ifc", buf2); // [9184, 10.5, "a"]

// Big-endian
const buf3 = pack(">I", 1234);
unpack(">I", buf3); // [1234]

// Repeat counts
const buf4 = pack("3I", 10, 20, 30);
unpack("3I", buf4); // [10, 20, 30]

// Fixed-width strings
const buf5 = pack("10s", "hello");
unpack("10s", buf5); // ["hello\0\0\0\0\0"]

// Pascal strings (length-prefixed)
const buf6 = pack("10p", "hello");
unpack("10p", buf6); // ["hello"]

// Calculate size without packing
calcSize("IHHf"); // 14
```

## API

### `unpack(fmt, input)` → `Array`

Unpacks binary data according to the format string.

**Input types:** `string` (legacy), `ArrayBuffer`, or `DataView`.

### `pack(fmt, ...values)` → `ArrayBuffer`

Packs values into an `ArrayBuffer` according to the format string.

### `calcSize(fmt)` → `number`

Returns the byte size of the packed data for a given format.

### `StructError`

Error class thrown on invalid formats, buffer size mismatches, value count mismatches, or out-of-range values.

## Format String

First character (optional) sets endianness:

| Prefix | Endianness |
|--------|-----------|
| `@`, `=`, `<` | Little-endian |
| `>`, `!` | Big-endian |

Remaining characters define fields. A numeric prefix repeats the field:

| Format | C Type | Size | Description |
|--------|---------|------|-------------|
| `x` | pad byte | 1 | Skips bytes (no value consumed) |
| `c` | char | 1 | Single character string |
| `b` | signed char | 1 | Integer |
| `B` | unsigned char | 1 | Integer |
| `?` | _Bool | 1 | Boolean |
| `h` | short | 2 | Integer |
| `H` | unsigned short | 2 | Integer |
| `i` | int | 4 | Integer |
| `I` | unsigned int | 4 | Integer |
| `l` | long | 4 | Integer |
| `L` | unsigned long | 4 | Integer |
| `q` | long long | 8 | BigInt |
| `Q` | unsigned long long | 8 | BigInt |
| `f` | float | 4 | Float |
| `d` | double | 8 | Double |
| `s` | char[] | N | Fixed-width string (N bytes, padded with `\0`) |
| `p` | char[] | N | Pascal string (1 length byte + N-1 data bytes) |
| `P` | void * | 4 | Integer (pointer, 32-bit) |

## Dev

```bash
npm run build      # Copy src/ to dist/
npm test           # Run tests (vitest)
npm run test:watch # Watch mode
npm run lint       # ESLint
npm run typecheck  # TypeScript declaration check
```

## License

MIT
