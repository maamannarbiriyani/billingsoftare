import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE = "owner_session";
const EXPIRY = "30d";

function getSecret() {
  const raw = process.env.JWT_SECRET || "fallback-owner-secret-change-in-prod";
  return new TextEncoder().encode(raw + "-owner");
}

export async function createOwnerSession(username: string) {
  const token = await new SignJWT({ username, type: "owner" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

export async function getOwnerSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    if (payload.type !== "owner") return null;
    return payload as { username: string; type: string };
  } catch {
    return null;
  }
}

export async function clearOwnerSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE);
}

export async function requireOwner(): Promise<{ username: string; type: string }> {
  const session = await getOwnerSession();
  if (!session) {
    const { redirect } = await import("next/navigation");
    redirect("/owner/login");
  }
  return session!;
}
