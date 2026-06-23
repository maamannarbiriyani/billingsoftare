import { BillingCart } from "@/components/BillingCart";
import { getSession, getActiveBranchId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const session = await getSession();
  const cashierName = session?.username || "Admin";

  const branchId = await getActiveBranchId();
  const setting = await prisma.setting.findFirst({
    where: branchId ? { branchId } : undefined,
  });

  return (
    <BillingCart
      cashierName={cashierName as string}
      storeInfo={{
        storeName: setting?.storeName || "My Store",
        phone: setting?.phone || null,
        address: setting?.address || null,
        gstNumber: setting?.gstNumber || null,
      }}
    />
  );
}
