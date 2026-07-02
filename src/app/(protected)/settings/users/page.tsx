import { requireAdmin } from "@/lib/auth";
import { getUsers } from "@/app/actions/users";
import { UsersClient } from "./UsersClient";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";

export default async function UsersPage() {
  await requireAdmin();
  const users = await getUsers();

  return (
    <div className="animate-fade-in max-w-4xl mx-auto pb-12 pt-4 space-y-8">
      <div className="flex flex-col items-center justify-center text-center pb-8 mb-8 border-b border-border/50 relative">
        <Link
          href="/settings"
          className="absolute left-0 top-0 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 shadow-sm border border-primary/20">
          <Users className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          User Management
        </h1>
        <p className="text-muted-foreground mt-2 max-w-lg">
          Add, edit, and remove staff members and control their access.
        </p>
      </div>

      <UsersClient initialUsers={users} />
    </div>
  );
}
