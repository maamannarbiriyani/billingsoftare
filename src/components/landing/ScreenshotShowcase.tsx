"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { Search, Plus, Filter, MoreHorizontal, ShoppingCart, TrendingUp, Users, Package, FileText } from "lucide-react";

// Mockup Components using Tailwind CSS

function PosMockup() {
  return (
    <div className="w-full h-full bg-[#030712] flex flex-col font-sans text-slate-300">
      <div className="h-12 bg-[#0F172A] border-b border-white/10 flex items-center justify-between px-4">
        <div className="font-bold text-indigo-400 flex items-center gap-2"><ShoppingCart className="w-4 h-4" /> POS Terminal</div>
        <div className="flex gap-2"><div className="w-20 h-6 bg-white/5 rounded-md border border-white/10"></div><div className="w-6 h-6 bg-white/10 rounded-full"></div></div>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-[2] p-4 border-r border-white/10 bg-[#030712]">
          <div className="w-full h-8 bg-[#0F172A] border border-white/10 rounded-md mb-4 flex items-center px-2 text-slate-500">
            <Search className="w-4 h-4 mr-2" /> Search products...
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="bg-[#0F172A] p-3 rounded-lg border border-white/10 shadow-sm flex flex-col items-center justify-center gap-2">
                <div className="w-10 h-10 bg-indigo-500/20 rounded-full"></div>
                <div className="w-16 h-2 bg-slate-700 rounded"></div>
                <div className="w-10 h-2 bg-slate-600 rounded"></div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 bg-[#0F172A] flex flex-col">
          <div className="p-4 border-b border-white/10 font-bold text-white">Current Order</div>
          <div className="flex-1 p-4 space-y-3">
            {[1,2].map(i => (
              <div key={i} className="flex justify-between items-center text-sm">
                <div><div className="w-20 h-3 bg-slate-400 rounded mb-1"></div><div className="w-10 h-2 bg-slate-600 rounded"></div></div>
                <div className="w-8 h-3 bg-slate-500 rounded"></div>
              </div>
            ))}
          </div>
          <div className="p-4 bg-[#030712] border-t border-white/10">
            <div className="flex justify-between font-bold text-lg mb-4 text-white"><span>Total</span><span>₹450</span></div>
            <div className="w-full h-10 bg-indigo-600 rounded-lg shadow-[0_0_15px_rgba(79,70,229,0.3)]"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InventoryMockup() {
  return (
    <div className="w-full h-full bg-[#0F172A] flex flex-col font-sans">
      <div className="h-14 border-b border-white/10 flex items-center px-6 justify-between">
        <div className="font-bold text-white flex items-center gap-2"><Package className="w-4 h-4 text-cyan-400" /> Inventory Management</div>
        <div className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-md font-bold flex items-center gap-1 shadow-sm"><Plus className="w-3 h-3"/> Add Item</div>
      </div>
      <div className="p-6">
        <div className="flex justify-between mb-4">
          <div className="flex gap-2">
            <div className="w-48 h-8 bg-white/5 border border-white/10 rounded-md"></div>
            <div className="w-8 h-8 bg-white/5 border border-white/10 rounded-md flex items-center justify-center text-slate-400"><Filter className="w-4 h-4" /></div>
          </div>
        </div>
        <div className="w-full border border-white/10 rounded-lg overflow-hidden">
          <div className="bg-white/5 border-b border-white/10 flex p-3 text-xs font-bold text-slate-400">
            <div className="flex-[2]">Product Name</div>
            <div className="flex-1">SKU</div>
            <div className="flex-1">Stock</div>
            <div className="flex-1">Status</div>
            <div className="w-8"></div>
          </div>
          {[1,2,3,4].map((i) => (
            <div key={i} className="flex p-3 border-b border-white/5 items-center text-sm text-slate-300">
              <div className="flex-[2] flex items-center gap-2"><div className="w-6 h-6 bg-white/10 rounded"></div><div className="w-24 h-3 bg-slate-400 rounded"></div></div>
              <div className="flex-1"><div className="w-16 h-2 bg-slate-600 rounded"></div></div>
              <div className="flex-1 font-mono">{100 - i * 15}</div>
              <div className="flex-1"><span className={`px-2 py-0.5 rounded-full text-[10px] border ${i === 4 ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>{i === 4 ? 'Low Stock' : 'In Stock'}</span></div>
              <div className="w-8 text-slate-500"><MoreHorizontal className="w-4 h-4" /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AnalyticsMockup() {
  return (
    <div className="w-full h-full bg-[#0F172A] flex flex-col font-sans text-white">
      <div className="h-14 border-b border-white/10 flex items-center px-6">
        <div className="font-bold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-[#8B5CF6]" /> Business Analytics</div>
      </div>
      <div className="p-6 flex-1 flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="w-16 h-2 bg-slate-500 rounded mb-4"></div>
              <div className="w-24 h-6 bg-white rounded mb-2"></div>
              <div className="w-12 h-2 bg-emerald-400 rounded"></div>
            </div>
          ))}
        </div>
        <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-4 flex items-end gap-2 pb-8">
          {[40, 60, 45, 80, 55, 90, 70, 100].map((h, i) => (
            <div key={i} className="flex-1 bg-indigo-500/20 rounded-t relative">
              <div className="absolute bottom-0 w-full bg-indigo-500 rounded-t" style={{ height: `${h}%` }}></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ScreenshotShowcase() {
  const [activeTab, setActiveTab] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const tabs = [
    { title: "Point of Sale", color: "#6366F1", mockup: <PosMockup /> },
    { title: "Inventory", color: "#06B6D4", mockup: <InventoryMockup /> },
    { title: "Analytics", color: "#8B5CF6", mockup: <AnalyticsMockup /> },
  ];

  // Auto-cycle tabs
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTab((prev) => (prev + 1) % tabs.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [tabs.length]);

  return (
    <section className="py-12 bg-[#030712] relative overflow-hidden" ref={containerRef}>
      {/* Background glow matching active tab */}
      <motion.div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[150px] pointer-events-none opacity-20"
        animate={{ backgroundColor: tabs[activeTab].color }}
        transition={{ duration: 1 }}
      />

      <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col items-center">
        
        <div className="text-center mb-16">
          <h2 className="text-2xl md:text-3xl font-black text-white mb-6 tracking-tight">
            Designed for <span className="text-transparent bg-clip-text bg-gradient-to-r" style={{ backgroundImage: `linear-gradient(to right, ${tabs[activeTab].color}, #fff)` }}>Enterprise.</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            A beautiful, intuitive interface that your staff will learn in minutes, not days. Built with modern design principles for maximum efficiency.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex gap-2 p-1.5 bg-white/5 backdrop-blur-md rounded-2xl mb-16 border border-white/10">
          {tabs.map((tab, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTab(idx)}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all relative ${
                activeTab === idx ? "text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {activeTab === idx && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-white/10 rounded-xl"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <span className="relative z-10">{tab.title}</span>
            </button>
          ))}
        </div>

        {/* 3D Stack Mockup Display */}
        <div className="relative w-full max-w-5xl h-[450px] perspective-1000 flex items-center justify-center transform-style-3d">
          {tabs.map((tab, idx) => {
            const isActive = activeTab === idx;
            // Calculate relative position for the stack (0 = active, 1 = one behind, 2 = two behind)
            let relativeIndex = idx - activeTab;
            if (relativeIndex < 0) relativeIndex += tabs.length;

            return (
              <motion.div
                key={idx}
                className="absolute w-full h-[550px] rounded-[2rem] overflow-hidden shadow-2xl border border-white/20 origin-bottom"
                initial={false}
                animate={{
                  y: relativeIndex * -40, // Move up for background cards
                  scale: 1 - relativeIndex * 0.05, // Scale down
                  z: relativeIndex * -100, // Move backwards in Z space
                  opacity: isActive ? 1 : 1 - relativeIndex * 0.3, // Fade out
                  rotateX: isActive ? 5 : 15, // Tilt back
                  filter: isActive ? 'blur(0px)' : `blur(${relativeIndex * 4}px)`
                }}
                transition={{
                  duration: 0.8,
                  ease: [0.16, 1, 0.3, 1], // Custom spring-like easing
                }}
                style={{
                  zIndex: tabs.length - relativeIndex,
                }}
              >
                {/* MacOS Window Bar */}
                <div className="h-8 bg-[#1E293B] border-b border-white/10 flex items-center px-4 gap-2 absolute top-0 w-full z-20">
                  <div className="w-3 h-3 rounded-full bg-[#EF4444]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#F59E0B]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#10B981]"></div>
                </div>
                
                {/* Inject the actual Mockup Component */}
                <div className="absolute top-8 bottom-0 left-0 right-0 overflow-hidden bg-white">
                  {tab.mockup}
                </div>
                
                {/* Active Highlight Overlay */}
                <div className="absolute inset-0 pointer-events-none border border-white/10 rounded-[2rem]"></div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
