"use client";

import { SmoothScroll } from "@/components/landing/SmoothScroll";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { LivePosDemo } from "@/components/landing/LivePosDemo";
import { ProductEcosystem } from "@/components/landing/ProductEcosystem";
import { BentoGrid } from "@/components/landing/BentoGrid";
import { ScrollStory } from "@/components/landing/ScrollStory";
import { ScreenshotShowcase } from "@/components/landing/ScreenshotShowcase";
import { Integrations, TrustSection } from "@/components/landing/IntegrationsAndTrust";
import { Footer } from "@/components/landing/DownloadAndFooter";
import { motion } from "framer-motion";

export function LandingClient() {
  return (
    <SmoothScroll>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-600/20 selection:text-indigo-900 overflow-x-hidden relative"
      >
        <Navbar />
        
        <main>
          <HeroSection />
          <LivePosDemo />
          <ProductEcosystem />
          <ScrollStory />
          <BentoGrid />
          <ScreenshotShowcase />
          <Integrations />
          <TrustSection />
        </main>

        <Footer />
      </motion.div>
    </SmoothScroll>
  );
}
