"use client";

import { useState } from "react";
import { createUser, deleteUser } from "@/app/actions/users";
import { Plus, Trash2, Shield, User as UserIcon } from "lucide-react";
import { ConfirmModal } from "@/components/ConfirmModal";
import { toast } from "sonner";

type UserType = {
  id: number;
  username: string;
  role: string;
};

export function UsersClient({ initialUsers }: { initialUsers: UserType[] }) {
  const [users, setUsers] = useState<UserType[]>(initialUsers);
  const [isAdding, setIsAdding] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  const [userToDelete, setUserToDelete] = useState<number | null>(null);

  async function handleAddSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const result = await createUser(formData);

    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "User created successfully." });
      setIsAdding(false);
      // Let server action revalidate and update page, or we could just reload
      window.location.reload(); 
    }
    setIsPending(false);
  }

  async function confirmDeleteUser() {
    if (userToDelete === null) return;
    setIsPending(true);
    
    const result = await deleteUser(userToDelete);
    if (result.error) {
      setMessage({ type: "error", text: result.error });
      setIsPending(false);
      setUserToDelete(null);
    } else {
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete));
      setIsPending(false);
      setUserToDelete(null);
      toast.success("User deleted successfully.");
    }
  }

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`p-4 rounded-md text-sm ${
            message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Users List */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-border flex justify-between items-center">
          <h2 className="section-title">System Users</h2>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="btn btn-primary"
          >
            <Plus className="h-4 w-4" />
            New User
          </button>
        </div>

        {isAdding && (
          <div className="p-6 border-b border-border bg-muted/40">
            <h3 className="text-base font-bold text-foreground mb-4">Add New User</h3>
            <form onSubmit={handleAddSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="input-label">Username</label>
                <input
                  type="text"
                  name="username"
                  required
                  className="input-field"
                />
              </div>
              <div>
                <label className="input-label">Password</label>
                <input
                  type="password"
                  name="password"
                  required
                  className="input-field"
                />
              </div>
              <div>
                <label className="input-label">Role</label>
                <select
                  name="role"
                  className="input-field"
                >
                  <option value="Cashier">Cashier</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn btn-primary w-full"
                >
                  {isPending ? "Saving..." : "Create User"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="btn btn-secondary w-full"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <ul className="divide-y divide-border">
          {users.map((user) => (
            <li key={user.id} className="p-5 flex items-center justify-between hover:bg-muted transition-colors">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${user.role === "Admin" ? "bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300" : "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"}`}>
                  {user.role === "Admin" ? <Shield className="h-5 w-5" /> : <UserIcon className="h-5 w-5" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{user.username}</p>
                  <p className="text-xs text-muted-foreground">{user.role}</p>
                </div>
              </div>
              
              <button
                onClick={() => setUserToDelete(user.id)}
                disabled={isPending}
                className="p-2 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors disabled:opacity-50"
                title="Delete User"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <ConfirmModal
        isOpen={userToDelete !== null}
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone."
        confirmText="Delete"
        onConfirm={confirmDeleteUser}
        onCancel={() => setUserToDelete(null)}
        isLoading={isPending}
      />
    </div>
  );
}
