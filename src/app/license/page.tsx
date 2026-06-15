"use client";

import { useState } from "react";
import { Key, ShieldAlert } from "lucide-react";
import { activateLicense } from "@/app/actions/license";
import { useRouter } from "next/navigation";

export default function LicensePage() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setIsPending(true);
    setError(null);

    const result = await activateLicense(formData);

    if (result.error) {
      setError(result.error);
    } else if (result.success) {
      router.push("/dashboard");
    }

    setIsPending(false);
  }

  return (
    <div className="min-h-screen bg-gray-50  flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-12 w-12 bg-red-100  rounded-full flex items-center justify-center">
            <ShieldAlert className="h-6 w-6 text-red-600 " />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 ">
          Software Locked
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 ">
          Your license has expired or is invalid. Please enter a valid
          activation key to continue using the Billing System.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white  py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-200 ">
          <form action={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-50  text-red-700  text-sm rounded-md border border-red-200 ">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="licenseKey"
                className="block text-sm font-medium text-gray-700 "
              >
                License Key
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  type="text"
                  name="licenseKey"
                  id="licenseKey"
                  required
                  placeholder="ACTIVATE-XXXXX"
                  className="block w-full pl-10 sm:text-sm border-gray-300  rounded-md bg-white  text-gray-900  focus:ring-indigo-500 focus:border-indigo-500 py-2 border"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isPending}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50"
              >
                {isPending ? "Validating..." : "Activate Software"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
