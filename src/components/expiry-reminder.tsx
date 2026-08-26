"use client";

import { useEffect, useState } from "react";

/**
 * Local, no-server reminders. On app open, if the user has granted permission and
 * something is expiring, fires a browser notification (once per day). Also renders
 * a small opt-in. Background/push reminders are a future enhancement.
 */
export function ExpiryReminder({ count, summary }: { count: number; summary: string }) {
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    if (typeof window === "undefined" || typeof Notification === "undefined") {
      setPerm("unsupported");
      return;
    }
    setPerm(Notification.permission);
    if (Notification.permission === "granted" && count > 0) {
      const key = `kos-notified-${new Date().toDateString()}`;
      try {
        if (!localStorage.getItem(key)) {
          new Notification("Kitchen OS — items to use up", { body: summary });
          localStorage.setItem(key, "1");
        }
      } catch {
        /* notifications not allowed in this context */
      }
    }
  }, [count, summary]);

  async function enable() {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setPerm(result);
    if (result === "granted" && count > 0) {
      new Notification("Kitchen OS — items to use up", { body: summary });
      localStorage.setItem(`kos-notified-${new Date().toDateString()}`, "1");
    }
  }

  if (perm === "unsupported" || perm === "granted") return null;

  return (
    <button
      onClick={enable}
      className="mt-2 text-xs text-brand underline underline-offset-2"
      type="button"
    >
      {perm === "denied" ? "Reminders blocked in browser settings" : "Enable expiry reminders on this device"}
    </button>
  );
}
