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
        className="btn btn-secondary"
      >
        <Upload className="h-4 w-4" />
        Bulk Import
      </button>

      {isOpen && <BulkImportModal onClose={() => setIsOpen(false)} />}
    </>
  );
}
