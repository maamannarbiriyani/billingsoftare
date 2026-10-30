import { prisma } from "@/lib/prisma";
import { requireAdmin, getSession, isBranchUnlocked } from "@/lib/auth";
import { BranchesClient } from "./BranchesClient";
import { ArrowLeft, GitBranch, Lock } from "lucide-react";
import Link from "next/link";

export default async function BranchesPage() {
  await requireAdmin();
  // Other branches are owner-only: show them only after the owner unlock
  if (!(await isBranchUnlocked(await getSession()))) {
    return (
      <div className="animate-fade-in max-w-xl mx-auto pb-12 pt-10 text-center space-y-3">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
          <Lock className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-extrabold text-foreground">Branches are locked</h1>
        <p className="text-muted-foreground">
          Only the owner can manage branches. Click the lock next to the branch name at the top and enter the
          owner password.
        </p>
        <Link href="/settings" className="btn btn-secondary inline-flex">
          <ArrowLeft className="h-4 w-4" /> Back to Settings
        </Link>
      </div>
    );
  }
  const branches = await prisma.branch.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="animate-fade-in max-w-4xl mx-auto pb-12 pt-4">
      <div className="flex flex-col items-center justify-center text-center pb-8 mb-8 border-b border-border/50 relative">
        <Link href="/settings" className="absolute left-0 top-0 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 shadow-sm border border-primary/20">
          <GitBranch className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Branch Management</h1>
        <p className="text-muted-foreground mt-2 max-w-lg">Add and manage your store branches</p>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border/50">
          <h2 className="section-title">Branches</h2>
          <p className="section-subtitle">{branches.length} branch{branches.length !== 1 ? "es" : ""} configured</p>
        </div>
        <div className="p-6">
          <BranchesClient branches={branches} />
        </div>
      </div>
    </div>
  );
}
