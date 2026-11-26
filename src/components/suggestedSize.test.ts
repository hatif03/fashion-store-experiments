import { describe, expect, it } from "vitest";
import { suggestedSize } from "./suggestedSize";

const stock = (gone: string[]) => (size: string) => !gone.includes(size);

describe("suggestedSize", () => {
  it("picks the middle in-stock size", () => {
    expect(suggestedSize(["XS", "S", "M", "L", "XL"], stock([]))).toBe("M");
    expect(suggestedSize(["S", "M", "L", "XL"], stock(["S"]))).toBe("L");
  });

  it("returns nothing when every size is gone", () => {
    expect(suggestedSize(["S", "M"], stock(["S", "M"]))).toBeNull();
  });
});
