"use client";

import { useEffect } from "react";

/**
 * Mirrors the user's accessibility toggles onto the document root so the CSS in
 * globals.css can act on them (`:root[data-larger-text]`, `:root[data-reduce-motion]`).
 * Renders nothing. Scoped to the app shell — cleans up on unmount.
 */
export function PrefsEffect({
  largerText,
  reduceMotion,
}: {
  largerText: boolean;
  reduceMotion: boolean;
}) {
  useEffect(() => {
    const el = document.documentElement;
    el.dataset.largerText = String(largerText);
    el.dataset.reduceMotion = String(reduceMotion);
    return () => {
      delete el.dataset.largerText;
      delete el.dataset.reduceMotion;
    };
  }, [largerText, reduceMotion]);

  return null;
}
