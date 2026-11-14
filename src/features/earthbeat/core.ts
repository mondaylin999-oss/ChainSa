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

export class EarthbeatEngine {
  private context?: AudioContext;
  private master?: GainNode;
  private voices = new Set<OscillatorNode>();
  private timer?: ReturnType<typeof setTimeout>;
  private generation = 0;
  private disposed = false;
  private index = 0;
  private volume = 0.15;
  private duration = 0.25;
  private range: [number, number] = [0, 1];
  private points: EarthbeatObservation[] = [];
  private state: EarthbeatState = "paused";
  constructor(
    private progress: (index: number, observation: EarthbeatObservation) => void,
    private stateChange: (state: EarthbeatState) => void,
    private createContext = () => new AudioContext(),
  ) {}

  load(points: EarthbeatObservation[]) {
    this.pause();
    this.points = points;
    this.range = earthbeatRange(points);
    this.index = Math.max(0, points.findIndex(point => point.value !== null));
  }

  private async unlock(generation: number) {
    if (this.disposed) return false;
    if (!this.context) {
      this.context = this.createContext();
      this.master = this.context.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.context.destination);
    }
    await this.context.resume();
    return !this.disposed && generation === this.generation;
  }

  async play() {
    this.pause();
    const generation = this.generation;
    if (!this.points.some(point => point.value !== null) || !(await this.unlock(generation))) return;
    this.setState("playing");
    this.next();
  }

  async seek(index: number) {
    this.pause();
    const point = this.points[index];
    if (!point || point.value === null) return;
    this.index = index;
    this.progress(index, point);
    const generation = this.generation;
    if (await this.unlock(generation)) this.tone(point.value!);
  }

  restart() {
    this.pause();
    this.index = Math.max(0, this.points.findIndex(point => point.value !== null));
    if (this.points[this.index]?.value !== null && this.points[this.index]) this.progress(this.index, this.points[this.index]);
  }

  pause() {
    this.generation++;
    clearTimeout(this.timer);
    this.timer = undefined;
    this.voices.forEach(voice => { try { voice.stop(); } catch {} });
    this.voices.clear();
    this.setState("paused");
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.master && this.context) this.master.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.01);
  }

  setSpeed(observationsPerSecond: number) {
    this.duration = 1 / Math.max(1, Math.min(8, observationsPerSecond));
  }

  dispose() {
    this.disposed = true;
    this.pause();
    void this.context?.close();
  }

  private setState(state: EarthbeatState) {
    this.state = state;
    if (!this.disposed) this.stateChange(state);
  }

  private next() {
    while (this.index < this.points.length && this.points[this.index].value === null) this.index++;
    if (this.index >= this.points.length) {
      this.setState("ended");
      this.index = Math.max(0, this.points.findIndex(point => point.value !== null));
      return;
    }
    const index = this.index;
    const point = this.points[index];
    this.tone(point.value!);
    this.progress(index, point);
    this.timer = setTimeout(() => { this.index = index + 1; this.next(); }, this.duration * 1000);
  }

  private tone(value: number) {
    if (!this.context || !this.master) return;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    const now = this.context.currentTime;
    const length = Math.min(this.duration * 0.85, 0.3);
    oscillator.type = "sine";
    oscillator.frequency.value = earthbeatPitch(value, this.range);
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(1, now + 0.008);
    envelope.gain.linearRampToValueAtTime(0, now + length);
    oscillator.connect(envelope).connect(this.master);
    this.voices.add(oscillator);
    oscillator.onended = () => { this.voices.delete(oscillator); oscillator.disconnect(); envelope.disconnect(); };
    oscillator.start(now);
    oscillator.stop(now + length + 0.01);
  }
}
