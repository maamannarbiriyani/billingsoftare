"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { resetOwnerPassword, upsertOwnerAccount } from "@/app/actions/owner-account";

/**
 * The owner password unlocks branch switching and the owner portal.
 * Change needs the current password; Forgot needs the main admin's login password.
 */
export function OwnerPasswordSettings({ ownerExists, canReset }: { ownerExists: boolean; canReset: boolean }) {
  const router = useRouter();
  const [forgot, setForgot] = useState(false);
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputType = show ? "text" : "password";

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setError(null);
    if (formData.get("password") !== formData.get("confirmPassword")) {
      setError("New password and confirm password do not match");
      return;
    }
    startTransition(async () => {
      const res = forgot ? await resetOwnerPassword(formData) : await upsertOwnerAccount(formData);
      if (res.error) {
        setError(res.error);
        return;
      }
      toast.success(ownerExists ? "Password changed. All PCs are locked again." : "Owner password saved");
      form.reset();
      setForgot(false);
      router.refresh();
    });
  }

  function switchMode(next: boolean) {
    setForgot(next);
    setError(null);
  }

  return (
    <section className="card overflow-hidden">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
          <KeyRound className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="section-title">Owner Password</h2>
          <p className="section-subtitle">
            Used to change branch at the top of the screen and to log in at <strong>/owner</strong>.
          </p>
        </div>
      </div>

      {/* key: clears typed passwords when moving between Change and Forgot */}
      <form key={forgot ? "forgot" : "change"} onSubmit={onSubmit} className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {forgot ? (
          <div className="sm:col-span-2">
            <label className="input-label">Your login password</label>
            <input type={inputType} name="loginPassword" required autoComplete="off" autoFocus className="input-field" />
            <p className="text-xs text-muted-foreground mt-1">The password you used to log in to this POS.</p>
          </div>
        ) : ownerExists ? (
          <div className="sm:col-span-2">
            <label className="input-label">Current owner password</label>
            <input type={inputType} name="currentPassword" required autoComplete="off" className="input-field" />
          </div>
        ) : null}

        <div>
          <label className="input-label">New password</label>
          <input type={inputType} name="password" required minLength={6} autoComplete="new-password" placeholder="Min 6 characters" className="input-field" />
        </div>
        <div>
          <label className="input-label">Confirm new password</label>
          <input type={inputType} name="confirmPassword" required minLength={6} autoComplete="new-password" className="input-field" />
        </div>

        {!forgot && (
          <div className="sm:col-span-2">
            <label className="input-label">Owner portal username{ownerExists && " (optional)"}</label>
            <input
              type="text"
              name="username"
              required={!ownerExists}
              autoComplete="off"
              placeholder={ownerExists ? "Leave empty to keep the same username" : "e.g. owner"}
              className="input-field"
            />
          </div>
        )}

        <label className="sm:col-span-2 flex items-center gap-2 text-sm text-muted-foreground cursor-pointer w-fit">
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} className="h-4 w-4 accent-primary" />
          Show passwords
        </label>

        {error && <p className="sm:col-span-2 text-sm text-rose-500">{error}</p>}

        <div className="sm:col-span-2 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            {forgot ? (
              <button type="button" onClick={() => switchMode(false)} className="text-sm font-medium text-primary hover:underline">
                Back to change password
              </button>
            ) : !ownerExists ? null : canReset ? (
              <button type="button" onClick={() => switchMode(true)} className="text-sm font-medium text-primary hover:underline">
                Forgot owner password?
              </button>
            ) : (
              <p className="text-xs text-muted-foreground">
                Forgot it? Log in with the main admin account to reset it.
              </p>
            )}
          </div>
          <button type="submit" disabled={pending} className="btn btn-primary w-full sm:w-auto">
            {pending ? "Saving..." : forgot ? "Reset Password" : ownerExists ? "Change Password" : "Save Password"}
          </button>
        </div>

        {ownerExists && (
          <p className="sm:col-span-2 text-xs text-muted-foreground">
            After a change or reset, every PC must enter the new password to change branch.
          </p>
        )}
      </form>
    </section>
  );
}
