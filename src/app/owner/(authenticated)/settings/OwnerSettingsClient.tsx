"use client";

import { useState } from "react";
import { KeyRound, Check, X } from "lucide-react";

export function OwnerSettingsClient({ username }: { username: string }) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const current = fd.get("current") as string;
    const newPw = fd.get("new") as string;
    const confirm = fd.get("confirm") as string;

    if (newPw !== confirm) {
      setMsg({ type: "error", text: "New passwords do not match" });
      return;
    }
    if (newPw.length < 6) {
      setMsg({ type: "error", text: "Password must be at least 6 characters" });
      return;
    }

    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/owner/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current, newPassword: newPw }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: "success", text: "Password changed successfully" });
        setShowForm(false);
        (e.target as HTMLFormElement).reset();
      } else {
        setMsg({ type: "error", text: data.error || "Failed to change password" });
      }
    } catch {
      setMsg({ type: "error", text: "An error occurred" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-slate-500" />
          <h2 className="font-semibold text-slate-900 text-sm">Portal Access</h2>
        </div>
      </div>

      <div className="text-sm text-slate-600 mb-4">
        Signed in as <span className="font-semibold text-slate-900">{username}</span>
      </div>

      {msg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium border mb-4 ${
          msg.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"
        }`}>
          {msg.type === "success" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
          {msg.text}
        </div>
      )}

      {showForm ? (
        <form onSubmit={handleChangePassword} className="space-y-3">
          <input
            type="password"
            name="current"
            required
            placeholder="Current password"
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            name="new"
            required
            placeholder="New password (min 6 characters)"
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            name="confirm"
            required
            placeholder="Confirm new password"
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60"
            >
              {loading ? "Saving..." : "Change Password"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setMsg(null); }}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-semibold py-2.5 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold py-2.5 rounded-lg transition-colors"
        >
          Change Password
        </button>
      )}
    </div>
  );
}
