"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { deleteProduct } from "@/app/actions/product";

import { toast } from "sonner";

export function DeleteProductButton({ id }: { id: number }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this product?")) {
      startTransition(async () => {
        try {
          await deleteProduct(id);
          toast.success("Product deleted successfully");
        } catch (error) {
          toast.error("Failed to delete product");
        }
      });
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="text-red-600 hover:text-red-900  disabled:opacity-50"
      title="Delete Product"
    >
      <Trash2 className="h-5 w-5" />
    </button>
  );
}
