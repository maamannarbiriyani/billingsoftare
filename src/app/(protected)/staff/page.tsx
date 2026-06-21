import { getSession } from "@/lib/auth";
import { StaffClient } from "./StaffClient";
import { getSalarySummary } from "@/app/actions/staff";
import { redirect } from "next/navigation";

export default async function StaffPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const userRole = (session.role as string) || "Cashier";

  const employees = await getSalarySummary();

  return <StaffClient initialEmployees={employees} userRole={userRole} />;
}
