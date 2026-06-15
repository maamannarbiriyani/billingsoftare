import { getActiveShift, getRecentShifts } from "@/app/actions/shifts";
import { ShiftsClient } from "./ShiftsClient";

export const dynamic = "force-dynamic";

export default async function ShiftsPage() {
  const activeShift = await getActiveShift();
  const recentShifts = await getRecentShifts();

  return (
    <div className="p-6">
      <ShiftsClient activeShift={activeShift} recentShifts={recentShifts} />
    </div>
  );
}
