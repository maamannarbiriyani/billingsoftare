import crypto from "crypto";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/auth";

// Signs QZ Tray requests with the private key so printing is silent (no
// "Allow" prompt). Set QZ_PRIVATE_KEY to the PEM of the key that matches
// QZ_CERT. POST (not GET) because print payloads can exceed URL limits.
// Requires a logged-in session so outsiders can't get signatures from our key.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const text = (body: string, status = 200) =>
  new Response(body, { status, headers: { "Content-Type": "text/plain" } });

export async function POST(req: Request) {
  const session = await decrypt((await cookies()).get("session")?.value);
  if (!session) return text("Unauthorized", 401);

  const key = process.env.QZ_PRIVATE_KEY;
  if (!key) return text("QZ_PRIVATE_KEY not configured", 503);

  const toSign = await req.text();
  try {
    const signer = crypto.createSign("RSA-SHA512");
    signer.update(toSign);
    return text(signer.sign(key.replace(/\\n/g, "\n"), "base64"));
  } catch {
    // Never log the payload or the key
    console.error("QZ sign error: invalid QZ_PRIVATE_KEY?");
    return text("Sign failed", 500);
  }
}
