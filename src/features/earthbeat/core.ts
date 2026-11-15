/** Adapted from the supplied EARTHBEAT handover: shared observations for chart and sound. */
export interface EarthbeatObservation {
  date: string;
  time: number;
  value: number | null;
}

export function earthbeatObservations(rows: Array<Record<string, unknown>>, code: string): EarthbeatObservation[] {
  return rows.map(row => {
    const date = String(row.date ?? "");
    const time = /^\d{4}-\d{2}-\d{2}$/.test(date) ? Date.parse(`${date}T00:00:00Z`) : NaN;
    const raw = row[code];
    return {date, time, value: typeof raw === "number" && Number.isFinite(raw) && raw > -900 ? raw : null};
  }).filter(point => Number.isFinite(point.time)).sort((a, b) => a.time - b.time);
}

export function earthbeatRange(points: EarthbeatObservation[]): [number, number] {
  const values = points.flatMap(point => point.value === null ? [] : [point.value]);
  if (!values.length) return [0, 1];
  return [Math.min(...values), Math.max(...values)];
}

export function earthbeatPitch(value: number, range: [number, number]): number {
  const normalized = range[0] === range[1] ? 0.5 : Math.max(0, Math.min(1, (value - range[0]) / (range[1] - range[0])));
  return 220 + normalized * 660;
}

export function earthbeatTimeFraction(point: EarthbeatObservation, points: EarthbeatObservation[]): number {
  const span = points.at(-1)!.time - points[0].time;
  return span > 0 ? (point.time - points[0].time) / span : 0.5;
}

export function earthbeatNearest(points: EarthbeatObservation[], fraction: number): number {
  if (!points.length) return -1;
  const time = points[0].time + Math.max(0, Math.min(1, fraction)) * (points.at(-1)!.time - points[0].time);
  let selected = -1;
  points.forEach((point, index) => {
    if (point.value !== null && (selected < 0 || Math.abs(point.time - time) < Math.abs(points[selected].time - time))) selected = index;
  });
  return selected;
}

export type EarthbeatState = "paused" | "playing" | "ended";

/** One continuous voice, with timestamp spacing compressed into a repeating 24-second cycle. */
export class EarthbeatEngine {
  private context?: AudioContext;
  private oscillator?: OscillatorNode;
  private gain?: GainNode;
  private output?: GainNode;
  private level = 50;
  private timer?: ReturnType<typeof setTimeout>;
  private progressTimer?: ReturnType<typeof setInterval>;
  private generation = 0;
  private disposed = false;
  private points: EarthbeatObservation[] = [];
  private range: [number, number] = [0, 1];
  private cycleStart = 0;
  private readonly duration = 24;
  private readonly volume = 0.15;
  private readonly fade = 0.12;

  constructor(
    private progress: (index: number, observation: EarthbeatObservation, fraction?: number) => void,
    private stateChange: (state: EarthbeatState) => void,
    private createContext = () => new AudioContext(),
  ) {}

  load(points: EarthbeatObservation[]) {
    this.pause();
    this.points = points.filter(p => Number.isFinite(p.time)).map(p => ({ ...p, value: p.value !== null && Number.isFinite(p.value) ? p.value : null })).sort((a, b) => a.time - b.time);
    this.range = earthbeatRange(this.points);
  }

  setVolume(percent: number) {
    if (!Number.isFinite(percent)) return;
    this.level = Math.max(0, Math.min(100, percent));
    if (this.output && this.context) {
      const now = this.context.currentTime;
      this.output.gain.cancelScheduledValues(now);
      this.output.gain.setValueAtTime(this.output.gain.value, now);
      this.output.gain.linearRampToValueAtTime(this.level / 100 * 4, now + .05);
    }
  }

  async play() {
    this.pause();
    const generation = this.generation;
    if (this.disposed || !this.points.some(p => p.value !== null)) return;
    this.context ??= this.createContext();
    await this.context.resume();
    if (this.disposed || generation !== this.generation) return;
    const context = this.context;
    this.oscillator = context.createOscillator();
    this.gain = context.createGain();
    this.output = context.createGain();
    this.output.gain.setValueAtTime(this.level / 100 * 4, context.currentTime);
    this.oscillator.type = "sine";
    this.oscillator.connect(this.gain).connect(this.output);
    this.output.connect(context.destination);
    this.oscillator.start();
    this.stateChange("playing");
    this.scheduleCycle();
    this.progressTimer = setInterval(() => this.reportProgress(), 40);
  }

