"use client";

import { useState } from "react";
import Papa from "papaparse";
import { Upload, X, FileText, CheckCircle2, Download } from "lucide-react";
import { bulkImportProducts, BulkProductInput } from "@/app/actions/product";
import { toast } from "sonner";

interface BulkImportModalProps {
  onClose: () => void;
}

export function BulkImportModal({ onClose }: BulkImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isPending, setIsPending] = useState(false);

  const downloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,name,barcode,price,stock,category\nSample Product,BAR-123,99.99,50,Groceries";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "products_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const processImport = async () => {
    if (!file) {
      toast.error("Please upload a CSV file first.");
      return;
    }

    setIsPending(true);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rawData = results.data as any[];
        
        // Map and validate
        const products: BulkProductInput[] = rawData.map(row => ({
          name: row.name || "",
          barcode: row.barcode || "",
          price: parseFloat(row.price),
          stock: parseInt(row.stock, 10),
          category: row.category || ""
        })).filter(p => p.name && !isNaN(p.price) && !isNaN(p.stock));

        if (products.length === 0) {
          toast.error("No valid products found. Please check your CSV format.");
          setIsPending(false);
          return;
        }

        const result = await bulkImportProducts(products);
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success(`Successfully imported ${result.count} products!`);
          onClose(); // Close modal on success
        }
        setIsPending(false);
      },
      error: (error) => {
        toast.error(`Error parsing CSV: ${error.message}`);
        setIsPending(false);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/50">
          <h2 className="text-xl font-bold text-foreground">Bulk Import Products</h2>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center bg-indigo-50/50 dark:bg-indigo-500/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-500/20">
             <div>
               <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-300">Need a template?</h3>
               <p className="text-xs text-indigo-700/70 dark:text-indigo-300/60 mt-0.5">Download our standard CSV format.</p>
             </div>
             <button
               onClick={downloadTemplate}
               className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 bg-card border border-indigo-200 dark:border-indigo-500/30 shadow-sm px-3 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors flex items-center gap-1.5"
             >
               <Download className="h-4 w-4" /> Template
             </button>
          </div>

          <div className="space-y-2">
            <label className="input-label">Upload CSV File</label>

            <div className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${file ? 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10' : 'border-border hover:border-indigo-400 hover:bg-muted'}`}>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isPending}
              />
              {file ? (
                <div className="flex flex-col items-center justify-center text-emerald-600">
                   <CheckCircle2 className="h-10 w-10 mb-2" />
                   <p className="font-bold text-sm">{file.name}</p>
                   <p className="text-xs opacity-70 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-muted-foreground">
                  <FileText className="h-10 w-10 mb-3 text-muted-foreground/70" />
                  <p className="text-sm font-medium">Click or drag your CSV file here</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Only .csv files are supported</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-muted border-t border-border flex gap-3">
          <button
            onClick={onClose}
            disabled={isPending}
            className="btn btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            onClick={processImport}
            disabled={!file || isPending}
            className="btn btn-primary flex-1 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" /> Import Data
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
