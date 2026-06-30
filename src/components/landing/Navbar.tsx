"use client";

import { useState } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import Link from "next/link";
import { Store, LogIn, Command } from "lucide-react";
import { MagneticButton } from "./MagneticButton";

export function Navbar() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 20);
  });

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-5xl rounded-full transition-all duration-300 ${scrolled ? "bg-[#0F172A]/80 backdrop-blur-md border border-white/10 shadow-lg py-3" : "bg-transparent py-4"}`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Left */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Store className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">
              Maamannar
            </span>
          </div>

          {/* Center */}
          <div className="hidden md:flex items-center gap-8">
            {["Features", "Demo", "Ecosystem", "Integrations", "Pricing"].map((item) => (
              <Link
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                {item}
              </Link>
            ))}
          </div>

          {/* Right */}
          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10 text-xs text-slate-400 font-medium">
              <Command className="w-3 h-3" /> K
            </div>
            <Link
              href="/login"
              className="flex items-center gap-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-4 sm:px-5 py-2 rounded-full transition-colors shadow-[0_0_20px_rgba(79,70,229,0.4)] whitespace-nowrap"
            >
              <LogIn className="h-4 w-4" /> Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
