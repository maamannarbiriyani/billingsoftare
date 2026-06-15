import { AppShell } from "@/components/AppShell";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const setting = await prisma.setting.findFirst();

  return (
    <div
      className="min-h-screen text-foreground font-sans print:bg-white"
      style={{ background: "#111118" }}
    >
      <AppShell userRole={session.role as string}>
        {children}
      </AppShell>
    </div>
  );
}
