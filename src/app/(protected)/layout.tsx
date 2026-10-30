import { AppShell } from "@/components/AppShell";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getSession, getActiveBranchId, isBranchUnlocked } from "@/lib/auth";

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
  const branchUnlocked = session.role !== "Cashier" && (await isBranchUnlocked(session));
  const allBranches = await prisma.branch.findMany({ orderBy: { id: "asc" } });
  // Cashiers only ever see their own branch; admins see every branch name,
  // but picking another one asks for the owner password while locked
  const branches =
    session.role === "Cashier" ? allBranches.filter((b) => b.id === activeBranchId) : allBranches;

  return (
    <div className="min-h-screen text-foreground bg-background font-sans print:bg-white">
      <AppShell
        userRole={session.role as string}
        branches={branches}
        activeBranchId={activeBranchId}
        branchUnlocked={branchUnlocked}
        canUnlockBranches={session.role !== "Cashier" && allBranches.length > 1}
      >
        {children}
      </AppShell>
    </div>
  );
}
