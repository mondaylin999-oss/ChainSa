import { describe, expect, it } from "vitest";
import { historicalWindowSums, percentileRank, quantile, sameDateInYear, toDailyMap, windowSum } from "@/features/earthlens-chat/server/climate/stats";
import { forbiddenClaims } from "@/features/earthlens-chat/server/verify";

describe("climate statistics", () => {
  it("handles leap days", () => {
    expect(sameDateInYear("2024-02-29", 2023)).toBe("2023-02-28");
    expect(sameDateInYear("2024-02-29", 2020)).toBe("2020-02-29");
  });
  it("computes percentile ranks and quantiles", () => {
    const s = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(percentileRank(0, s)).toBe(0);
    expect(percentileRank(5, s)).toBe(45);
    expect(percentileRank(11, s)).toBe(100);
    expect(quantile(s, 0.5)).toBe(5.5);
  });
  it("requires 90% coverage for window sums", () => {
    const m = toDailyMap([{ date: "2026-01-01", value: 1 }, { date: "2026-01-02", value: null }, { date: "2026-01-03", value: 2 }]);
    expect(windowSum(m, "2026-01-01", "2026-01-03")).toBeUndefined();
    expect(windowSum(m, "2026-01-01", "2026-01-01")).toBe(1);
  });
  it("uses only past windows that end before the cutoff", () => {
    const pts = [];
    for (let y = 2020; y <= 2026; y++) pts.push({ date: `${y}-06-10`, value: y - 2019 });
    const m = toDailyMap(pts);
    const out = historicalWindowSums(m, "2026-06-10", 1, 2020, "2026-06-10");
    expect(out.map((o) => o.year)).toEqual([2020, 2021, 2022, 2023, 2024, 2025]);
  });
});

describe("forecast / probability wording guard", () => {
  it("flags forecast claims and invented probabilities in English and Myanmar", () => {
    expect(forbiddenClaims("There is a 60% chance of drought.")).not.toHaveLength(0);
    expect(forbiddenClaims("The probability of flooding is 0.4")).not.toHaveLength(0);
    expect(forbiddenClaims("It will rain next week.")).not.toHaveLength(0);
    expect(forbiddenClaims("ရေကြီးနိုင်ခြေ ဖြစ်နိုင်ခြေ ၇၀ ရာခိုင်နှုန်း")).not.toHaveLength(0);
    expect(forbiddenClaims("In past years this period was usually dry.")).toHaveLength(0);
    expect(forbiddenClaims("Soil wetness ranks at the 15th percentile.")).toHaveLength(0);
  });
});
