"use client";

import { useTransition } from "react";
import { Download } from "lucide-react";
import { exportGSTReportCSV } from "@/app/actions/export";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";

export function ExportButton() {
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const range = searchParams.get("range") || "today";

  const handleExport = () => {
    startTransition(async () => {
      try {
        const now = new Date();
        let startDate: Date | undefined;
        let endDate: Date | undefined;

        if (range === "today") {
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000 - 1);
        } else if (range === "yesterday") {
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
          endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000 - 1);
        } else if (range === "week") {
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        } else if (range === "month") {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        }

        const csvData = await exportGSTReportCSV(startDate, endDate);
        const blob = new Blob([csvData], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Report_${range}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Report downloaded successfully");
      } catch (error) {
        toast.error("Failed to export report");
      }
    });
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => window.print()}
        className="btn bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 print:hidden"
      >
        <Download className="h-4 w-4" />
        Print / Save PDF
      </button>
      <button
        onClick={handleExport}
        disabled={isPending}
        className="btn bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 print:hidden"
      >
        <Download className="h-4 w-4" />
        {isPending ? "Exporting..." : "Export Excel (CSV)"}
      </button>
    </div>
  );
}
