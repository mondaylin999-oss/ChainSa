import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";
import { chatRequestSchema } from "@/features/earthlens-chat/server/validation";

function adapterFixture(fail = false) {
  const nativeFetch = vi.fn();
  const analyze = vi.fn(async () => {
    if (fail) throw new Error("NASA unavailable");
    return {mode:"live",observations:[]};
  });
  const context = {
    window:{fetch:nativeFetch},
    iq:{safeParse:(data:unknown)=>({success:true,data})},
    oq:{safeParse:(data:unknown)=>({success:true,data})},
    Ni:(body:unknown,status=200)=>Response.json(body,{status}),
    bo:(id:string)=>({id}), sm:analyze,
    lm:(_region:unknown,_params:unknown,data:unknown)=>data,
    crypto:{randomUUID:()=>"request-id"},
  };
  vm.runInNewContext(readFileSync("scripts/earthlens-adapter.js","utf8"),context);
  return {fetch:context.window.fetch as unknown as typeof fetch,analyze,nativeFetch};
}

describe("live-only production data",()=>{
  it("rejects retired sample-mode requests before analysis or chat can run",async()=>{
    const adapter = adapterFixture();
    for (const url of ["/api/analyze","/api/chat"]) {
      const response = await adapter.fetch(url,{body:JSON.stringify({mode:"demo",regionId:"yangon",params:["rainfall"],message:"rain"})});
      expect(response.status).toBe(400);
    }
    expect(adapter.analyze).not.toHaveBeenCalled();
    expect(adapter.nativeFetch).not.toHaveBeenCalled();
    expect(chatRequestSchema.safeParse({message:"rain",mode:"demo"}).success).toBe(false);
    expect(chatRequestSchema.safeParse({message:"rain",mode:"live"}).success).toBe(true);
  });

  it("always requests real data, including when a client omits mode",async()=>{
    const adapter = adapterFixture();
    const response = await adapter.fetch("/api/analyze",{body:JSON.stringify({regionId:"yangon",params:["rainfall"]})});
    expect(response.status).toBe(200);
    expect(adapter.analyze).toHaveBeenCalledWith({id:"yangon"},["rainfall"],"live",undefined);
    expect(await response.json()).toMatchObject({mode:"live"});
  });

  it("returns an error instead of samples when NASA retrieval fails",async()=>{
    const adapter = adapterFixture(true);
    const response = await adapter.fetch("/api/analyze",{body:JSON.stringify({regionId:"yangon",params:["rainfall"],mode:"live"})});
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({error:"Could not retrieve the data. Please try again."});
    expect(adapter.analyze).toHaveBeenCalledTimes(1);
  });

  it("builds a browser application without the sample observation generator",()=>{
    execFileSync(process.execPath,["scripts/prepare-earthlens.mjs"]);
    const html = readFileSync("public/earthlens.html","utf8");
    expect(html).not.toContain("function N9e(");
    expect(html).not.toContain("demo-fire-");
    expect(html).not.toContain("setMode(");
    for (const script of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) expect(()=>new Function(script[1])).not.toThrow();
  });
});
