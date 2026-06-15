import { requireAdmin } from "@/lib/auth";
import { getUsers } from "@/app/actions/users";
import { UsersClient } from "./UsersClient";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function UsersPage() {
  await requireAdmin();
  const users = await getUsers();

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Settings
        </Link>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          User Management
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add, edit, and remove staff members and control their access.
        </p>
      </div>

      <UsersClient initialUsers={users} />
    </div>
  );
}
