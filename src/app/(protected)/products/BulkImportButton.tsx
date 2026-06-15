"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { BulkImportModal } from "./BulkImportModal";

export function BulkImportButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-md bg-card border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-muted transition-colors"
      >
        <Upload className="h-4 w-4" />
        Bulk Import
      </button>

      {isOpen && <BulkImportModal onClose={() => setIsOpen(false)} />}
    </>
  );
}
