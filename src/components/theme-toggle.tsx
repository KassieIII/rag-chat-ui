"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    // The pre-hydration bootstrap script in `layout.tsx` already applied
    // the saved/system theme to <html>. We mirror it once on mount so the
    // toggle button starts in the correct visual state. setState in an
    // effect is unavoidable here because the source of truth lives in the
    // DOM, not in React state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("rag-chat-theme", next ? "dark" : "light");
    } catch {
      // ignore quota / privacy errors — toggle still works for the session.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "surface inline-flex h-9 w-9 items-center justify-center text-sm transition",
        "hover:translate-y-px",
      )}
    >
      <span aria-hidden>{dark ? "☀" : "☾"}</span>
    </button>
  );
}
