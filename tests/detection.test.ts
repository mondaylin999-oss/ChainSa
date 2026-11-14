import { describe, expect, it } from "vitest";
import { detectRegion } from "@/features/earthlens-chat/regions";
import { detectParams, detectLimitations } from "@/features/earthlens-chat/params";
import { detectLang } from "@/features/earthlens-chat/i18n";

describe("language detection", () => {
  it("detects English and Myanmar", () => {
    expect(detectLang("How much rain fell in Yangon?")).toBe("en");
    expect(detectLang("ရန်ကုန်မှာ မိုးဘယ်လောက်ရွာလဲ")).toBe("my");
    expect(detectLang("Yangon မှာ မိုးရေချိန် ဘယ်လောက်လဲ")).toBe("my");
    expect(detectLang("???", "my")).toBe("my");
  });
});

describe("region detection", () => {
  it("finds regions in English and Myanmar", () => {
    expect(detectRegion("rain in Ayeyarwady")?.id).toBe("ayeyarwady");
    expect(detectRegion("Irrawaddy delta")?.id).toBe("ayeyarwady");
    expect(detectRegion("မန္တလေးမှာ အပူချိန်")?.id).toBe("mandalay");
    expect(detectRegion("ရခိုင်ပြည်နယ် လေ")?.id).toBe("rakhine");
    expect(detectRegion("weather in general")).toBeUndefined();
  });
  it("does not confuse Kachin State with Chin State (demo bug fixed)", () => {
    expect(detectRegion("fires in Kachin State")?.id).toBe("kachin");
    expect(detectRegion("Chin State temperature")?.id).toBe("chin");
  });
});

describe("parameter detection", () => {
  it("maps questions to NASA parameters", () => {
    expect(detectParams("rainfall for farmers")).toEqual(expect.arrayContaining(["rainfall", "temperature"]));
    expect(detectParams("wind for fishing boats")).toContain("wind");
    expect(detectParams("any fires near Taunggyi?")).toContain("fires");
    expect(detectParams("မိုးရေချိန်")).toContain("rainfall");
    expect(detectParams("hello")).toEqual(["rainfall", "temperature", "humidity"]);
  });
  it("adds forecast and sea-safety limitations in the asked language", () => {
    expect(detectLimitations("will it rain tomorrow", "yangon", "en")[0]).toMatch(/not forecasts/);
    expect(detectLimitations("is it safe to fish", "rakhine", "my")[0]).toMatch(/DMH/);
  });
});

describe("Myanmar keyword edge cases", () => {
  it("does not treat Mandalay (မန္တလေး) as a wind question", () => {
    expect(detectParams("မန္တလေး အပူချိန်")).not.toContain("wind");
    expect(detectParams("ရခိုင် လေတိုက်နှုန်း")).toContain("wind");
  });
});
