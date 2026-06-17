"use client";

import { motion } from "framer-motion";
import { Database, TrendingUp, Users, FileText, Smartphone, Monitor } from "lucide-react";

export function ProductEcosystem() {
  const modules = [
    { name: "Inventory", icon: Database, desc: "Stock tracking & low alerts" },
    { name: "Analytics", icon: TrendingUp, desc: "Margin & sales reports" },
    { name: "Staff CRM", icon: Users, desc: "Attendance & payroll" },
    { name: "Khata", icon: Smartphone, desc: "Customer credit ledgers" },
    { name: "Taxation", icon: FileText, desc: "Automated GST filing" },
  ];

  return (
    <section className="py-24 bg-[#030712] relative border-t border-white/10" id="ecosystem">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
            A Fully Integrated Data Ecosystem
          </h2>
          <p className="text-lg text-slate-400">
            The POS Core sits at the center of your operations. Data flows instantly to Inventory, Ledgers, and Reports without manual syncs.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-24">
          
          {/* Core POS */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative flex-shrink-0"
          >
            <div className="w-48 h-48 bg-[#0F172A] rounded-3xl flex flex-col items-center justify-center shadow-2xl relative z-10 border border-white/10">
              <Monitor className="h-12 w-12 text-indigo-400 mb-3" />
              <span className="font-bold text-white text-lg">POS Core</span>
              <span className="text-slate-400 text-sm mt-1">Real-time Hub</span>
            </div>
            
            {/* Subtle pulse behind core */}
            <div className="absolute inset-0 bg-indigo-600/10 blur-2xl rounded-full scale-150"></div>
          </motion.div>

          {/* Lines / Arrows (Hidden on Mobile) */}
          <div className="hidden lg:flex gap-4 items-center text-slate-600">
            <svg width="100" height="2" className="overflow-visible">
              <line x1="0" y1="0" x2="100" y2="0" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
              <polygon points="100,-4 108,0 100,4" fill="currentColor" />
            </svg>
          </div>

          {/* Modules Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
            {modules.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/5 p-5 rounded-2xl border border-white/10 flex items-start gap-4 shadow-sm hover:border-indigo-500/50 hover:bg-white/10 transition-all backdrop-blur-sm"
              >
                <div className="bg-indigo-500/20 p-3 rounded-xl text-indigo-400 flex-shrink-0 border border-indigo-500/30">
                  <m.icon className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold text-white mb-1">{m.name}</h4>
                  <p className="text-sm text-slate-400 font-medium">{m.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
