import { afterEach, describe, expect, it, vi } from "vitest";
import { EarthbeatEngine, earthbeatNearest, earthbeatObservations, earthbeatPitch, earthbeatRange, earthbeatTimeFraction } from "../src/features/earthbeat/core";

const rows = [
  {date:"2024-01-11", T2M:35},
  {date:"2024-01-01", T2M:25},
  {date:"2024-01-02", T2M:null},
];

function audioFixture(resume = () => Promise.resolve()) {
  const frequencies: number[] = [];
  const stops = vi.fn();
  const gains: Array<{value:number;setTargetAtTime:ReturnType<typeof vi.fn>}> = [];
  const context = {
    currentTime:0, destination:{}, resume:vi.fn(resume), close:vi.fn(()=>Promise.resolve()),
    createGain:()=> {
      const gain = {value:1,setValueAtTime:vi.fn(),linearRampToValueAtTime:vi.fn(),setTargetAtTime:vi.fn()};
      gains.push(gain);
      const node = {gain,connect:()=>node,disconnect:vi.fn()};
      return node;
    },
    createOscillator:()=> {
      const node = {type:"sine",frequency:{value:0},onended:null,connect:(target:unknown)=>target,
        start:()=>frequencies.push(node.frequency.value),stop:stops,disconnect:vi.fn()};
      return node;
    },
  };
  return {context:context as unknown as AudioContext, frequencies,stops,gains};
}

afterEach(()=>vi.useRealTimers());

describe("EARTHBEAT shared observations",()=>{
  it("sorts dates and preserves missing values rather than sounding zeros",()=>{
    const points = earthbeatObservations([...rows,{date:"2024-01-03",T2M:-999},{date:"2024-01-04",T2M:0},{date:"invalid",T2M:30}],"T2M");
    expect(points.map(point=>point.value)).toEqual([25,null,null,0,35]);
    expect(earthbeatRange(points)).toEqual([0,35]);
  });
  it("uses elapsed dates for graph positions and finds the nearest valid point",()=>{
    const points = earthbeatObservations(rows,"T2M");
    expect(earthbeatTimeFraction(points[1],points)).toBeCloseTo(0.1);
    expect(earthbeatNearest(points,0.1)).toBe(0);
    expect(earthbeatNearest(points,0.9)).toBe(2);
    expect(earthbeatNearest([],0.5)).toBe(-1);
  });
  it("keeps actual temperature and negative anomaly ranges and maps pitch consistently",()=>{
    expect(earthbeatRange(earthbeatObservations(rows,"T2M"))).toEqual([25,35]);
    expect(earthbeatPitch(25,[25,35])).toBe(220);
    expect(earthbeatPitch(35,[25,35])).toBe(880);
    expect(earthbeatPitch(-5,[-10,0])).toBe(550);
    expect(earthbeatPitch(7,[7,7])).toBe(550);
  });
});

describe("EARTHBEAT audio and graph synchronization",()=>{
  it("creates audio only after an explicit action, and skips missing notes while advancing the graph",async()=>{
    vi.useFakeTimers();
    const audio = audioFixture();
    const createContext = vi.fn(()=>audio.context);
    const progress = vi.fn();
    const state = vi.fn();
    const player = new EarthbeatEngine(progress,state,createContext);
    player.load(earthbeatObservations(rows,"T2M"));
    expect(createContext).not.toHaveBeenCalled();
    await player.play();
    expect(progress.mock.calls[0][0]).toBe(0);
    expect(audio.frequencies).toEqual([220]);
    vi.advanceTimersByTime(250);
    expect(progress.mock.calls[1][0]).toBe(2);
    expect(audio.frequencies).toEqual([220,880]);
    vi.advanceTimersByTime(250);
    expect(state).toHaveBeenLastCalledWith("playing");
    expect(progress.mock.calls[2][0]).toBe(0);
    expect(audio.frequencies).toEqual([220,880,220]);
    player.pause();
    vi.advanceTimersByTime(1000);
    expect(progress).toHaveBeenCalledTimes(3);
    player.dispose();
  });
  it("selecting a graph point auditions that point and Play resumes from the selection",async()=>{
    vi.useFakeTimers();
    const audio = audioFixture();
    const progress = vi.fn();
    const player = new EarthbeatEngine(progress,vi.fn(),()=>audio.context);
    player.load(earthbeatObservations(rows,"T2M"));
    await player.seek(2);
    expect(progress).toHaveBeenLastCalledWith(2,expect.objectContaining({value:35}));
    expect(audio.frequencies).toEqual([880]);
    await player.play();
    expect(audio.frequencies).toEqual([880,880]);
    player.pause();
    const calls = progress.mock.calls.length;
    vi.advanceTimersByTime(1000);
    expect(progress).toHaveBeenCalledTimes(calls);
    player.restart();
    expect(progress).toHaveBeenLastCalledWith(0,expect.objectContaining({value:25}));
    player.dispose();
  });
  it("stops playback when a series is replaced and supports mute",async()=>{
    vi.useFakeTimers();
    const audio = audioFixture();
    const progress = vi.fn();
    const player = new EarthbeatEngine(progress,vi.fn(),()=>audio.context);
    player.setVolume(0);
    player.load(earthbeatObservations(rows,"T2M"));
    await player.play();
    expect(audio.gains[0].value).toBe(0);
    player.load(earthbeatObservations([{date:"2024-02-01",T2M:10}],"T2M"));
    vi.advanceTimersByTime(1000);
    expect(progress).toHaveBeenCalledTimes(1);
    expect(audio.stops).toHaveBeenCalled();
    player.dispose();
    expect(audio.context.close).toHaveBeenCalled();
  });
  it("cancels a pending audio start when the component is disposed",async()=>{
    let resolveResume!: () => void;
    const audio = audioFixture(()=>new Promise<void>(resolve=>{resolveResume=resolve;}));
    const progress = vi.fn();
    const player = new EarthbeatEngine(progress,vi.fn(),()=>audio.context);
    player.load(earthbeatObservations(rows,"T2M"));
    const play = player.play();
    player.dispose();
    resolveResume();
    await play;
    expect(progress).not.toHaveBeenCalled();
    expect(audio.frequencies).toEqual([]);
  });
});
