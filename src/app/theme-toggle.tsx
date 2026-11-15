"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle({lang="en"}:{lang?:"en"|"my"}) {
  const t=(en:string,my:string)=>lang==="my"?my:en;
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
  return <button type="button" className="theme-toggle" role="switch" aria-label={t("Dark mode","အမှောင်မြင်ကွင်း")} aria-checked={dark} title={dark ? t("Switch to light mode","အလင်းမြင်ကွင်း ပြောင်းရန်") : t("Switch to dark mode","အမှောင်မြင်ကွင်း ပြောင်းရန်")} onClick={toggle}>
    {dark ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}<span>{dark ? t("Dark mode","အမှောင်မြင်ကွင်း") : t("Light mode","အလင်းမြင်ကွင်း")}</span>
  </button>;
}
