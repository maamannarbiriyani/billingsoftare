"use client";

import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { useRef } from "react";
import { ScanLine, Package, Users, FileText, CheckCircle2 } from "lucide-react";

export function ScrollStory() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"]
  });

  const smoothProgress = useSpring(scrollYProgress, { stiffness: 50, damping: 20 });

  const steps = [
    {
      id: "scan",
      title: "Lightning Fast Billing",
      description: "Scan a barcode and the product is instantly added to the cart. We built the POS to handle peak hours with zero lag.",
      icon: ScanLine,
      color: "text-[#6366F1]",
      bg: "bg-[#6366F1]/10",
      border: "border-[#6366F1]/20",
    },
    {
      id: "inventory",
      title: "Real-time Stock Sync",
      description: "The moment a bill is generated, inventory is deducted across all your connected devices and warehouses automatically.",
      icon: Package,
      color: "text-[#06B6D4]",
      bg: "bg-[#06B6D4]/10",
      border: "border-[#06B6D4]/20",
    },
    {
      id: "khata",
      title: "Integrated Digital Khata",
      description: "Allow regular customers to buy on credit. One click adds the bill to their digital ledger with automated WhatsApp reminders.",
      icon: Users,
      color: "text-[#10B981]",
      bg: "bg-[#10B981]/10",
      border: "border-[#10B981]/20",
    },
    {
      id: "reports",
      title: "Automated GST Reports",
      description: "End of month? Generate GSTR-1, GSTR-2, and GSTR-3B ready files instantly. No more manual calculations or accountant fees.",
      icon: FileText,
      color: "text-[#F59E0B]",
      bg: "bg-[#F59E0B]/10",
      border: "border-[#F59E0B]/20",
    }
  ];

  return (
    <section className="py-12 bg-[#030712] relative" ref={containerRef}>
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        <div className="text-center mb-20 max-w-3xl mx-auto">
           <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 text-slate-300 text-sm font-semibold mb-6 shadow-sm border border-white/10 backdrop-blur-sm"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>How it works</span>
          </motion.div>
          <h2 className="text-2xl md:text-3xl font-black text-white mb-6 tracking-tight">
            See the big picture. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Down to the last pixel.</span>
          </h2>
          <p className="text-xl text-slate-400 font-medium">
            Every module is designed to talk to each other perfectly. The result is a workflow that feels like magic.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative">
          
          {/* Left: Sticky Image Container */}
          <div className="hidden md:block relative h-[450px] sticky top-32 perspective-1000">
            <div className="absolute inset-0 bg-[#0F172A] rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center transform-style-3d">
              
              {/* Dynamic Image Overlay based on scroll */}
              <motion.div 
                className="absolute inset-0 flex items-center justify-center bg-[#0F172A]"
                style={{ opacity: useTransform(smoothProgress, [0, 0.25], [1, 0]) }}
              >
                <ScanLine className="w-48 h-48 text-[#6366F1]/40" />
              </motion.div>
              
              <motion.div 
                className="absolute inset-0 flex items-center justify-center bg-[#0F172A]"
                style={{ opacity: useTransform(smoothProgress, [0.2, 0.35, 0.5], [0, 1, 0]) }}
              >
                <Package className="w-48 h-48 text-[#06B6D4]/40" />
              </motion.div>
              
              <motion.div 
                className="absolute inset-0 flex items-center justify-center bg-[#0F172A]"
                style={{ opacity: useTransform(smoothProgress, [0.45, 0.6, 0.75], [0, 1, 0]) }}
              >
                <Users className="w-48 h-48 text-[#10B981]/40" />
              </motion.div>

              <motion.div 
                className="absolute inset-0 flex items-center justify-center bg-[#0F172A]"
                style={{ opacity: useTransform(smoothProgress, [0.7, 0.85], [0, 1]) }}
              >
                <FileText className="w-48 h-48 text-[#F59E0B]/40" />
              </motion.div>

            </div>
          </div>

          {/* Right: Scrolling Steps */}
          <div className="space-y-40 py-12">
            {steps.map((step, i) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: false, margin: "-20% 0px -20% 0px" }}
                transition={{ duration: 0.5 }}
                className="relative"
              >
                <div className={`w-16 h-16 rounded-2xl ${step.bg} ${step.color} ${step.border} border flex items-center justify-center mb-6 shadow-sm`}>
                  <step.icon className="h-8 w-8" />
                </div>
                <h3 className="text-3xl font-bold text-white mb-4">{step.title}</h3>
                <p className="text-lg text-slate-400 leading-relaxed font-medium">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
