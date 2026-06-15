"use client";

import { useState } from "react";
import { createUser, deleteUser } from "@/app/actions/users";
import { Plus, Trash2, Shield, User as UserIcon } from "lucide-react";

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

  async function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this user?")) return;
    setIsPending(true);
    
    const result = await deleteUser(id);
    if (result.error) {
      setMessage({ type: "error", text: result.error });
      setIsPending(false);
    } else {
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setIsPending(false);
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
      <div className="bg-card shadow rounded-xl border border-border overflow-hidden">
        <div className="p-5 border-b border-border flex justify-between items-center bg-muted">
          <h2 className="text-lg font-medium text-foreground">System Users</h2>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New User
          </button>
        </div>

        {isAdding && (
          <div className="p-6 border-b border-border bg-indigo-50/30">
            <h3 className="text-md font-bold text-foreground mb-4">Add New User</h3>
            <form onSubmit={handleAddSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  name="username"
                  required
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  name="password"
                  required
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  name="role"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-card"
                >
                  <option value="Cashier">Cashier</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full inline-flex justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isPending ? "Saving..." : "Create User"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="w-full inline-flex justify-center rounded-md bg-card border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <ul className="divide-y divide-gray-200">
          {users.map((user) => (
            <li key={user.id} className="p-5 flex items-center justify-between hover:bg-muted transition-colors">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${user.role === "Admin" ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"}`}>
                  {user.role === "Admin" ? <Shield className="h-5 w-5" /> : <UserIcon className="h-5 w-5" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{user.username}</p>
                  <p className="text-xs text-muted-foreground">{user.role}</p>
                </div>
              </div>
              
              <button
                onClick={() => handleDelete(user.id)}
                disabled={isPending}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                title="Delete User"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
