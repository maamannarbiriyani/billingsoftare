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
