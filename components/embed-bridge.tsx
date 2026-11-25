"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

export function EmbedBridge() {
  const { setTheme } = useTheme();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const theme = params.get("theme");
    if (theme === "light" || theme === "dark") setTheme(theme);
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "cg-theme" && (event.data.theme === "light" || event.data.theme === "dark" || event.data.theme === "system")) {
        setTheme(event.data.theme);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [setTheme]);
  return null;
}
