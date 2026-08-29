/**
 * Restrained route transition. `template.tsx` re-mounts on every navigation
 * within the (app) group, so this is a single short opacity + 4px settle — no
 * slide, no stagger. Under `prefers-reduced-motion` the global rule in
 * globals.css collapses the duration to nothing.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-slide-up-fade">{children}</div>;
}
