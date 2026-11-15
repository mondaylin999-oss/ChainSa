import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { chartText } from "../src/features/environmental/components/chartCopy";
import copy from "../public/myanmar-copy.json";

describe("Myanmar interface translation", () => {
 it("translates complete phrases without changing words inside unknown sentences", () => {
  const source = readFileSync("public/earthlens-language.js", "utf8");
  const context: Record<string, any> = {};
  runInNewContext(source.slice(0,source.indexOf("  function apply(locale)")) + ' globalThis.translate = function(value,locale) { current=locale; return textFor(value); }; })();', context);
  expect(context.translate("Myanmar is not a township-wide average.","my")).toBe("Myanmar is not a township-wide average.");
  expect(context.translate("MYANMAR EARTH INTELLIGENCE","my")).toBe(copy["MYANMAR EARTH INTELLIGENCE"]);
  expect(context.translate(copy["MYANMAR EARTH INTELLIGENCE"],"my")).toBe(copy["MYANMAR EARTH INTELLIGENCE"]);
  expect(context.translate(copy["MYANMAR EARTH INTELLIGENCE"],"en")).toBe("MYANMAR EARTH INTELLIGENCE");
 });
 it("translates dynamic summaries while retaining measurements and dates", () => {
  const input = "Air temperature recorded 30 valid °C observations. Values changed by 1.2500 °C (5.00%) from 2025-01-01 to 2025-01-30; this is a descriptive summary, not proof of causation or statistical significance.";
  const translated = chartText("my",input);
  expect(translated).not.toContain("recorded");
  for (const value of ["30","°C","1.2500","5.00%","2025-01-01","2025-01-30"]) expect(translated).toContain(value);
  expect(chartText("en",input)).toBe(input);
 });
 it("translates monthly completeness and calendar-quarter explanations", () => {
  expect(chartText("my","15 of 31 requested days")).toBe("တောင်းဆိုထားသော 31 ရက်အနက် 15 ရက်");
  expect(chartText("my","Jan 2025")).toBe("ဇန်နဝါရီ 2025");
  expect(chartText("my","Q1")).toBe("ပထမ သုံးလပတ်");
 });
});
