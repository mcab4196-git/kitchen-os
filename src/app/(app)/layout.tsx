import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/server/db";
import { BottomNav } from "@/components/bottom-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already guards, but never trust a single gate for auth.
  if (!user) redirect("/login");

  // First-load safety net: the DB trigger creates the profile, but ensure a
  // preferences row exists so downstream screens can rely on it.
  await prisma.userPreference.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  return (
    <div className="mx-auto min-h-dvh max-w-app px-4 pb-24 pt-6">
      {children}
      <BottomNav />
    </div>
  );
}
