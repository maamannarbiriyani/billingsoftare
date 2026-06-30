import { redirect } from "next/navigation";

// Analytics has been merged into the Dashboard. Keep this route working
// for old links/bookmarks by sending visitors to the unified dashboard.
export default function AnalyticsRedirect() {
  redirect("/dashboard");
}
