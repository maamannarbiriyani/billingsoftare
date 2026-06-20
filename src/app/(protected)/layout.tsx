import { AppShell } from "@/components/AppShell";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getSession, getActiveBranchId } from "@/lib/auth";

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

  const activeBranchId = await getActiveBranchId();
  const branches = await prisma.branch.findMany({ orderBy: { id: "asc" } });

  return (
    <div
      className="min-h-screen text-foreground font-sans print:bg-white"
      style={{ background: "#111118" }}
    >
      <AppShell 
        userRole={session.role as string}
        branches={branches}
        activeBranchId={activeBranchId}
      >
        {children}
      </AppShell>
    </div>
  );
}
