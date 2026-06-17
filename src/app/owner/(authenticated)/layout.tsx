import { requireOwner } from "@/lib/owner-auth";
import { prisma } from "@/lib/prisma";
import { OwnerShell } from "@/components/owner/OwnerShell";

export const dynamic = "force-dynamic";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  await requireOwner();
  const setting = await prisma.setting.findFirst();

  return (
    <OwnerShell storeName={setting?.storeName || "My Store"}>
      {children}
    </OwnerShell>
  );
}
