import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { BranchesClient } from "./BranchesClient";
import { ArrowLeft, GitBranch } from "lucide-react";
import Link from "next/link";

export default async function BranchesPage() {
  await requireAdmin();
  const branches = await prisma.branch.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="animate-fade-in max-w-3xl pb-8">
      <div className="pb-6 border-b border-border/50 mb-6">
        <Link href="/settings" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Settings
        </Link>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-xl bg-muted/50 flex items-center justify-center">
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </div>
          <h1 className="page-title">Branch Management</h1>
        </div>
        <p className="page-subtitle ml-11">Add and manage your store branches</p>
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
