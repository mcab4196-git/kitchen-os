import * as React from "react";

/**
 * Small hand-tuned stroke-icon set (24×24, 1.75 stroke, currentColor). Replaces
 * the ad-hoc single-path nav glyphs and the emoji/typographic characters that
 * were standing in for icons. Not a full library — just what the app uses.
 */
export type IconName =
  | "home"
  | "inventory"
  | "cook"
  | "cart"
  | "settings"
  | "scan"
  | "plus"
  | "minus"
  | "chevron-right"
  | "chevron-left"
  | "arrow-left"
  | "star"
  | "star-filled"
  | "check"
  | "x"
  | "alert"
  | "sparkles"
  | "camera"
  | "clock"
  | "trash"
  | "pencil"
  | "search"
  | "calendar"
  | "flame"
  | "leaf"
  | "external";

const PATHS: Record<IconName, React.ReactNode> = {
  // Kitchen-specific marks tuned to hold up at ~22px (see PR 7). Geometry only —
  // the wrapper below owns viewBox, stroke, caps and aria-hidden.
  home: (
    <>
      <path d="M3.8 10.6 12 4.2l8.2 6.4" />
      <path d="M6.3 9.3V19a1 1 0 0 0 1 1h9.4a1 1 0 0 0 1-1V9.3" />
      <path d="M10 20v-4.3h4V20" />
    </>
  ),
  inventory: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2.6" />
      <path d="M5 10.2h14" />
      <path d="M8.6 6v2.2M8.6 12.6v2.6" />
    </>
  ),
  cook: (
    <>
      <path d="M3.8 10.9h14.4v4.6a3.5 3.5 0 0 1-3.5 3.5H7.3a3.5 3.5 0 0 1-3.5-3.5z" />
      <path d="M18.2 12.1h2.1a1.35 1.35 0 0 1 0 2.7h-2.1" />
      <path d="M9.1 7.6c0-1.2 1.5-1.5 1.5-2.7M13.2 7.6c0-1.5 1.6-1.8 1.6-3.1" />
    </>
  ),
  cart: (
    <>
      <path d="M3.4 8.6h17.2l-1.7 9.3a2 2 0 0 1-2 1.6H7.1a2 2 0 0 1-2-1.6z" />
      <path d="M8.7 4.4 7 8.6M15.3 4.4 17 8.6" />
      <path d="M9.6 12.2v3.6M14.4 12.2v3.6" />
    </>
  ),
  settings: (
    <>
      <path d="M4.5 8.4h8.6M17.9 8.4H19.5" />
      <circle cx="15.5" cy="8.4" r="2.4" />
      <path d="M4.5 15.6h3.2M12.1 15.6h7.4" />
      <circle cx="9.9" cy="15.6" r="2.4" />
    </>
  ),
  scan: (
    <>
      <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
      <path d="M7 12h10" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  "chevron-right": <path d="m9 6 6 6-6 6" />,
  "chevron-left": <path d="m15 6-6 6 6 6" />,
  "arrow-left": <path d="M19 12H5M12 19l-7-7 7-7" />,
  star: <path d="m12 3.5 2.6 5.3 5.9.85-4.25 4.15 1 5.85L12 16.9 6.75 19.6l1-5.85L3.5 9.65l5.9-.85z" />,
  "star-filled": (
    <path
      fill="currentColor"
      stroke="none"
      d="m12 3.5 2.6 5.3 5.9.85-4.25 4.15 1 5.85L12 16.9 6.75 19.6l1-5.85L3.5 9.65l5.9-.85z"
    />
  ),
  check: <path d="m4 12 5 5L20 6" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  alert: (
    <>
      <path d="M12 3.5 21 19H3z" />
      <path d="M12 10v4M12 17h.01" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z" />
      <path d="M18 15l.7 1.9L20.6 18l-1.9.7L18 20.6l-.7-1.9L15.4 18l1.9-.7z" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8a2 2 0 0 1 2-2h1.5l1-1.6a1 1 0 0 1 .84-.4h5.32a1 1 0 0 1 .84.4l1 1.6H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <circle cx="12" cy="12.5" r="3.2" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  trash: <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M10 11v6M14 11v6" />,
  pencil: <path d="M4 20h4L19 9a2 2 0 0 0-2.83-2.83L5 17v3zM14.5 6.5l3 3" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M4 10h16M9 3v4M15 3v4" />
    </>
  ),
  flame: <path d="M12 3s5 4 5 9a5 5 0 0 1-10 0c0-1.5.6-2.8 1.4-3.8C9 10 10 11 10 11s-.5-3 2-8Z" />,
  leaf: <path d="M4 20c0-8 6-14 16-15 0 10-6 16-14 16a4 4 0 0 1-2-1ZM9 15c2-3 5-5 8-6" />,
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />,
};

export function Icon({
  name,
  size = 20,
  className,
  strokeWidth = 1.75,
  ...rest
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
} & Omit<React.SVGProps<SVGSVGElement>, "name">) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
