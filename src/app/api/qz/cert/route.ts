// Serves the QZ Tray public certificate for signed (silent) printing.
// Set QZ_CERT in the environment to the contents of your digital certificate.
// If unset, QZ runs unsigned (a one-time "Allow" prompt appears on the PC).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(process.env.QZ_CERT || "", {
    headers: { "Content-Type": "text/plain" },
  });
}
