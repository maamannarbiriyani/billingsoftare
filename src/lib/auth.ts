import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";
import crypto from "crypto";

function getJwtSecret(): string {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;

  // Persist secret next to .env so all restarts reuse the same key
  const secretPath = path.join(process.cwd(), ".jwt_secret");
  try {
    if (fs.existsSync(secretPath)) {
      return fs.readFileSync(secretPath, "utf8").trim();
    }
  } catch {
    // fall through to generate
  }

  const newSecret = crypto.randomBytes(64).toString("hex");
  try {
    fs.writeFileSync(secretPath, newSecret, { encoding: "utf8", mode: 0o600 });
    console.info("[auth] Generated new JWT secret → .jwt_secret  (add JWT_SECRET to .env to lock it in)");
  } catch (e) {
    console.error("[auth] Could not persist JWT secret. Sessions will reset on restart.", e);
  }
  return newSecret;
}

const secretKey = getJwtSecret();
const encodedKey = new TextEncoder().encode(secretKey);

export async function encrypt(payload: any) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey);
}

export async function decrypt(session: string | undefined = "") {
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload;
  } catch (error) {
    return null;
  }
}

// ── Branch switch lock ──────────────────────────────────────────
// Switching branch needs the owner password. A successful unlock sets a
// short-lived signed cookie bound to the logged-in user; it ends on Lock,
// logout, or after BRANCH_UNLOCK_HOURS. Separate key from sessions so one
// token can never be used as the other.
const branchUnlockKey = new TextEncoder().encode(secretKey + ":branch-unlock");
const BRANCH_UNLOCK_COOKIE = "branch_unlock";
export const BRANCH_UNLOCK_HOURS = 8;

export async function createBranchUnlock(userId: unknown) {
  const token = await new SignJWT({ uid: String(userId), type: "branch_unlock" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${BRANCH_UNLOCK_HOURS}h`)
    .sign(branchUnlockKey);
  const cookieStore = await cookies();
  cookieStore.set(BRANCH_UNLOCK_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: BRANCH_UNLOCK_HOURS * 60 * 60,
  });
}

export async function clearBranchUnlock() {
  const cookieStore = await cookies();
  cookieStore.delete(BRANCH_UNLOCK_COOKIE);
}

/** True when this user unlocked branch switching with the owner password. */
export async function isBranchUnlocked(session?: { [key: string]: unknown } | null): Promise<boolean> {
  if (!session) return false;
  const cookieStore = await cookies();
  const token = cookieStore.get(BRANCH_UNLOCK_COOKIE)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, branchUnlockKey, { algorithms: ["HS256"] });
    return payload.type === "branch_unlock" && payload.uid === String(session.id);
  } catch {
    return false;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) return null;
  return await decrypt(session);
}

export async function requireAdmin() {
  const session = await getSession();
  if (session?.role !== "Admin") {
    const { redirect } = await import("next/navigation");
    redirect("/billing");
  }
}

export async function getActiveBranchId(): Promise<number | null> {
  const session = await getSession();
  const cookieStore = await cookies();

  if (!session) return null;

  // If Cashier, return their locked branch ID
  if (session.role === "Cashier") {
    return (session.branchId as number) || null; // Ensure User table has branchId
  }

  const raw = cookieStore.get("activeBranchId")?.value;
  const selectedBranchId = raw && /^\d+$/.test(raw) ? parseInt(raw, 10) : null;

  // Owner-unlocked: whichever branch was picked in the switcher
  if (selectedBranchId && (await isBranchUnlocked(session))) {
    return selectedBranchId;
  }

  // Locked: a user tied to a branch always works in that branch
  if (session.branchId) {
    return session.branchId as number;
  }

  // Locked shared/global admin login: stays on this device's last-picked
  // branch (it can only be changed after an owner unlock — setActiveBranch)
  if (selectedBranchId) {
    return selectedBranchId;
  }

  // Fallback: Admin without a selected branch -> Pick the first available branch
  const { prisma } = await import("@/lib/prisma");
  const firstBranch = await prisma.branch.findFirst({ orderBy: { id: "asc" } });
  return firstBranch?.id || null;
}
