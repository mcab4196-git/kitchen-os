import { prisma } from "@/server/db";
import { getPreferences } from "./preferences";

export interface AlertItem {
  id: string;
  productName: string;
  quantity: number;
  unit: string;
  expiryDate: Date | null;
  daysLeft: number; // negative = expired
}

export interface ExpiryAlerts {
  thresholdDays: number;
  expired: AlertItem[];
  today: AlertItem[];
  soon: AlertItem[];
  count: number;
  summary: string; // short line for a local notification / banner
}

/** Items that are expired or expiring within the user's warning threshold. */
export async function getExpiryAlerts(userId: string): Promise<ExpiryAlerts> {
  const prefs = await getPreferences(userId);
  const thresholds = (prefs.notificationThresholds ?? {}) as { expiringDays?: number };
  const thresholdDays = thresholds.expiringDays ?? 2;

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const limit = new Date(startOfToday);
  limit.setDate(limit.getDate() + thresholdDays + 1); // inclusive of the threshold day

  const items = await prisma.inventoryItem.findMany({
    where: {
      userId,
      isDeleted: false,
      quantity: { gt: 0 },
      expirySource: { not: "UNKNOWN" },
      expiryDate: { not: null, lt: limit },
    },
    orderBy: { expiryDate: "asc" },
  });

  const expired: AlertItem[] = [];
  const today: AlertItem[] = [];
  const soon: AlertItem[] = [];

  for (const it of items) {
    if (!it.expiryDate) continue;
    const days = Math.ceil((it.expiryDate.getTime() - startOfToday.getTime()) / (24 * 60 * 60 * 1000));
    const a: AlertItem = {
      id: it.id,
      productName: it.productName,
      quantity: it.quantity,
      unit: it.unit,
      expiryDate: it.expiryDate,
      daysLeft: days,
    };
    if (days < 0) expired.push(a);
    else if (days === 0) today.push(a);
    else soon.push(a);
  }

  const count = expired.length + today.length + soon.length;
  const parts: string[] = [];
  if (expired.length) parts.push(`${expired.length} expired`);
  if (today.length) parts.push(`${today.length} expiring today`);
  if (soon.length) parts.push(`${soon.length} expiring soon`);
  const summary = parts.length ? parts.join(" · ") : "Nothing expiring — you're in good shape.";

  return { thresholdDays, expired, today, soon, count, summary };
}
