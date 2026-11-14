import { describe, expect, it } from "vitest";
import { observationDateError } from "@/features/explorer/dates";
describe("historical observation dates",()=>{
 it("accepts the complete 1989-to-current range",()=>expect(observationDateError("1989-01-01","2026-11-14","2026-11-14")).toBe(""));
 it("holds incomplete edits without accepting empty dates",()=>expect(observationDateError("","2026-11-14")).toContain("Choose both"));
 it("rejects impossible dates, reversed ranges and future observations",()=>{
  expect(observationDateError("2026-02-30","2026-11-14","2026-11-14")).toContain("real calendar");
  expect(observationDateError("2026-11-14","1989-01-01","2026-11-14")).toContain("on or before");
  expect(observationDateError("1989-01-01","2026-11-15","2026-11-14")).toContain("Future");
 });
});
