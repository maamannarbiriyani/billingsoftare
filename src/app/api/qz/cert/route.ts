// Serves the QZ Tray public certificate for signed (silent) printing.
// Set QZ_CERT in the environment to the contents of your digital certificate.
// If unset, QZ runs unsigned and asks "Allow" on every connect/print.
// Public on purpose: the certificate is not a secret.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return new Response((process.env.QZ_CERT || "").replace(/\\n/g, "\n"), {
    headers: { "Content-Type": "text/plain" },
  });
}
