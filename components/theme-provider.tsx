"use client";

import type { ReactNode } from "react";
import { ThemeProvider as NextThemes } from "next-themes";
import { MotionConfig } from "motion/react";

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemes attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </NextThemes>
  );
}
