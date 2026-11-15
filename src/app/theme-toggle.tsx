"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const sync = () => setDark(document.documentElement.dataset.theme !== "light");
    sync();
    window.addEventListener("earthlens-theme-change", sync);
    return () => window.removeEventListener("earthlens-theme-change", sync);
  }, []);
  function toggle() {
    const theme = dark ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("earthlens-theme", theme); } catch { /* The switch still works without storage. */ }
    setDark(!dark);
    window.dispatchEvent(new Event("earthlens-theme-change"));
  }
  return <button type="button" className="theme-toggle" role="switch" aria-label="Dark mode" aria-checked={dark} title={dark ? "Switch to light mode" : "Switch to dark mode"} onClick={toggle}>
    {dark ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}<span>{dark ? "Dark mode" : "Light mode"}</span>
  </button>;
}
