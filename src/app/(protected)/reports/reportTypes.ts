// Single source of truth for the mobile report sections.
// Used by the sidebar drawer (mobile nav), the in-page ReportNav pills,
// and the reports page (for titles).
export type ReportType = {
  id: string;
  label: string; // full name (drawer + page title)
  short: string; // compact name (in-page pills)
};

export const REPORT_TYPES: ReportType[] = [
  { id: "sales", label: "Sales Report", short: "Sales" },
  { id: "items", label: "Item Wise Sales Report", short: "Item Wise" },
  { id: "itemsales", label: "Item Sales Report", short: "Item Sales" },
  { id: "category", label: "Consolidated Category Report", short: "Category" },
  { id: "hourly", label: "Hourly Sales Report", short: "Hourly" },
  { id: "categoryitems", label: "Category Item Wise Sales Report", short: "Cat. Items" },
  { id: "daywise", label: "Day Wise Sales Report", short: "Day Wise" },
  { id: "monthly", label: "Monthly Sales Report", short: "Monthly" },
];

export function reportLabel(id: string) {
  return REPORT_TYPES.find((r) => r.id === id)?.label ?? "Sales Report";
}
