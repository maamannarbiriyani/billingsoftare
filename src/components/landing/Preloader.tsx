"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Store, CheckCircle2 } from "lucide-react";

export function Preloader({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState(0);

  const modules = [
    "Inventory",
    "CRM",
    "GST",
    "Analytics",
    "Reports",
    "POS Core"
  ];

  useEffect(() => {
    // Phase 1: Logo enters
    const t1 = setTimeout(() => setPhase(1), 300);
    
    // Phase 2: Start listing modules
    const t2 = setTimeout(() => setPhase(2), 600);
    
    // Phase 3: All modules checked, finish loading
    const t3 = setTimeout(() => {
      setPhase(3);
    }, 1200);

    // Phase 4: Trigger exit
    const t4 = setTimeout(() => {
      onComplete();
    }, 1500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] bg-[#030712] flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 1 }}
      animate={{ opacity: phase === 3 ? 0 : 1 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {/* Background Ambient Glow */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[450px] bg-indigo-600/10 blur-[100px] rounded-full"
        animate={{ scale: phase === 3 ? 2 : 1, opacity: phase === 3 ? 0 : 1 }}
        transition={{ duration: 0.5 }}
      />

      {/* Main Logo */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0, scale: phase === 3 ? 1.1 : 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center gap-3 mb-10 relative z-10"
      >
        <div className="bg-indigo-600 p-3 rounded-2xl shadow-[0_0_30px_rgba(79,70,229,0.5)]">
          <Store className="h-8 w-8 text-white" />
        </div>
        <span className="font-extrabold text-3xl tracking-tight text-white">
          BillingSystem
        </span>
      </motion.div>

      {/* Modules Initializing */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: phase >= 1 ? 1 : 0 }}
        className="text-slate-400 font-mono text-xs uppercase tracking-widest mb-6 relative z-10"
      >
        {phase === 2 ? "Initializing Modules..." : phase === 3 ? "Loading Complete" : "Starting System..."}
      </motion.div>

      <div className="flex flex-wrap justify-center max-w-sm gap-3 relative z-10">
        {modules.map((mod, i) => {
          // Stagger appearance of modules
          const isVisible = phase >= 2;
          
          return (
            <motion.div
              key={mod}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={isVisible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
              transition={{ delay: i * 0.05, duration: 0.2 }}
              className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-sm font-medium text-slate-300">{mod}</span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
