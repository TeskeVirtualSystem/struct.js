import { describe, it, expect } from "vitest";
import {
  unpack, pack, calcSize, StructError, LITTLE_ENDIAN, BIG_ENDIAN,
} from "../src/index.js";

function bufToHex(buf) {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

describe("calcSize", () => {
  it("calculates single integer formats", () => {
    expect(calcSize("I")).toBe(4);
    expect(calcSize("Q")).toBe(8);
    expect(calcSize("H")).toBe(2);
    expect(calcSize("b")).toBe(1);
  });

  it("calculates float/double", () => {
    expect(calcSize("f")).toBe(4);
    expect(calcSize("d")).toBe(8);
  });

  it("calculates multiple fields", () => {
    expect(calcSize("IHH")).toBe(8);
    expect(calcSize("Ifc")).toBe(9);
  });

  it("calculates string types with counts", () => {
    expect(calcSize("4s")).toBe(4);
    expect(calcSize("10s")).toBe(10);
    expect(calcSize("5p")).toBe(5);
  });

  it("calculates pad bytes with counts", () => {
    expect(calcSize("10x")).toBe(10);
    expect(calcSize("x")).toBe(1);
  });

  it("calculates repeat counts for numeric types", () => {
    expect(calcSize("3I")).toBe(12);
    expect(calcSize("2Q")).toBe(16);
    expect(calcSize("10b")).toBe(10);
  });

  it("respects endianness prefix", () => {
    expect(calcSize(">If")).toBe(8);
    expect(calcSize("<If")).toBe(8);
  });

  it("throws on empty format", () => {
    expect(() => calcSize("")).toThrow(StructError);
    expect(() => calcSize("")).toThrow("Empty format string");
  });
});

describe("StructError", () => {
  it("is an Error subclass", () => {
    const err = new StructError("test");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(StructError);
    expect(err.name).toBe("StructError");
    expect(err.message).toBe("test");
  });

  it("all public errors are StructError", () => {
    expect(() => unpack("Z", new ArrayBuffer(1))).toThrow(StructError);
    expect(() => unpack("", new ArrayBuffer(0))).toThrow(StructError);
    expect(() => unpack("I", new ArrayBuffer(2))).toThrow(StructError);
    expect(() => unpack("I", new ArrayBuffer(8))).toThrow(StructError);
    expect(() => pack("I", 1, 2)).toThrow(StructError);
    expect(() => pack("II", 1)).toThrow(StructError);
    expect(() => pack("B", 256)).toThrow(StructError);
  });
});

describe("unpack - integers", () => {
  it("unpacks little-endian unsigned int", () => {
    const buf = pack("I", 1234);
    expect(unpack("I", buf)).toEqual([1234]);
  });

  it("unpacks big-endian unsigned int", () => {
    const buf = pack(">I", 1234);
    expect(unpack(">I", buf)).toEqual([1234]);
  });

  it("unpacks signed char", () => {
    const buf = pack("b", -42);
    expect(unpack("b", buf)).toEqual([-42]);
  });

  it("unpacks unsigned char", () => {
    const buf = pack("B", 200);
    expect(unpack("B", buf)).toEqual([200]);
  });

  it("unpacks short", () => {
    const buf = pack("h", -1000);
    expect(unpack("h", buf)).toEqual([-1000]);
  });

  it("unpacks unsigned short", () => {
    const buf = pack("H", 50000);
    expect(unpack("H", buf)).toEqual([50000]);
  });

  it("unpacks long long (64-bit signed)", () => {
    const buf = pack("q", -1n);
    expect(unpack("q", buf)).toEqual([-1n]);
  });

  it("unpacks unsigned long long (64-bit unsigned)", () => {
    const buf = pack("Q", 0xFFFFFFFFFFFFFFFFn);
    expect(unpack("Q", buf)).toEqual([0xFFFFFFFFFFFFFFFFn]);
  });
});

describe("unpack - floats and doubles", () => {
  it("unpacks float", () => {
    const buf = pack("f", 10.5);
    expect(Math.abs(unpack("f", buf)[0] - 10.5)).toBeLessThan(0.001);
  });

  it("unpacks double", () => {
    const buf = pack("d", 3.14159265358979);
    expect(unpack("d", buf)[0]).toBeCloseTo(3.14159265358979, 10);
  });
});

describe("unpack - chars", () => {
  it("unpacks single char", () => {
    const buf = pack("c", "A");
    expect(unpack("c", buf)).toEqual(["A"]);
  });

  it("unpacks repeated chars", () => {
    const buf = pack("3c", "A", "B", "C");
    expect(unpack("3c", buf)).toEqual(["A", "B", "C"]);
  });
});

describe("unpack - fixed-width strings (s)", () => {
  it("unpacks fixed-width string", () => {
    const buf = pack("4s", "abc");
    expect(unpack("4s", buf)).toEqual(["abc\0"]);
  });

  it("unpacks full-width string (no padding)", () => {
    const buf = pack("3s", "abc");
    expect(unpack("3s", buf)).toEqual(["abc"]);
  });

  it("unpacks string with embedded NULs", () => {
    const buf = new ArrayBuffer(5);
    const dv = new DataView(buf);
    dv.setUint8(0, 0x61);
    dv.setUint8(1, 0x00);
    dv.setUint8(2, 0x63);
    dv.setUint8(3, 0x00);
    dv.setUint8(4, 0x00);
    expect(unpack("5s", dv)).toEqual(["a\0c\0\0"]);
  });

  it("unpacks zero-width string", () => {
    const buf = pack("0s", "");
    expect(unpack("0s", buf)).toEqual([""]);
  });
});

describe("unpack - pascal strings (p)", () => {
  it("unpacks pascal string", () => {
    const buf = pack("5p", "abc");
    expect(unpack("5p", buf)).toEqual(["abc"]);
  });

  it("respects length byte (truncates to data portion)", () => {
    const buf = new ArrayBuffer(5);
    const dv = new DataView(buf);
    dv.setUint8(0, 10);
    dv.setUint8(1, 0x61);
    dv.setUint8(2, 0x62);
    dv.setUint8(3, 0x63);
    dv.setUint8(4, 0x00);
    expect(unpack("5p", dv)).toEqual(["abc\0"]);
  });

  it("returns empty string for zero length byte", () => {
    const buf = new ArrayBuffer(5);
    const dv = new DataView(buf);
    dv.setUint8(0, 0);
    expect(unpack("5p", dv)).toEqual([""]);
  });

  it("unpacks 1-byte pascal (length only, no data)", () => {
    const buf = pack("1p", "");
    expect(unpack("1p", buf)).toEqual([""]);
  });
});

describe("unpack - boolean", () => {
  it("unpacks true", () => {
    const buf = pack("?", true);
    expect(unpack("?", buf)).toEqual([true]);
  });

  it("unpacks false", () => {
    const buf = pack("?", false);
    expect(unpack("?", buf)).toEqual([false]);
  });
});

describe("unpack - pad bytes", () => {
  it("skips single pad byte", () => {
    const buf = pack("xB", 42);
    expect(unpack("xB", buf)).toEqual([42]);
  });

  it("skips multiple pad bytes", () => {
    const buf = pack("10xB", 99);
    expect(unpack("10xB", buf)).toEqual([99]);
  });
});

describe("unpack - repeat counts", () => {
  it("unpacks repeated integers", () => {
    const buf = pack("3I", 1, 2, 3);
    expect(unpack("3I", buf)).toEqual([1, 2, 3]);
  });

  it("unpacks repeated shorts", () => {
    const buf = pack("4H", 10, 20, 30, 40);
    expect(unpack("4H", buf)).toEqual([10, 20, 30, 40]);
  });

  it("unpacks repeated booleans", () => {
    const buf = pack("3?", true, false, true);
    expect(unpack("3?", buf)).toEqual([true, false, true]);
  });
});

describe("unpack - multiple fields", () => {
  it("unpacks Ifc", () => {
    const buf = pack("Ifc", 9184, 10.5, "a");
    const result = unpack("Ifc", buf);
    expect(result[0]).toBe(9184);
    expect(Math.abs(result[1] - 10.5)).toBeLessThan(0.001);
    expect(result[2]).toBe("a");
  });

  it("unpacks mixed types with big-endian", () => {
    const buf = pack(">Hib", 1000, -50, 10);
    expect(unpack(">Hib", buf)).toEqual([1000, -50, 10]);
  });
});

describe("unpack - all endianness prefixes", () => {
  it("handles @ (little endian)", () => {
    const buf = pack("@I", 0xDEADBEEF);
    expect(unpack("@I", buf)).toEqual([0xDEADBEEF]);
  });

  it("handles = (little endian)", () => {
    const buf = pack("=I", 0xDEADBEEF);
    expect(unpack("=I", buf)).toEqual([0xDEADBEEF]);
  });

  it("handles < (little endian)", () => {
    const buf = pack("<I", 0xDEADBEEF);
    expect(unpack("<I", buf)).toEqual([0xDEADBEEF]);
  });

  it("handles > (big endian)", () => {
    const buf = pack(">I", 0xDEADBEEF);
    expect(unpack(">I", buf)).toEqual([0xDEADBEEF]);
  });

  it("handles ! (big endian)", () => {
    const buf = pack("!I", 0xDEADBEEF);
    expect(unpack("!I", buf)).toEqual([0xDEADBEEF]);
  });

  it("< and > produce different byte orders", () => {
    const le = pack("<I", 1);
    const be = pack(">I", 1);
    expect(bufToHex(le)).toBe("01000000");
    expect(bufToHex(be)).toBe("00000001");
  });
});

describe("unpack - buffer size enforcement", () => {
  it("throws when buffer is too small", () => {
    expect(() => unpack("I", new ArrayBuffer(2))).toThrow(StructError);
    expect(() => unpack("I", new ArrayBuffer(2))).toThrow("Buffer too small");
  });

  it("throws when buffer is too large", () => {
    expect(() => unpack("I", new ArrayBuffer(8))).toThrow(StructError);
    expect(() => unpack("I", new ArrayBuffer(8))).toThrow("Buffer too large");
  });

  it("accepts exact-size buffer", () => {
    expect(() => unpack("I", new ArrayBuffer(4))).not.toThrow();
  });

  it("accepts exact-size buffer for complex format", () => {
    const buf = pack("2Ifd", 1, 2, 3.0, 4.0);
    expect(() => unpack("2Ifd", buf)).not.toThrow();
  });
});

describe("unpack - string input (legacy)", () => {
  it("accepts string input and converts", () => {
    const packed = pack("I", 1234);
    const bytes = new Uint8Array(packed);
    const str = String.fromCharCode(...bytes);
    expect(unpack("I", str)).toEqual([1234]);
  });

  it("accepts ArrayBuffer input", () => {
    const buf = pack("H", 42);
    expect(unpack("H", buf)).toEqual([42]);
  });
});

describe("pack", () => {
  it("packs unsigned int", () => {
    const buf = pack("I", 1234);
    const dv = new DataView(buf);
    expect(dv.getUint32(0, true)).toBe(1234);
  });

  it("packs big-endian unsigned int", () => {
    const buf = pack(">I", 1234);
    const dv = new DataView(buf);
    expect(dv.getUint32(0, false)).toBe(1234);
  });

  it("packs float", () => {
    const buf = pack("f", 10.5);
    expect(Math.abs(new DataView(buf).getFloat32(0, true) - 10.5)).toBeLessThan(0.001);
  });

  it("packs double", () => {
    const buf = pack("d", 3.14);
    expect(new DataView(buf).getFloat64(0, true)).toBeCloseTo(3.14, 10);
  });

  it("packs boolean true", () => {
    expect(new DataView(pack("?", true)).getUint8(0)).toBe(1);
  });

  it("packs boolean false", () => {
    expect(new DataView(pack("?", false)).getUint8(0)).toBe(0);
  });

  it("packs multiple fields", () => {
    const buf = pack("HIf", 100, 200, 3.14);
    expect(buf.byteLength).toBe(2 + 4 + 4);
  });

  it("packs with pad bytes", () => {
    const buf = pack("xxB", 42);
    expect(buf.byteLength).toBe(3);
    expect(new DataView(buf).getUint8(2)).toBe(42);
  });

  it("packs signed long long from bigint", () => {
    const buf = pack("q", -100n);
    expect(new DataView(buf).getBigInt64(0, true)).toBe(-100n);
  });

  it("packs unsigned long long from bigint", () => {
    const buf = pack("Q", 0xFFFFFFFFn);
    expect(new DataView(buf).getBigUint64(0, true)).toBe(0xFFFFFFFFn);
  });

  it("packs char", () => {
    expect(new DataView(pack("c", "Z")).getUint8(0)).toBe(90);
  });
});

describe("pack - fixed-width strings (s)", () => {
  it("packs string into fixed-width field", () => {
    const buf = pack("4s", "abc");
    const dv = new DataView(buf);
    expect(dv.getUint8(0)).toBe(0x61);
    expect(dv.getUint8(1)).toBe(0x62);
    expect(dv.getUint8(2)).toBe(0x63);
    expect(dv.getUint8(3)).toBe(0x00);
    expect(buf.byteLength).toBe(4);
  });

  it("truncates string that exceeds field width", () => {
    const buf = pack("2s", "abcdef");
    const dv = new DataView(buf);
    expect(dv.getUint8(0)).toBe(0x61);
    expect(dv.getUint8(1)).toBe(0x62);
    expect(buf.byteLength).toBe(2);
  });

  it("pads string shorter than field width", () => {
    const buf = pack("10s", "hi");
    const dv = new DataView(buf);
    expect(dv.getUint8(0)).toBe(0x68);
    expect(dv.getUint8(1)).toBe(0x69);
    for (let i = 2; i < 10; i++) {
      expect(dv.getUint8(i)).toBe(0x00);
    }
    expect(buf.byteLength).toBe(10);
  });

  it("packs zero-width string", () => {
    const buf = pack("0s", "anything");
    expect(buf.byteLength).toBe(0);
  });
});

describe("pack - pascal strings (p)", () => {
  it("packs pascal string with length prefix", () => {
    const buf = pack("5p", "abc");
    const dv = new DataView(buf);
    expect(dv.getUint8(0)).toBe(3);
    expect(dv.getUint8(1)).toBe(0x61);
    expect(dv.getUint8(2)).toBe(0x62);
    expect(dv.getUint8(3)).toBe(0x63);
    expect(dv.getUint8(4)).toBe(0x00);
    expect(buf.byteLength).toBe(5);
  });

  it("truncates string that exceeds data portion", () => {
    const buf = pack("4p", "abcdef");
    const dv = new DataView(buf);
    expect(dv.getUint8(0)).toBe(3);
    expect(dv.getUint8(1)).toBe(0x61);
    expect(dv.getUint8(2)).toBe(0x62);
    expect(dv.getUint8(3)).toBe(0x63);
    expect(buf.byteLength).toBe(4);
  });

  it("packs empty string", () => {
    const buf = pack("5p", "");
    const dv = new DataView(buf);
    expect(dv.getUint8(0)).toBe(0);
    for (let i = 1; i < 5; i++) {
      expect(dv.getUint8(i)).toBe(0x00);
    }
    expect(buf.byteLength).toBe(5);
  });

  it("packs 1-byte pascal (length only)", () => {
    const buf = pack("1p", "");
    const dv = new DataView(buf);
    expect(dv.getUint8(0)).toBe(0);
    expect(buf.byteLength).toBe(1);
  });
});

describe("pack - repeat counts", () => {
  it("packs repeated integers", () => {
    const buf = pack("3I", 10, 20, 30);
    const dv = new DataView(buf);
    expect(dv.getUint32(0, true)).toBe(10);
    expect(dv.getUint32(4, true)).toBe(20);
    expect(dv.getUint32(8, true)).toBe(30);
    expect(buf.byteLength).toBe(12);
  });

  it("packs repeated chars", () => {
    const buf = pack("3c", "X", "Y", "Z");
    const dv = new DataView(buf);
    expect(dv.getUint8(0)).toBe(88);
    expect(dv.getUint8(1)).toBe(89);
    expect(dv.getUint8(2)).toBe(90);
  });

  it("packs repeated pad bytes", () => {
    const buf = pack("5xB", 99);
    expect(buf.byteLength).toBe(6);
    expect(new DataView(buf).getUint8(5)).toBe(99);
  });
});

describe("pack - argument count validation", () => {
  it("throws on too few arguments", () => {
    expect(() => pack("II", 1)).toThrow(StructError);
    expect(() => pack("II", 1)).toThrow("pack requires 2 values");
  });

  it("throws on too many arguments", () => {
    expect(() => pack("I", 1, 2)).toThrow(StructError);
    expect(() => pack("I", 1, 2)).toThrow("pack expected 1 values");
  });

  it("counts correctly with pad bytes and strings", () => {
    expect(() => pack("xIs", 42, "hello")).not.toThrow();
    expect(() => pack("xIs", 42)).toThrow(StructError);
    expect(() => pack("xIs", 42, "hello", "extra")).toThrow(StructError);
  });

  it("counts correctly with repeat counts", () => {
    expect(() => pack("3I", 1, 2, 3)).not.toThrow();
    expect(() => pack("3I", 1, 2)).toThrow(StructError);
    expect(() => pack("3I", 1, 2, 3, 4)).toThrow(StructError);
  });

  it("string/pascal count as one value regardless of width", () => {
    expect(() => pack("4s10p", "a", "b")).not.toThrow();
    expect(() => pack("4s10p", "a")).toThrow(StructError);
  });
});

describe("pack - numeric range validation", () => {
  it("rejects unsigned char overflow", () => {
    expect(() => pack("B", 256)).toThrow(StructError);
    expect(() => pack("B", 256)).toThrow("out of range");
    expect(() => pack("B", -1)).toThrow(StructError);
  });

  it("rejects signed char overflow", () => {
    expect(() => pack("b", 128)).toThrow(StructError);
    expect(() => pack("b", -129)).toThrow(StructError);
  });

  it("rejects unsigned short overflow", () => {
    expect(() => pack("H", 65536)).toThrow(StructError);
    expect(() => pack("H", -1)).toThrow(StructError);
  });

  it("rejects signed short overflow", () => {
    expect(() => pack("h", 32768)).toThrow(StructError);
    expect(() => pack("h", -32769)).toThrow(StructError);
  });

  it("rejects unsigned int overflow", () => {
    expect(() => pack("I", -1)).toThrow(StructError);
    expect(() => pack("I", 4294967296)).toThrow(StructError);
  });

  it("rejects signed int overflow", () => {
    expect(() => pack("i", 2147483648)).toThrow(StructError);
    expect(() => pack("i", -2147483649)).toThrow(StructError);
  });

  it("rejects non-integer for integer format", () => {
    expect(() => pack("I", 1.5)).toThrow(StructError);
    expect(() => pack("I", 1.5)).toThrow("Non-integer");
    expect(() => pack("b", NaN)).toThrow(StructError);
    expect(() => pack("h", "foo")).toThrow(StructError);
  });

  it("accepts boundary values for unsigned char", () => {
    expect(() => pack("B", 0)).not.toThrow();
    expect(() => pack("B", 255)).not.toThrow();
  });

  it("accepts boundary values for signed char", () => {
    expect(() => pack("b", -128)).not.toThrow();
    expect(() => pack("b", 127)).not.toThrow();
  });
});

describe("round-trip pack/unpack", () => {
  it("round-trips unsigned int", () => {
    for (const val of [0, 1, 255, 65535, 0xDEADBEEF]) {
      expect(unpack("I", pack("I", val))).toEqual([val]);
    }
  });

  it("round-trips signed int", () => {
    for (const val of [-1, 0, 1, -2147483648, 2147483647]) {
      expect(unpack("i", pack("i", val))).toEqual([val]);
    }
  });

  it("round-trips short", () => {
    for (const val of [-32768, 0, 32767]) {
      expect(unpack("h", pack("h", val))).toEqual([val]);
    }
  });

  it("round-trips unsigned short", () => {
    for (const val of [0, 65535]) {
      expect(unpack("H", pack("H", val))).toEqual([val]);
    }
  });

  it("round-trips big-endian", () => {
    const result = unpack(">If", pack(">If", 42, 1.5));
    expect(result[0]).toBe(42);
    expect(result[1]).toBeCloseTo(1.5, 5);
  });

  it("round-trips multiple types", () => {
    const result = unpack("HHIfc", pack("HHIfc", 1, 2, 3, 4.0, "Z"));
    expect(result).toEqual([1, 2, 3, expect.closeTo(4.0, 5), "Z"]);
  });

  it("round-trips repeated integers", () => {
    const vals = [100, 200, 300, 400];
    expect(unpack("4I", pack("4I", ...vals))).toEqual(vals);
  });

  it("round-trips fixed-width string", () => {
    expect(unpack("6s", pack("6s", "hello"))).toEqual(["hello\0"]);
  });

  it("round-trips pascal string", () => {
    expect(unpack("10p", pack("10p", "hello"))).toEqual(["hello"]);
  });

  it("round-trips mixed with pad bytes", () => {
    const buf = pack("xIH", 42, 100);
    const result = unpack("xIH", buf);
    expect(result).toEqual([42, 100]);
  });
});

describe("error handling", () => {
  it("throws on empty format string", () => {
    expect(() => unpack("", new ArrayBuffer(0))).toThrow(StructError);
    expect(() => pack("")).toThrow(StructError);
  });

  it("throws on invalid format character", () => {
    expect(() => unpack("Z", new ArrayBuffer(1))).toThrow(StructError);
    expect(() => unpack("IZ", new ArrayBuffer(4))).toThrow(StructError);
    expect(() => pack("Z", 1)).toThrow(StructError);
  });

  it("throws on trailing digits", () => {
    expect(() => unpack("123", new ArrayBuffer(1))).toThrow(StructError);
    expect(() => pack("123", 1)).toThrow(StructError);
  });

  it("throws on invalid input type", () => {
    expect(() => unpack("I", 42)).toThrow(StructError);
    expect(() => unpack("I", null)).toThrow(StructError);
    expect(() => unpack("I", undefined)).toThrow(StructError);
  });
});

describe("constants", () => {
  it("exports LITTLE_ENDIAN as 0", () => {
    expect(LITTLE_ENDIAN).toBe(0);
  });

  it("exports BIG_ENDIAN as 1", () => {
    expect(BIG_ENDIAN).toBe(1);
  });
});

describe("format string edge cases", () => {
  it("handles endianness prefix with no format chars", () => {
    expect(() => pack(">")).toThrow(StructError);
    expect(() => unpack(">")).toThrow(StructError);
  });

  it("handles count-only format (no prefix)", () => {
    expect(() => pack("3", 1)).toThrow(StructError);
  });

  it("calcSize matches actual packed size", () => {
    const fmt = "2IHfd3s10x";
    expect(pack(fmt, 1, 2, 3, 4.0, 5.0, "abc").byteLength).toBe(calcSize(fmt));
  });
});
