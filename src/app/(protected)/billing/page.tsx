import { BillingCart } from "@/components/BillingCart";
import { getSession } from "@/lib/auth";
import { ShoppingCart, Zap } from "lucide-react";

export default async function BillingPage() {
  const session = await getSession();
  const cashierName = session?.username || "Admin";

  return <BillingCart cashierName={cashierName as string} />;
}
