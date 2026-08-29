import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/server/db";
import { BottomNav, SideNav } from "@/components/bottom-nav";
import { Toaster } from "@/components/ui/toaster";

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
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl">
      <SideNav />
      <div className="w-full min-w-0 flex-1 lg:border-r lg:border-line">
        <div className="mx-auto w-full max-w-app px-4 pt-6 pb-[calc(var(--nav-h)+env(safe-area-inset-bottom)+1.5rem)] lg:max-w-content lg:px-8 lg:pb-16">
          {children}
        </div>
      </div>
      <BottomNav />
      <Suspense fallback={null}>
        <Toaster />
      </Suspense>
    </div>
  );
}
