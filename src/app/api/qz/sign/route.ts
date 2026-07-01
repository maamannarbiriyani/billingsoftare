import crypto from "crypto";

// Signs QZ Tray print requests with the private key so printing is silent
// (no "Allow" prompt). Set QZ_PRIVATE_KEY in the environment to the PEM of the
// private key that matches QZ_CERT. If unset, returns empty (unsigned mode).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const toSign = new URL(req.url).searchParams.get("request") || "";
  const key = process.env.QZ_PRIVATE_KEY;
  if (!key) {
    return new Response("", { headers: { "Content-Type": "text/plain" } });
  }
  try {
    const signer = crypto.createSign("RSA-SHA512");
    signer.update(toSign);
    const signature = signer.sign(key.replace(/\\n/g, "\n"), "base64");
    return new Response(signature, { headers: { "Content-Type": "text/plain" } });
  } catch (e) {
    console.error("QZ sign error", e);
    return new Response("", { status: 500, headers: { "Content-Type": "text/plain" } });
  }
}
