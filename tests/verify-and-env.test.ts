import { afterEach, describe, expect, it } from "vitest";
import { buildAllowed, verifyAnswer, toAsciiDigits } from "@/features/earthlens-chat/server/verify";
import { getConfig, resetConfigForTests, isFreeOpenRouterModel } from "@/features/earthlens-chat/server/env";
import { getRegion } from "@/features/earthlens-chat/regions";
import type { Fact } from "@/features/earthlens-chat/types";

const facts: Fact[] = [
  { id: "rain_total", param: "rainfall", label: "Total rainfall", labelMy: "", value: 19.2, unit: "mm", decimals: 1, period: { start: "2026-11-03", end: "2026-11-09" }, source: "nasa-power-daily" },
  { id: "temp_max", param: "temperature", label: "Highest daily maximum temperature", labelMy: "", value: 34.0, unit: "°C", decimals: 1, date: "2026-11-05", source: "nasa-power-daily" },
];
const allowed = buildAllowed(facts, getRegion("yangon")!);

describe("answer verification", () => {
  it("accepts numbers and dates from the facts (including rounding)", () => {
    const v = verifyAnswer("About 19.2 mm of rain fell from 2026-11-03 to 2026-11-09; the hottest day reached 34 °C on 2026-11-05 (about 19 mm total).", allowed);
    expect(v.ok).toBe(true);
    expect(v.checked).toBeGreaterThan(3);
  });
  it("rejects invented measurements and dates", () => {
    expect(verifyAnswer("Rainfall was 45.7 mm.", allowed).ok).toBe(false);
    expect(verifyAnswer("On 2026-12-01 it will rain.", allowed).unverified).toContain("2026-12-01");
    expect(verifyAnswer("Expect 80% chance of rain.", allowed).ok).toBe(false);
  });
  it("checks Myanmar digits too", () => {
    expect(toAsciiDigits("၁၉.၂")).toBe("19.2");
    expect(verifyAnswer("မိုးရေချိန် ၁၉.၂ မီလီမီတာ", allowed).ok).toBe(true);
    expect(verifyAnswer("မိုးရေချိန် ၅၅ မီလီမီတာ", allowed).ok).toBe(false);
  });
  it("ignores list numbering", () => {
    expect(verifyAnswer("1. Total rainfall was 19.2 mm\n2. Hot", allowed).ok).toBe(true);
  });
});

describe("free-only model configuration", () => {
  afterEach(() => {
    delete process.env.OPENROUTER_MODELS;
    delete process.env.GROQ_MODELS;
    delete process.env.OPENROUTER_MODEL;
    delete process.env.GROQ_MODEL;
    delete process.env.NASA_FIRMS_MAP_KEY;
    resetConfigForTests();
  });
  it("reads the brief's variable names and still refuses paid models", () => {
    process.env.OPENROUTER_MODEL = "openai/gpt-oss-120b:free";
    process.env.GROQ_MODEL = "openai/gpt-oss-20b";
    process.env.NASA_FIRMS_MAP_KEY = "test-map-key";
    process.env.AI_ALLOW_PAID_MODELS = "true";
    resetConfigForTests();
    const c = getConfig();
    expect(c.openrouter.models).toEqual(["openai/gpt-oss-120b:free"]);
    expect(c.groq.models).toEqual(["openai/gpt-oss-20b"]);
    expect(c.firmsMapKey).toBe("test-map-key");
    process.env.OPENROUTER_MODEL = "openai/gpt-5";
    resetConfigForTests();
    expect(getConfig().openrouter.models).toEqual([]);
    delete process.env.AI_ALLOW_PAID_MODELS;
  });
  it("only accepts OpenRouter free models", () => {
    expect(isFreeOpenRouterModel("openrouter/free")).toBe(true);
    expect(isFreeOpenRouterModel("meta-llama/llama-3.3-70b-instruct:free")).toBe(true);
    expect(isFreeOpenRouterModel("anthropic/claude-sonnet-4")).toBe(false);
    process.env.OPENROUTER_MODELS = "openai/gpt-4o,openrouter/free";
    resetConfigForTests();
    const c = getConfig();
    expect(c.openrouter.models).toEqual(["openrouter/free"]);
    expect(c.openrouter.rejectedModels).toEqual(["openai/gpt-4o"]);
  });
  it("only accepts allow-listed Groq models", () => {
    process.env.GROQ_MODELS = "openai/gpt-oss-20b,llama-3.3-70b-versatile";
    resetConfigForTests();
    expect(getConfig().groq.models).toEqual(["openai/gpt-oss-20b"]);
  });
});
