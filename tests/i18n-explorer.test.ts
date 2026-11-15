import { describe, expect, it } from "vitest";
import { DATASETS, TOPICS } from "@/features/explorer/catalog";
import { INDICATOR_MY, LIMITATION_MY, TOPIC_MY, UI, spatialBasisMy } from "@/features/explorer/i18n";

const burmese = /[က-႟]/;
describe("Burmese text for the Explore workspace", () => {
  it("names every topic and every sidebar indicator in Burmese", () => {
    for (const t of TOPICS) {
      expect(TOPIC_MY[t.id], t.id).toMatch(burmese);
      for (const i of t.indicators) {
        expect(INDICATOR_MY[i.label]?.label, i.label).toMatch(burmese);
        expect(INDICATOR_MY[i.label]?.summary, i.label).toMatch(burmese);
      }
    }
  });
  it("has a Burmese limitations note for every catalogue dataset that keeps the key caveats", () => {
    for (const d of DATASETS) expect(LIMITATION_MY[d.id], d.id).toMatch(burmese);
    expect(LIMITATION_MY["aerosol-optical-depth"]).toContain("PM2.5");
    expect(LIMITATION_MY["drought-indicators"]).toContain("၂၀၀၉–၂၀၂၅");
    expect(LIMITATION_MY["burned-area"]).toContain("၀%");
    expect(LIMITATION_MY["lit-area"]).toContain("2 nW·cm⁻²·sr⁻¹");
  });
  it("has the same UI keys in both languages", () => {
    expect(Object.keys(UI.my).sort()).toEqual(Object.keys(UI.en).sort());
    for (const [k, v] of Object.entries(UI.my)) if (typeof v === "string") expect(v, k).toMatch(burmese);
  });
  it("translates spatial-basis labels while keeping coordinates and identifiers", () => {
    expect(spatialBasisMy("Township Representative Point (20.8271°N, 95.7490°E) · 5 × 5 pixel window (about 2.3 km × 2.3 km)"))
      .toBe("မြို့နယ် ကိုယ်စားပြု အမှတ် (20.8271°N, 95.7490°E) · 5 × 5 pixel ဝင်းဒိုး (ခန့်မှန်း 2.3 km × 2.3 km)");
    expect(spatialBasisMy("Full Region Area Average")).toBe("တိုင်း/ပြည်နယ် နယ်မြေတစ်ခုလုံး ပျမ်းမျှ");
    expect(spatialBasisMy("SWOT river reach 44587800011, 1.1 km from the Township Representative Point (24.9579°N, 97.1096°E)")).toContain("44587800011");
  });
});
