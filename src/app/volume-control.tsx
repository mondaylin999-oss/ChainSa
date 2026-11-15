"use client";
import { useEffect, useState } from "react";
import { readVolume, saveVolume, VOLUME_EVENT } from "@/features/earthbeat/volume";

export function VolumeControl({ lang }: { lang: "en" | "my" }) {
  const [volume, setVolume] = useState(50);
  useEffect(() => {
    const sync = (event: Event) => setVolume(event instanceof CustomEvent ? event.detail : readVolume());
    setVolume(readVolume()); window.addEventListener(VOLUME_EVENT, sync); window.addEventListener("storage", sync);
    return () => { window.removeEventListener(VOLUME_EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);
  const change = (value: number) => { setVolume(value); saveVolume(value); };
  return <div className="settings-volume"><label htmlFor="earthbeat-volume">{lang === "my" ? "အသံအတိုးအကျယ်" : "Sound volume"}<output>{volume}%</output></label><div className="volume-controls"><button type="button" aria-label={lang === "my" ? "အသံလျှော့ရန်" : "Decrease sound volume"} disabled={volume <= 0} onClick={() => change(Math.max(0, volume - 10))}>−</button><input id="earthbeat-volume" aria-label={lang === "my" ? "အသံအတိုးအကျယ်" : "Sound volume"} type="range" min="0" max="100" step="1" value={volume} onChange={event => change(Number(event.target.value))} /><button type="button" aria-label={lang === "my" ? "အသံတိုးရန်" : "Increase sound volume"} disabled={volume >= 100} onClick={() => change(Math.min(100, volume + 10))}>+</button></div></div>;
}
