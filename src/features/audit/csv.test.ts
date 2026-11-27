import { describe, expect, it } from "vitest";
import { parseCsv, safeCsv } from "./csv";

describe("csv", () => {
  it("reads quotes, commas and embedded newlines", () => {
    expect(parseCsv('a,"b,c","d ""e""",\r\n"line\r\nbreak",,x\n')).toEqual([
      ["a", "b,c", 'd "e"', ""],
      ["line\r\nbreak", "", "x"],
    ]);
  });
  it("round-trips safe values with every cell quoted", () => {
    expect(safeCsv("id,reason\r\n1,Owner request\r\n")).toBe('"id","reason"\r\n"1","Owner request"\r\n');
  });
  it.each(["=1+1", "+1", "-1", "@SUM(A1)", "\t=1", "\r=1"])("neutralises %j", (value) => {
    const [[out]] = parseCsv(safeCsv(`"${value}"`));
    expect(out).toBe(`'${value}`);
  });
  it("neutralises formulas hidden in quoted fields", () => {
    expect(safeCsv('x,"=HYPERLINK(""http://evil"",""a"")"')).toBe('"x","\'=HYPERLINK(""http://evil"",""a"")"\r\n');
  });
  it("refuses a truncated file", () => {
    expect(() => parseCsv('a,"b')).toThrow();
  });
});
