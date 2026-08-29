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
  home: <path d="M4 11.5 12 4l8 7.5M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />,
  inventory: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M4 9.5h16M9.5 4v16" />
    </>
  ),
  cook: (
    <>
      <path d="M6 13.5a4 4 0 0 1-1-7.9A4.5 4.5 0 0 1 14 4a4 4 0 0 1 4 9.5" />
      <path d="M6 13.5h12v4a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" />
    </>
  ),
  cart: (
    <>
      <path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.2a1 1 0 0 0 1-.8L20 7H6" />
      <circle cx="9.5" cy="20" r="1.4" />
      <circle cx="17" cy="20" r="1.4" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.14-1.4l1.9-1.48-2-3.46-2.24.9a7 7 0 0 0-2.42-1.4L11.7 2h-4l-.4 2.36a7 7 0 0 0-2.42 1.4l-2.24-.9-2 3.46 1.9 1.48A7 7 0 0 0 5 12a7 7 0 0 0 .14 1.4l-1.9 1.48 2 3.46 2.24-.9a7 7 0 0 0 2.42 1.4L7.7 22h4l.4-2.36a7 7 0 0 0 2.42-1.4l2.24.9 2-3.46-1.9-1.48A7 7 0 0 0 19 12Z" />
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
