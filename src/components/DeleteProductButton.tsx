"use client";

import { Trash2 } from "lucide-react";
import { useTransition, useState } from "react";
import { deleteProduct } from "@/app/actions/product";
import { ConfirmModal } from "./ConfirmModal";

import { toast } from "sonner";

export function DeleteProductButton({ id }: { id: number }) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = () => {
    startTransition(async () => {
      try {
        const res = await deleteProduct(id);
        if (res?.error) {
          toast.error(res.error);
        } else {
          toast.success("Product deleted successfully");
        }
      } catch (error) {
        toast.error("Failed to delete product");
      } finally {
        setShowConfirm(false);
      }
    });
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={isPending}
        className="text-red-600 hover:text-red-900  disabled:opacity-50"
        title="Delete Product"
      >
        <Trash2 className="h-5 w-5" />
      </button>

      <ConfirmModal
        isOpen={showConfirm}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowConfirm(false)}
        isLoading={isPending}
      />
    </>
  );
}
