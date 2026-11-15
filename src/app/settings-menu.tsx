"use client";

import { useEffect, useRef, useState } from "react";
import { Settings } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

type Language = "en" | "my";

export function SettingsMenu({ lang, onLanguage }: { lang: Language; onLanguage: (language: Language) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="settings-menu" ref={root}>
      <button className="settings-trigger" type="button" aria-label="Settings" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(value => !value)}>
        <Settings size={19} aria-hidden="true" />
      </button>
      {open && <section className="settings-panel" role="dialog" aria-label="Settings">
        <div className="settings-group">
          <span className="settings-label">Language</span>
          <div className="language-switch" role="group" aria-label="Interface language">
            {(["en", "my"] as const).map(language => <button key={language} type="button" data-earthlens-language={language} aria-pressed={lang === language} className={lang === language ? "language-active" : ""} onClick={() => onLanguage(language)}>{language === "en" ? "EN" : "မြန်မာ"}</button>)}
          </div>
        </div>
        <div className="settings-group">
          <span className="settings-label">Display</span>
          <ThemeToggle />
        </div>
      </section>}
    </div>
  );
}
