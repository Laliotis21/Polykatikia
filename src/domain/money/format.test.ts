import { describe, it, expect } from "vitest";
import { formatEurFromCents } from "./format";

describe("formatEurFromCents", () => {
  it("formats el-GR EUR from cents", () => {
    const s = formatEurFromCents(123456);
    expect(s).toMatch(/1.?234,56/);
    expect(s).toMatch(/€/);
  });
});
