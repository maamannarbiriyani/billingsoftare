"use client";

import { motion } from "framer-motion";
import { Monitor, Apple, MonitorSmartphone, Globe, ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { MagneticButton } from "./MagneticButton";

export function Footer() {
  return (
    <footer className="bg-[#030712] pt-24 pb-12 border-t border-white/5 relative overflow-hidden">
      {/* Animated Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-[#6366F1]/10 blur-[150px] rounded-full pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-10 mb-20">
          <div className="col-span-2 lg:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center">
                <Monitor className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-2xl font-black text-white tracking-tight">Maamannar</h3>
            </div>
            
            <p className="text-slate-400 max-w-sm mb-8 leading-relaxed font-medium">
              The modern operating system for retail and hospitality businesses. Lightning-fast billing, intelligent inventory, and deep financial analytics.
            </p>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#6366F1] hover:border-[#6366F1] transition-all cursor-pointer text-slate-300 shadow-sm">X</div>
              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#6366F1] hover:border-[#6366F1] transition-all cursor-pointer text-slate-300 shadow-sm">in</div>
              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#6366F1] hover:border-[#6366F1] transition-all cursor-pointer text-slate-300 shadow-sm">fb</div>
            </div>
          </div>
          
          <div className="lg:col-start-4">
            <h4 className="text-white font-bold mb-6 text-sm">Product</h4>
            <ul className="space-y-4">
              <li><Link href="#" className="text-slate-400 hover:text-white transition-colors font-medium">Point of Sale</Link></li>
              <li><Link href="#" className="text-slate-400 hover:text-white transition-colors font-medium">Inventory Sync</Link></li>
              <li><Link href="#" className="text-slate-400 hover:text-white transition-colors font-medium">Digital Khata</Link></li>
              <li><Link href="#" className="text-slate-400 hover:text-white transition-colors font-medium">GST Reports</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white font-bold mb-6 text-sm">Resources</h4>
            <ul className="space-y-4">
              <li><Link href="#" className="text-slate-400 hover:text-white transition-colors font-medium">Documentation</Link></li>
              <li><Link href="#" className="text-slate-400 hover:text-white transition-colors font-medium">Hardware Setup</Link></li>
              <li><Link href="#" className="text-slate-400 hover:text-white transition-colors font-medium">API Reference</Link></li>
              <li><Link href="#" className="text-slate-400 hover:text-white transition-colors font-medium">Changelog</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white font-bold mb-6 text-sm">Company</h4>
            <ul className="space-y-4">
              <li><Link href="#" className="text-slate-400 hover:text-white transition-colors font-medium">About Us</Link></li>
              <li><Link href="#" className="text-slate-400 hover:text-white transition-colors font-medium">Careers</Link></li>
              <li><Link href="#" className="text-slate-400 hover:text-white transition-colors font-medium">Privacy Policy</Link></li>
              <li><Link href="#" className="text-slate-400 hover:text-white transition-colors font-medium">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-sm font-medium">© {new Date().getFullYear()} Maamannar. All rights reserved.</p>
          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
            <span>Designed with</span>
            <span className="text-rose-500">♥</span>
            <span>for Modern Retail</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
