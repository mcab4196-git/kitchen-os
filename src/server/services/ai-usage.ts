import { prisma } from "@/server/db";
import { aiAllowance, allowanceMessage, AI_WINDOW_MS, type AiTask } from "@/lib/ai-limits";

export type AiClaim = { ok: true; id: string } | { ok: false; error: string };

/**
 * N6: reserve one AI call against the user's allowance and the shared ceiling
 * (PLAN 6.3) before making it. One advisory lock for every claim (released at
 * commit) makes check-then-insert atomic, so two taps at once can't both take the
 * last slot. At beta scale the claims are tiny, so serialising them all costs nothing.
 */
export async function claimAiUse(userId: string, task: AiTask): Promise<AiClaim> {
  const now = new Date();
  const since = new Date(now.getTime() - AI_WINDOW_MS);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`select pg_advisory_xact_lock(hashtext('kitchen-os:ai-claims'))`;
    const everyone = await tx.aiUsage.findMany({
      where: { createdAt: { gt: since } },
      select: { userId: true, task: true, createdAt: true },
    });
    const verdict = aiAllowance(
      task,
      everyone.filter((r) => r.userId === userId && r.task === task).map((r) => r.createdAt),
      now,
      everyone.map((r) => r.createdAt),
    );
    if (!verdict.ok) return { ok: false, error: allowanceMessage(task, verdict, now) };

    const use = await tx.aiUsage.create({ data: { userId, task, createdAt: now }, select: { id: true } });
    return { ok: true, id: use.id };
  });
}

/**
 * Hand the slot back when the AI never answered (provider error, upload failed),
 * so an outage doesn't eat the user's allowance. An answer that fails validation
 * keeps its slot: the call was made.
 */
export async function releaseAiUse(id: string): Promise<void> {
  await prisma.aiUsage.deleteMany({ where: { id } }).catch((e) => console.error("[ai-usage] release failed", e));
}
