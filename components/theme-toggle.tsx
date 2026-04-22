"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "flashcardsnew-theme";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
    const initialTheme = saved === "dark" ? "dark" : "light";
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="group relative inline-flex h-12 w-28 items-center rounded-full border border-brand-400/60 bg-gradient-to-br from-brand-800 to-brand-950 px-1.5 shadow-[0_12px_40px_rgba(61,28,92,0.35),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all duration-300 hover:border-brand-300"
      aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
      title={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
    >
      <span
        className="absolute h-8 w-8 rounded-full bg-[radial-gradient(circle_at_30%_30%,#fffbeb,#fbbf24_60%,#f59e0b_100%)] shadow-[0_14px_28px_rgba(245,158,11,0.45),0_0_20px_rgba(245,158,11,0.25)] transition-transform duration-300"
        style={{
          left: `${theme === "dark" ? 66 : 11}px`,
          top: "50%",
          transform: "translateY(-50%)"
        }}
      />
      <span className="relative z-10 flex w-full items-center justify-between px-2">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-300 ${
            theme === "light" ? "text-amber-300" : "text-brand-200/50"
          }`}
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
            <path d="M12 2.75a.75.75 0 0 1 .75.75v1.2a.75.75 0 0 1-1.5 0v-1.2a.75.75 0 0 1 .75-.75Zm0 15.55a.75.75 0 0 1 .75.75v1.2a.75.75 0 0 1-1.5 0v-1.2a.75.75 0 0 1 .75-.75ZM4.22 4.22a.75.75 0 0 1 1.06 0l.85.85a.75.75 0 1 1-1.06 1.06l-.85-.85a.75.75 0 0 1 0-1.06Zm11.82 11.82a.75.75 0 0 1 1.06 0l.85.85a.75.75 0 1 1-1.06 1.06l-.85-.85a.75.75 0 0 1 0-1.06ZM2.75 12a.75.75 0 0 1 .75-.75h1.2a.75.75 0 0 1 0 1.5h-1.2a.75.75 0 0 1-.75-.75Zm15.55 0a.75.75 0 0 1 .75-.75h1.2a.75.75 0 0 1 0 1.5h-1.2a.75.75 0 0 1-.75-.75ZM4.22 19.78a.75.75 0 0 1 0-1.06l.85-.85a.75.75 0 1 1 1.06 1.06l-.85.85a.75.75 0 0 1-1.06 0Zm11.82-11.82a.75.75 0 0 1 0-1.06l.85-.85a.75.75 0 1 1 1.06 1.06l-.85.85a.75.75 0 0 1-1.06 0ZM12 6.2A5.8 5.8 0 1 0 17.8 12 5.8 5.8 0 0 0 12 6.2Z" />
          </svg>
        </span>
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-300 ${
            theme === "dark" ? "text-brand-950" : "text-brand-100/45"
          }`}
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
            <path d="M21.18 15.53A8.5 8.5 0 0 1 8.47 2.82a.82.82 0 0 0-1-.11A10.5 10.5 0 1 0 21.3 16.53a.82.82 0 0 0-.12-1 .82.82 0 0 0 0 0Z" />
          </svg>
        </span>
      </span>
    </button>
  );
}