  // Inspecting a point is silent; only the speaker button starts sound.
  async seek(index: number) {
    this.pause();
    const point = this.points[index];
    if (point) this.progress(index, point, earthbeatTimeFraction(point, this.points));
  }

  pause() {
    this.generation++;
    clearTimeout(this.timer);
    clearInterval(this.progressTimer);
    this.timer = undefined;
    this.progressTimer = undefined;
    if (this.oscillator && this.gain && this.context) {
      const voice = this.oscillator;
      const envelope = this.gain;
      const output = this.output;
      const now = this.context.currentTime;
      envelope.gain.cancelScheduledValues(now);
      envelope.gain.setValueAtTime(envelope.gain.value, now);
      envelope.gain.linearRampToValueAtTime(0, now + this.fade);
      voice.onended = () => { voice.disconnect(); envelope.disconnect(); output?.disconnect(); };
      try { voice.stop(now + this.fade); } catch { /* Already stopped. */ }
    }
    this.oscillator = undefined;
    this.gain = undefined;
    this.output = undefined;
    if (!this.disposed) this.stateChange("paused");
  }

  dispose() {
    this.pause();
    this.disposed = true;
    void this.context?.close();
  }

  private scheduleCycle() {
    if (!this.context || !this.oscillator || !this.gain) return;
    this.cycleStart = this.context.currentTime;
    const start = this.cycleStart;
    const frequency = this.oscillator.frequency;
    const amplitude = this.gain.gain;
    frequency.cancelScheduledValues(start);
    amplitude.cancelScheduledValues(start);
    amplitude.setValueAtTime(0, start);
    const gaps = this.points.slice(1).map((p, i) => p.time - this.points[i].time).filter(g => g > 0).sort((a, b) => a - b);
    const gapLimit = gaps.length ? gaps[Math.floor(gaps.length / 2)] * 3 : Infinity;
    let previous: EarthbeatObservation | undefined;
    this.points.forEach(point => {
      const time = start + (this.points.length === 1 ? 0 : earthbeatTimeFraction(point, this.points) * this.duration);
      if (point.value === null) {
        amplitude.setValueAtTime(0, time);
      } else {
        const pitch = earthbeatPitch(point.value, this.range);
        const connected = previous?.value != null && point.time - previous.time <= gapLimit;
        if (connected) {
          frequency.linearRampToValueAtTime(pitch, time);
        } else {
          if (previous?.value != null) {
            const previousTime = start + earthbeatTimeFraction(previous, this.points) * this.duration;
            amplitude.setValueAtTime(0, previousTime + Math.min(this.fade, (time - previousTime) / 2));
          }
          frequency.setValueAtTime(pitch, time);
          amplitude.setValueAtTime(0, time);
          amplitude.linearRampToValueAtTime(this.volume, time + Math.min(this.fade, Math.max(0, start + this.duration - time)));
        }
      }
      previous = point;
    });
    const last = this.points.at(-1)!;
    const penultimate = this.points.at(-2);
    if (last.value !== null && (!penultimate || (penultimate.value !== null && last.time - penultimate.time <= gapLimit))) {
      amplitude.setValueAtTime(this.volume, start + this.duration - this.fade);
      amplitude.linearRampToValueAtTime(0, start + this.duration);
    } else amplitude.setValueAtTime(0, start + this.duration);
    this.reportProgress();
    this.timer = setTimeout(() => this.scheduleCycle(), this.duration * 1000);
  }

  private reportProgress() {
    if (!this.context || !this.points.length) return;
    const fraction = Math.max(0, Math.min(1, (this.context.currentTime - this.cycleStart) / this.duration));
    const time = this.points[0].time + fraction * (this.points.at(-1)!.time - this.points[0].time);
    let index = 0;
    // Select the observation at or immediately before the playhead, including missing readings.
    let lo = 0, hi = this.points.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      if (this.points[mid].time <= time) { index = mid; lo = mid + 1; } else hi = mid - 1;
    }
    this.progress(index, this.points[index], fraction);
  }
}
