"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Lock, LockOpen, Store, X } from "lucide-react";
import { toast } from "sonner";
import { setActiveBranch } from "@/app/actions/branches";
import { lockBranchSwitch, unlockBranchSwitch } from "@/app/actions/branch-lock";

type Branch = { id: number; name: string };

/**
 * Header branch dropdown. Every branch is listed, but while locked, picking
 * another branch first asks for the owner password. After a correct password
 * switching stays unlocked until Lock, logout or 8 hours. The server
 * enforces the same rule (setActiveBranch refuses without the unlock).
 */
export function BranchSwitcher({
  branches,
  activeBranchId,
  unlocked,
  canUnlock,
}: {
  branches: Branch[];
  activeBranchId?: number | null;
  unlocked: boolean;
  canUnlock: boolean;
}) {
  const router = useRouter();
  const [target, setTarget] = useState<Branch | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [pending, startTransition] = useTransition();

  const current = branches.find((b) => b.id === activeBranchId) || branches[0];
  if (!current) return null;

  function switchTo(id: number) {
    startTransition(async () => {
      const res = await setActiveBranch(id);
      if (res?.error) toast.error(res.error);
      router.refresh();
    });
  }

  function onPick(id: number) {
    if (id === current.id) return;
    if (unlocked) return switchTo(id);
    setError(null);
    setPassword("");
    setTarget(branches.find((b) => b.id === id) || null);
  }

  function submitUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!target) return;
    setError(null);
    startTransition(async () => {
      const res = await unlockBranchSwitch(password);
      if (res.error) {
        setError(res.error);
        return;
      }
      const sw = await setActiveBranch(target.id);
      if (sw?.error) {
        setError(sw.error);
        return;
      }
      toast.success(`Switched to ${target.name}`);
      setTarget(null);
      setPassword("");
      router.refresh();
    });
  }

  function lockAgain() {
    startTransition(async () => {
      await lockBranchSwitch();
      toast.success("Branch switching locked");
      router.refresh();
    });
  }

  // Cashiers (or a single branch): just the name
  if (!canUnlock || branches.length < 2) {
    return (
      <div className="flex items-center mr-1 sm:mr-2 min-w-0 gap-1.5">
        <Store className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span className="text-sm font-medium truncate max-w-[110px] sm:max-w-[170px]" style={{ color: "var(--foreground)" }}>
          {current.name}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center mr-1 sm:mr-2 min-w-0 gap-1">
      <Store className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <select
        suppressHydrationWarning
        value={current.id}
        disabled={pending}
        onChange={(e) => onPick(Number(e.target.value))}
        className="bg-transparent text-sm font-medium outline-none cursor-pointer max-w-[100px] sm:max-w-[160px] truncate"
        style={{ color: "var(--foreground)" }}
      >
        {branches.map((b) => (
          <option key={b.id} value={b.id} className="bg-background">
            {b.name}
          </option>
        ))}
      </select>
      {unlocked ? (
        <button
          type="button"
          onClick={lockAgain}
          disabled={pending}
          title="Unlocked — click to lock branch switching"
          className="p-1.5 rounded-lg text-amber-500 hover:bg-muted flex-shrink-0"
        >
          <LockOpen className="h-4 w-4" />
        </button>
      ) : (
        <span title="Changing branch needs the owner password" className="p-1.5 text-muted-foreground flex-shrink-0">
          <Lock className="h-3.5 w-3.5" />
        </span>
      )}

      {/* Portal to <body>: the header's backdrop-filter would otherwise trap
          this fixed overlay inside the header and cut it off */}
      {target && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onClick={() => !pending && setTarget(null)}
        >
          <form
            onSubmit={submitUnlock}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-lg text-foreground flex items-center gap-2">
                  <Lock className="h-4 w-4" /> Switch to {target.name}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Enter the owner password. Switching stays unlocked until you lock it, log out, or 8 hours pass.
                </p>
              </div>
              <button type="button" onClick={() => setTarget(null)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoFocus
                autoComplete="off"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Owner password"
                className="input-field w-full pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {error && <p className="text-sm text-rose-500">{error}</p>}
            <button type="submit" disabled={pending || !password} className="btn btn-primary w-full">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockOpen className="h-4 w-4" />} Unlock &amp; switch
            </button>
          </form>
        </div>,
        document.body,
      )}
    </div>
  );
}
