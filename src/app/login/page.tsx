"use client";

import { useState } from "react";
import { login } from "@/app/actions/auth";
import { Store, ShoppingCart, Package, BarChart3, Lock, ArrowRight, Eye, EyeOff, UserPlus, CheckCircle } from "lucide-react";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);

  async function handleLoginSubmit(formData: FormData) {
    setIsPending(true);
    setError(null);
    const result = await login(formData);
    if (result?.error) {
      setError(result.error);
    }
    setIsPending(false);
  }

  async function handleRegisterSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      businessName: formData.get("businessName"),
      phone: formData.get("phone"),
      email: formData.get("email"),
    };

    try {
      const ADMIN_PORTAL_URL = process.env.NEXT_PUBLIC_ADMIN_PORTAL_URL || "http://localhost:3001";
      const res = await fetch(`${ADMIN_PORTAL_URL}/api/v1/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to submit request.");
      setRegisterSuccess(true);
    } catch (err) {
      setError("Unable to submit registration. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  const features = [
    { icon: ShoppingCart, title: "Point of Sale", desc: "Fast checkout with barcode scanner support" },
    { icon: Package, title: "Inventory Management", desc: "Real-time stock tracking & low-stock alerts" },
    { icon: BarChart3, title: "Business Analytics", desc: "Revenue insights and sales reports" },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-12 relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-1/4 -left-16 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-0 w-64 h-64 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3 mb-auto">
          <div className="bg-indigo-500 p-2.5 rounded-xl shadow-lg shadow-indigo-500/30">
            <Store className="h-6 w-6 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight">BillingSystem</span>
            <span className="ml-2 text-xs bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full font-medium">Enterprise</span>
          </div>
        </div>

        {/* Main content */}
        <div className="relative z-10 mt-16 mb-12">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight mb-4">
            The complete retail<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
              management system
            </span>
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed max-w-sm">
            Built for modern businesses — fast, offline-ready, and packed with powerful features.
          </p>
        </div>

        {/* Features */}
        <div className="relative z-10 space-y-4 mb-auto">
          {features.map((feature, i) => (
            <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/8 backdrop-blur-sm hover:bg-white/8 transition-colors">
              <div className="bg-indigo-500/20 p-2 rounded-lg border border-indigo-400/20 flex-shrink-0">
                <feature.icon className="h-4 w-4 text-indigo-400" />
              </div>
              <div>
                <p className="font-semibold text-sm text-white">{feature.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p className="relative z-10 text-xs text-slate-600 mt-8">
          © {new Date().getFullYear()} BillingSystem Enterprise. All rights reserved.
        </p>
      </div>

      {/* Right Panel — Forms */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-md py-10">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-10">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-500/30">
              <Store className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">BillingSystem</span>
          </div>

          {registerSuccess ? (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 mb-6">
                <CheckCircle className="h-8 w-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Request Received!</h2>
              <p className="mt-3 text-slate-500 leading-relaxed">
                Thank you for your interest in BillingSystem Enterprise. Our team has received your details and will call you shortly to process your setup and email you the access token.
              </p>
              <button
                onClick={() => { setRegisterSuccess(false); setIsRegistering(false); }}
                className="mt-8 btn btn-primary w-full"
              >
                Back to Login
              </button>
            </div>
          ) : isRegistering ? (
            <>
              <div className="mb-8">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 mb-6">
                  <UserPlus className="h-5 w-5 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Request Access</h2>
                <p className="mt-1.5 text-sm text-slate-500">Register your business to get a license key.</p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="input-label">Your Name</label>
                  <input id="name" name="name" type="text" required className="input-field" placeholder="John Doe" />
                </div>
                <div>
                  <label htmlFor="businessName" className="input-label">Business / Hotel Name</label>
                  <input id="businessName" name="businessName" type="text" required className="input-field" placeholder="Grand Hotel" />
                </div>
                <div>
                  <label htmlFor="phone" className="input-label">Phone Number</label>
                  <input id="phone" name="phone" type="tel" required className="input-field" placeholder="+1 (555) 000-0000" />
                </div>
                <div>
                  <label htmlFor="email" className="input-label">Email Address (Optional)</label>
                  <input id="email" name="email" type="email" className="input-field" placeholder="john@example.com" />
                </div>

                {error && (
                  <div className="flex items-center gap-2.5 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <button type="submit" disabled={isPending} className="btn btn-primary btn-lg w-full mt-2 group">
                  {isPending ? "Submitting..." : (
                    <span className="flex items-center justify-center gap-2">
                      Submit Request <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-500">
                Already have a license?{" "}
                <button onClick={() => setIsRegistering(false)} className="text-indigo-600 font-semibold hover:underline">
                  Sign in
                </button>
              </p>
            </>
          ) : (
            <>
              <div className="mb-8">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 mb-6">
                  <Lock className="h-5 w-5 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Welcome back</h2>
                <p className="mt-1.5 text-sm text-slate-500">Sign in to your account to continue</p>
              </div>

              <form action={handleLoginSubmit} className="space-y-5">
                <div>
                  <label htmlFor="username" className="input-label">Username</label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    autoComplete="username"
                    className="input-field"
                    placeholder="Enter your username"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="input-label">Password</label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      className="input-field pr-10"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                    <div className="w-4 h-4 rounded-full bg-red-500 flex-shrink-0 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isPending}
                  className="btn btn-primary btn-lg w-full group relative overflow-hidden"
                >
                  {isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Sign in
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  )}
                </button>
              </form>

              <p className="mt-8 text-center text-sm text-slate-500">
                New business?{" "}
                <button onClick={() => setIsRegistering(true)} className="text-indigo-600 font-semibold hover:underline">
                  Request access
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
