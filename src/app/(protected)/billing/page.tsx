import { BillingCart } from "@/components/BillingCart";
import { getSession, getActiveBranchId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const session = await getSession();
  const cashierName = session?.username || "Admin";

  const branchId = await getActiveBranchId();
  // Prefer this branch's settings; fall back to any store settings so the
  // printed bill always shows a real store name (not "My Store").
  const setting =
    (branchId ? await prisma.setting.findFirst({ where: { branchId } }) : null) ||
    (await prisma.setting.findFirst());

  return (
    <BillingCart
      cashierName={cashierName as string}
      storeInfo={{
        storeName: setting?.storeName || "My Store",
        phone: setting?.phone || null,
        address: setting?.address || null,
        gstNumber: setting?.gstNumber || null,
        gstPercent: setting?.gstPercent || 0,
      }}
    />
  );
}
