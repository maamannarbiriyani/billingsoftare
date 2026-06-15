"use client";

import { Toaster as Sonner } from "sonner";

export function ToastProvider() {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-gray-950 group-[.toaster]:border-gray-200 group-[.toaster]:shadow-lg [.toaster]:bg-gray-950 [.toaster]:text-gray-50 [.toaster]:border-gray-800",
          description: "group-[.toast]:text-gray-500 [.toast]:text-gray-400",
          actionButton:
            "group-[.toast]:bg-gray-900 group-[.toast]:text-gray-50 [.toast]:bg-gray-50 [.toast]:text-gray-900",
          cancelButton:
            "group-[.toast]:bg-gray-100 group-[.toast]:text-gray-500 [.toast]:bg-gray-800 [.toast]:text-gray-400",
        },
      }}
    />
  );
}
