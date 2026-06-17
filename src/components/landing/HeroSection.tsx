"use client";

import { motion } from "framer-motion";
import { ArrowRight, BarChart3, Package, Users } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative w-full pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-[#030712]">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-[0.05] pointer-events-none"></div>
      
      {/* Minimal Gradient Accent */}
      <div className="absolute top-0 inset-x-0 h-[600px] bg-gradient-to-b from-indigo-900/20 via-[#030712]/50 to-transparent pointer-events-none blur-3xl"></div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10 flex flex-col items-center text-center">
        
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 shadow-[0_0_15px_rgba(79,70,229,0.15)] mb-8 backdrop-blur-sm"
        >
          <span className="flex h-2 w-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]"></span>
          <span className="text-xs font-bold text-indigo-200 tracking-wide uppercase">Enterprise Retail OS v2.4</span>
        </motion.div>

        {/* Headline */}
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.1] max-w-4xl mb-6"
        >
          The Operating System for <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-indigo-400 animate-gradient">Modern Retail</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto font-medium leading-relaxed"
        >
          Unify your point of sale, inventory management, and digital ledgers into one powerful, real-time enterprise platform.
        </motion.p>

        {/* CTAs */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto"
        >
          <a href="#demo" className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-full font-bold text-sm transition-all hover:bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.3)]">
            View Live Demo
            <ArrowRight className="w-4 h-4" />
          </a>
          <a href="#features" className="w-full sm:w-auto px-8 py-4 bg-white/5 text-white rounded-full font-bold text-sm transition-all border border-white/10 hover:border-white/20 hover:bg-white/10 backdrop-blur-md">
            Explore Features
          </a>
        </motion.div>

        {/* Trust/Feature Bar */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-20 pt-10 border-t border-white/10 w-full max-w-4xl flex flex-wrap items-center justify-center gap-8 md:gap-16 text-slate-400"
        >
          <div className="flex items-center gap-2">
            <div className="bg-indigo-500/20 p-2 rounded-lg border border-indigo-500/30">
              <BarChart3 className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="text-sm font-semibold text-slate-300">Real-time Analytics</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-cyan-500/20 p-2 rounded-lg border border-cyan-500/30">
              <Package className="w-5 h-5 text-cyan-400" />
            </div>
            <span className="text-sm font-semibold text-slate-300">Smart Inventory</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-violet-500/20 p-2 rounded-lg border border-violet-500/30">
              <Users className="w-5 h-5 text-violet-400" />
            </div>
            <span className="text-sm font-semibold text-slate-300">Multi-store Staffing</span>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
