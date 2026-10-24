"use client";

import { useEffect, useState } from "react";

/**
 * "Sunday 26 October · 4 things to do". The date is formatted in the browser
 * because the server runs on UTC (PLAN 3.2) and would show yesterday until 8 am
 * in the Philippines. Until it mounts, only the suffix shows.
 */
export function TodayDate({ suffix }: { suffix: string }) {
  const [date, setDate] = useState<string | null>(null);
  useEffect(() => {
    setDate(new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }));
  }, []);
  return <>{date ? `${date} · ${suffix}` : suffix}</>;
}
