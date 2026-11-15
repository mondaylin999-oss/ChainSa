import { afterEach, describe, expect, it, vi } from "vitest";
import { calculateChartDomain } from "../src/features/environmental/components/EnvironmentalChart";
import { EarthbeatEngine, earthbeatNearest, earthbeatObservations, earthbeatPitch, earthbeatRange, earthbeatTimeFraction } from "../src/features/earthbeat/core";

const rows = [
  {date:"2024-01-11", T2M:35},
  {date:"2024-01-01", T2M:25},
  {date:"2024-01-02", T2M:null},
];

function audioFixture(resume = () => Promise.resolve()) {
  const clockStart = Date.now();
  const gain = { value: 0, cancelScheduledValues: vi.fn(), setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() };
  const frequency = { value: 0, cancelScheduledValues: vi.fn(), setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() };
  const oscillator = { type: "sine", frequency, connect: vi.fn((target: unknown) => target), start: vi.fn(), stop: vi.fn(), disconnect: vi.fn(), onended: null };
  const gainNode = { gain, connect: vi.fn(), disconnect: vi.fn() };
  const context = {
    get currentTime() { return (Date.now() - clockStart) / 1000; },
    destination: {}, resume: vi.fn(resume), close: vi.fn(() => Promise.resolve()),
    createGain: vi.fn(() => gainNode), createOscillator: vi.fn(() => oscillator),
  };
  return { context: context as unknown as AudioContext, gain, frequency, oscillator, createOscillator: context.createOscillator };
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

describe("EARTHBEAT continuous playback", () => {
  it("changes and clamps live volume independently of the pitch and missing-data envelope", async () => {
    vi.useFakeTimers();
    const audio = audioFixture();
    const envelope = audio.context.createGain();
    const output = { gain: { value: 2, setValueAtTime: vi.fn(), cancelScheduledValues: vi.fn(), linearRampToValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() };
    vi.mocked(audio.context.createGain).mockReturnValueOnce(envelope).mockReturnValueOnce(output as unknown as GainNode);
    const player = new EarthbeatEngine(vi.fn(), vi.fn(), () => audio.context);
    player.load(earthbeatObservations(rows, "T2M"));
    player.setVolume(75);
    await player.play();
    expect(output.gain.setValueAtTime).toHaveBeenCalledWith(3, 0);
    const pitchCalls = audio.frequency.linearRampToValueAtTime.mock.calls.length;
    player.setVolume(-10);
    expect(output.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0, .05);
    player.setVolume(200);
    expect(output.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(4, .05);
    expect(audio.frequency.linearRampToValueAtTime.mock.calls.length).toBe(pitchCalls);
    player.dispose();
  });
  it("starts only on request, glides across timestamps and repeats on the same oscillator", async () => {
    vi.useFakeTimers();
    const audio = audioFixture();
    const create = vi.fn(() => audio.context);
    const progress = vi.fn();
    const player = new EarthbeatEngine(progress, vi.fn(), create);
    player.load(earthbeatObservations([{date:"2024-01-01",T2M:25},{date:"2024-01-02",T2M:30},{date:"2024-01-11",T2M:35}], "T2M"));
    expect(create).not.toHaveBeenCalled();
    await player.play();
    expect(audio.frequency.linearRampToValueAtTime.mock.calls[0][0]).toBe(550);
    expect(audio.frequency.linearRampToValueAtTime.mock.calls[0][1]).toBeCloseTo(2.4);
    vi.advanceTimersByTime(12000);
    expect(progress).toHaveBeenLastCalledWith(1, expect.anything(), .5);
    vi.advanceTimersByTime(12000);
    expect(audio.createOscillator).toHaveBeenCalledTimes(1);
    expect(audio.oscillator.stop).not.toHaveBeenCalled();
    expect(progress).toHaveBeenLastCalledWith(0, expect.anything(), 0);
    player.pause();
    const calls = progress.mock.calls.length;
    vi.advanceTimersByTime(48000);
    expect(progress).toHaveBeenCalledTimes(calls);
    expect(audio.oscillator.stop).toHaveBeenCalled();
    player.dispose();
  });

  it("silences explicit missing readings and unsupported long gaps", async () => {
    vi.useFakeTimers();
    const audio = audioFixture();
    const player = new EarthbeatEngine(vi.fn(), vi.fn(), () => audio.context);
    player.load(earthbeatObservations([
      {date:"2024-01-01",T2M:25}, {date:"2024-01-02",T2M:null},
      {date:"2024-01-03",T2M:30}, {date:"2024-01-04",T2M:31}, {date:"2024-01-11",T2M:35},
    ], "T2M"));
    await player.play();
    expect(audio.gain.setValueAtTime.mock.calls.some(([value, time]) => value === 0 && Math.abs(time - 2.4) < 1e-9)).toBe(true);
    expect(audio.frequency.setValueAtTime).toHaveBeenCalledWith(880, 24);
    expect(audio.frequency.linearRampToValueAtTime).not.toHaveBeenCalledWith(880, 24);
    player.dispose();
  });

  it("inspects points silently and stops the previous location when data is replaced", async () => {
    vi.useFakeTimers();
    const audio = audioFixture();
    const progress = vi.fn();
    const state = vi.fn();
    const player = new EarthbeatEngine(progress, state, () => audio.context);
    player.load(earthbeatObservations(rows,"T2M"));
    await player.seek(2);
    expect(audio.createOscillator).not.toHaveBeenCalled();
    expect(progress).toHaveBeenLastCalledWith(2, expect.objectContaining({value:35}), 1);
    await player.play();
    player.load(earthbeatObservations([{date:"2024-02-01",T2M:10}],"T2M"));
    const count = progress.mock.calls.length;
    vi.advanceTimersByTime(48000);
    expect(progress).toHaveBeenCalledTimes(count);
    expect(state).toHaveBeenLastCalledWith("paused");
    player.dispose();
    expect(audio.context.close).toHaveBeenCalled();
  });

  it("cancels pending audio startup on stop, replacement or disposal", async () => {
    for (const action of ["pause", "load", "dispose"] as const) {
      let resume!: () => void;
      const audio = audioFixture(() => new Promise<void>(resolve => { resume = resolve; }));
      const progress = vi.fn();
      const player = new EarthbeatEngine(progress, vi.fn(), () => audio.context);
      player.load(earthbeatObservations(rows,"T2M"));
      const play = player.play();
      if (action === "load") player.load([]); else player[action]();
      resume();
      await play;
      expect(audio.createOscillator).not.toHaveBeenCalled();
      expect(progress).not.toHaveBeenCalled();
      if (action !== "dispose") player.dispose();
    }
  });
});

describe("selected location graph scale", () => {
  it("rebuilds the domain from township readings instead of retaining the regional scale", () => {
    const regional = calculateChartDomain([10, 40], "temperature")!;
    const township = calculateChartDomain([26, 27], "temperature")!;
    expect(regional.min).toBeLessThan(township.min);
    expect(regional.max).toBeGreaterThan(township.max);
    expect(calculateChartDomain([], "temperature")).toBeUndefined();
    expect(calculateChartDomain([NaN], "temperature")).toBeUndefined();
    expect(calculateChartDomain([.3, .5], "ndvi")).toEqual({min: -1, max: 1});
  });
});
