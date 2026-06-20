"use client";

import { useState } from "react";
import { createBranch, updateBranch, deleteBranch } from "@/app/actions/branches";
import { Plus, Pencil, Trash2, X, Check, GitBranch, Phone, MapPin } from "lucide-react";
import { ConfirmModal } from "@/components/ConfirmModal";

type Branch = {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  isMain: boolean;
};

export function BranchesClient({ branches }: { branches: Branch[] }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<number | null>(null);

  async function handleCreate(formData: FormData) {
    setPending(true);
    const result = await createBranch(formData);
    setPending(false);
    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Branch created!" });
      setShowAdd(false);
    }
  }

  async function handleUpdate(formData: FormData) {
    setPending(true);
    const result = await updateBranch(formData);
    setPending(false);
    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Branch updated!" });
      setEditId(null);
    }
  }

  async function confirmDeleteBranch() {
    if (branchToDelete === null) return;
    setPending(true);
    const formData = new FormData();
    formData.append("id", branchToDelete.toString());
    const result = await deleteBranch(formData);
    setPending(false);
    setBranchToDelete(null);
    if (result.error) setMessage({ type: "error", text: result.error });
    else setMessage({ type: "success", text: "Branch deleted." });
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium border ${message.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
          {message.type === "success" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
          {message.text}
        </div>
      )}

      {/* Branch list */}
      <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
        {branches.length === 0 && (
          <div className="py-10 text-center text-muted-foreground text-sm">
            No branches yet. Add your first branch below.
          </div>
        )}
        {branches.map((branch) =>
          editId === branch.id ? (
            <form key={branch.id} action={handleUpdate} className="p-4 bg-muted/30 space-y-3">
              <input type="hidden" name="id" value={branch.id} />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input name="name" required defaultValue={branch.name} placeholder="Branch name" className="input-field" />
                <input name="phone" defaultValue={branch.phone || ""} placeholder="Phone (optional)" className="input-field" />
                <input name="address" defaultValue={branch.address || ""} placeholder="Address (optional)" className="input-field" />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={pending} className="btn btn-primary btn-sm">Save</button>
                <button type="button" onClick={() => setEditId(null)} className="btn btn-ghost btn-sm">Cancel</button>
              </div>
            </form>
          ) : (
            <div key={branch.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                  <span className="font-medium text-foreground">{branch.name}</span>
                  {branch.isMain && (
                     <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">Main</span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                  {branch.phone && (
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{branch.phone}</span>
                  )}
                  {branch.address && (
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{branch.address}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 ml-4 flex-shrink-0">
                <button onClick={() => { setEditId(branch.id); setMessage(null); }} className="btn btn-ghost btn-sm">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                {!branch.isMain && (
                  <button 
                    type="button" 
                    onClick={() => setBranchToDelete(branch.id)}
                    disabled={pending} 
                    className="btn btn-ghost btn-sm text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          )
        )}
      </div>

      {/* Add branch */}
      {showAdd ? (
        <form action={handleCreate} className="p-4 bg-muted/30 rounded-xl border border-border space-y-3">
          <h3 className="text-sm font-semibold text-foreground">New Branch</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input name="name" required autoFocus placeholder="Branch name *" className="input-field" />
            <input name="phone" placeholder="Phone (optional)" className="input-field" />
            <input name="address" placeholder="Address (optional)" className="input-field" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="btn btn-primary btn-sm">
              {pending ? "Adding..." : "Add Branch"}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="btn btn-ghost btn-sm">Cancel</button>
          </div>
        </form>
      ) : (
        <button onClick={() => { setShowAdd(true); setMessage(null); }} className="btn btn-secondary w-full">
          <Plus className="h-4 w-4" /> Add Branch
        </button>
      )}

      <ConfirmModal
        isOpen={branchToDelete !== null}
        title="Delete Branch"
        message="Are you sure you want to delete this branch? All data associated with it may be lost."
        confirmText="Delete"
        onConfirm={confirmDeleteBranch}
        onCancel={() => setBranchToDelete(null)}
        isLoading={pending}
      />
    </div>
  );
}
