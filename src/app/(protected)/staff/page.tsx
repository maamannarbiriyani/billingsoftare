import { requireAdmin } from "@/lib/auth";
import { StaffClient } from "./StaffClient";
import { getSalarySummary } from "@/app/actions/staff";

export default async function StaffPage() {
  await requireAdmin();
  const employees = await getSalarySummary();

  return <StaffClient initialEmployees={employees} />;
}
