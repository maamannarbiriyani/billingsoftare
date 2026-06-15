"use client";

import { motion } from "framer-motion";
import { TrendingUp, Database, FileText, Users, PieChart } from "lucide-react";
import React from "react";

export function BentoGrid() {
  return (
    <section className="py-24 bg-white relative overflow-hidden" id="features">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <div className="mb-16 max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6 tracking-tight">
            Everything you need. <br />
            <span className="text-indigo-600">Nothing you don't.</span>
          </h2>
          <p className="text-lg text-slate-600">
            A complete suite of enterprise-grade tools designed to work together seamlessly, giving you total control over every aspect of your retail operations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-[280px]">
          
          {/* Sales Card - Large */}
          <motion.div 
            whileInView={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 20 }}
            viewport={{ once: true }}
            className="md:col-span-2 lg:col-span-2 bg-slate-50 rounded-2xl p-8 border border-slate-200 transition-shadow hover:shadow-md flex flex-col justify-between overflow-hidden relative"
          >
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-indigo-600 font-semibold text-sm mb-3">
                <TrendingUp className="h-5 w-5" /> Real-time Sales
              </div>
              <h3 className="text-2xl font-bold text-slate-900 max-w-sm">Monitor your revenue and orders as they happen.</h3>
            </div>
            
            <div className="h-32 flex items-end gap-2 mt-4 relative z-10">
              {[40, 70, 45, 90, 65, 100, 80].map((h, i) => (
                <div key={i} className="flex-1 bg-slate-200 rounded-t-md relative overflow-hidden">
                  <motion.div 
                    initial={{ height: 0 }}
                    whileInView={{ height: `${h}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: i * 0.1, ease: "easeOut" }}
                    className="absolute bottom-0 w-full bg-indigo-500 rounded-t-md"
                  ></motion.div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Inventory Card */}
          <motion.div 
            whileInView={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 20 }}
            viewport={{ once: true }}
            className="bg-slate-900 rounded-2xl p-8 shadow-sm flex flex-col justify-between text-white"
          >
            <div>
              <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm mb-3">
                <Database className="h-5 w-5" /> Smart Inventory
              </div>
              <h3 className="text-xl font-bold mb-6">Never run out of stock.</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm border-b border-slate-700 pb-2">
                <span className="text-slate-300">Premium Coffee</span>
                <span className="text-emerald-400 font-medium">In Stock</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-slate-700 pb-2">
                <span className="text-slate-300">Almond Milk</span>
                <span className="text-red-400 font-medium">Low (3)</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-300">Green Tea</span>
                <span className="text-amber-400 font-medium">Reorder</span>
              </div>
            </div>
          </motion.div>

          {/* Customer Khata Card */}
          <motion.div 
            whileInView={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 20 }}
            viewport={{ once: true }}
            className="md:col-span-2 lg:col-span-1 bg-slate-50 rounded-2xl p-8 border border-slate-200 transition-shadow hover:shadow-md flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm mb-3">
                <Users className="h-5 w-5" /> Digital Khata
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-6">Credit tracking made simple.</h3>
            </div>
            
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <span className="font-semibold text-slate-700">Rahul Sharma</span>
                <span className="text-red-600 font-semibold">₹1,250</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} whileInView={{ width: '60%' }} viewport={{ once: true }} className="h-full bg-red-500 rounded-full"></motion.div>
              </div>
              <p className="text-xs text-slate-500 mt-3 font-medium">Credit Limit: ₹2,000</p>
            </div>
          </motion.div>

          {/* GST Card */}
          <motion.div 
            whileInView={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 20 }}
            viewport={{ once: true }}
            className="bg-slate-50 rounded-2xl p-8 border border-slate-200 transition-shadow hover:shadow-md flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-2 text-amber-600 font-semibold text-sm mb-3">
                <FileText className="h-5 w-5" /> 1-Click GST
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-6">Tax filing, automated.</h3>
            </div>
            
            <div className="flex flex-col gap-3">
              <div className="bg-white px-4 py-3 rounded-xl flex justify-between items-center text-sm border border-slate-200 shadow-sm">
                <span className="font-medium text-slate-600">GSTR-1</span>
                <span className="text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-md text-xs">Ready</span>
              </div>
              <div className="bg-white px-4 py-3 rounded-xl flex justify-between items-center text-sm border border-slate-200 shadow-sm">
                <span className="font-medium text-slate-600">GSTR-3B</span>
                <span className="text-indigo-700 font-semibold bg-indigo-50 px-2.5 py-1 rounded-md text-xs">Generating</span>
              </div>
            </div>
          </motion.div>

          {/* Reports Card - Wide */}
          <motion.div 
            whileInView={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 20 }}
            viewport={{ once: true }}
            className="md:col-span-3 lg:col-span-3 bg-slate-900 rounded-2xl p-8 shadow-sm text-white flex flex-col md:flex-row items-center justify-between gap-8 border border-slate-800"
          >
            <div className="flex-1 max-w-lg">
              <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm mb-3">
                <PieChart className="h-5 w-5" /> Deep Analytics
              </div>
              <h3 className="text-3xl font-bold mb-4">Understand your business.</h3>
              <p className="text-slate-400 leading-relaxed">
                Discover top-selling items, busiest hours, and profit margins across your entire product range with beautiful, exportable visual reports.
              </p>
            </div>
            
            <div className="w-48 h-48 flex-shrink-0 relative">
              <motion.div 
                initial={{ rotate: -90, opacity: 0 }}
                whileInView={{ rotate: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="w-full h-full rounded-full border-[12px] border-slate-800 relative shadow-inner"
                style={{
                  background: 'conic-gradient(#6366f1 0% 45%, #3b82f6 45% 75%, #10b981 75% 100%)',
                  borderRadius: '50%'
                }}
              >
                <div className="absolute inset-4 bg-slate-900 rounded-full flex flex-col items-center justify-center">
                  <span className="text-sm text-slate-400 font-medium">Margin</span>
                  <span className="font-bold text-2xl">42%</span>
                </div>
              </motion.div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
