"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

// Count Up Hook (Phase 9)
function useCountUp(end: number, duration: number = 2) {
  const [count, setCount] = useState(0);
  const [hasTriggered, setHasTriggered] = useState(false);

  useEffect(() => {
    if (!hasTriggered) return;
    
    let startTimestamp: number;
    let reqId: number;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
      
      // easeOutExpo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      setCount(Math.floor(easeProgress * end));
      
      if (progress < 1) {
        reqId = window.requestAnimationFrame(step);
      }
    };
    
    reqId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(reqId);
  }, [end, duration, hasTriggered]);

  const ref = (el: HTMLElement | null) => {
    if (el && !hasTriggered) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setHasTriggered(true);
            observer.disconnect();
          }
        },
        { threshold: 0.1 }
      );
      observer.observe(el);
    }
  };

  return { count, ref };
}

function StatItem({ stat }: { stat: any }) {
  const { count, ref } = useCountUp(stat.value, 2.5);
  return (
    <div ref={ref} className="text-left bg-[#0F172A] p-6 rounded-3xl border border-white/5 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-[#6366F1]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      <div className="text-2xl md:text-3xl font-black text-white mb-2 tracking-tight relative z-10">
        {stat.prefix}{count}{stat.suffix}
      </div>
      <div className="text-slate-400 font-semibold text-sm uppercase tracking-wider relative z-10">{stat.label}</div>
    </div>
  );
}

function LiveActivityFeed() {
  const possibleActivities = [
    { text: "Invoice Generated", amount: "₹1,250", type: "success" },
    { text: "Customer Added", amount: "", type: "info" },
    { text: "Stock Updated", amount: "+50 items", type: "warning" },
    { text: "GST Report Synced", amount: "", type: "success" },
    { text: "Khata Payment", amount: "₹450", type: "success" },
  ];

  const [activities, setActivities] = useState<any[]>(() => {
    return Array.from({ length: 4 }).map((_, i) => ({
      id: i,
      ...possibleActivities[Math.floor(Math.random() * possibleActivities.length)],
      time: "Just now"
    }));
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setActivities(prev => {
        const newAct = {
          id: Date.now(),
          ...possibleActivities[Math.floor(Math.random() * possibleActivities.length)],
          time: "Just now"
        };
        return [newAct, ...prev.slice(0, 3)];
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#030712] rounded-3xl border border-white/10 p-6 flex-1 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#6366F1]/20 blur-3xl rounded-full"></div>
      <h3 className="text-white font-bold mb-4 flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]"></span>
        </span>
        Live Activity Feed
      </h3>
      <div className="space-y-3 relative z-10">
        {activities.map((act) => (
          <motion.div
            key={act.id}
            initial={{ opacity: 0, x: -20, height: 0 }}
            animate={{ opacity: 1, x: 0, height: "auto" }}
            className="bg-[#0F172A] p-3 rounded-xl border border-white/5 flex justify-between items-center"
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${act.type === 'success' ? 'bg-[#10B981]/10 text-[#10B981]' : act.type === 'warning' ? 'bg-[#F59E0B]/10 text-[#F59E0B]' : 'bg-[#06B6D4]/10 text-[#06B6D4]'}`}>
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-200">{act.text}</p>
                <p className="text-xs text-slate-500">{act.time}</p>
              </div>
            </div>
            {act.amount && <div className="text-sm font-mono text-slate-300">{act.amount}</div>}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Integrations (Phase 8)
export function Integrations() {
  const hardware = ["Barcode Scanners", "Thermal Printers", "Cash Drawers", "Weighing Scales"];
  const software = ["Tally ERP 9", "Shopify", "WooCommerce", "Razorpay"];

  return (
    <section className="py-12 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-6 tracking-tight">
            Works with your existing setup.
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto font-medium">
            No need to buy new hardware. Our system is plug-and-play with 99% of retail hardware and popular software out of the box.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-[#F8FAFC] rounded-[2rem] p-8 border border-slate-200 shadow-sm hover:shadow-xl transition-shadow group">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">Hardware Support</h3>
            <div className="grid grid-cols-2 gap-4">
              {hardware.map((item, i) => (
                <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-3 shadow-sm group-hover:-translate-y-1 transition-transform" style={{ transitionDelay: `${i * 50}ms` }}>
                  <div className="w-2 h-2 rounded-full bg-[#10B981]"></div>
                  <span className="font-bold text-slate-700 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#F8FAFC] rounded-[2rem] p-8 border border-slate-200 shadow-sm hover:shadow-xl transition-shadow group">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">Software Integrations</h3>
            <div className="grid grid-cols-2 gap-4">
              {software.map((item, i) => (
                <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-3 shadow-sm group-hover:-translate-y-1 transition-transform" style={{ transitionDelay: `${i * 50}ms` }}>
                  <div className="w-2 h-2 rounded-full bg-[#6366F1]"></div>
                  <span className="font-bold text-slate-700 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


// Trust Section & Testimonials (Phase 9)
export function TrustSection() {
  const stats = [
    { label: "Invoices Generated", value: 10000, suffix: "+", prefix: "" },
    { label: "Active Stores", value: 500, suffix: "+", prefix: "" },
    { label: "Uptime Reliability", value: 99, suffix: ".9%", prefix: "" },
    { label: "Transactions Processed", value: 50, suffix: "M+", prefix: "" },
  ];

  const testimonials = [
    { name: "Vikram S.", role: "Supermarket Owner", text: "We moved from a legacy system to this. The speed of billing has halved our queue times." },
    { name: "Priya M.", role: "Boutique Manager", text: "The Khata integration is flawless. I know exactly who owes what without checking books." },
    { name: "Rahul D.", role: "Electronics Retailer", text: "GST reporting used to take days. Now it's literally one click. Unbelievable software." },
    { name: "Ananya K.", role: "Pharmacy Chain", text: "Inventory sync across our 3 branches is real-time. Best investment for our business." },
  ];

  return (
    <section className="py-16 bg-[#030712] overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Counters & Activity */}
        <div className="flex flex-col lg:flex-row gap-8 mb-20 items-stretch">
          <div className="flex-1 grid grid-cols-2 gap-6">
            {stats.map((stat, i) => (
              <StatItem key={i} stat={stat} />
            ))}
          </div>
          <div className="lg:w-1/3 flex">
            <LiveActivityFeed />
          </div>
        </div>

        {/* Testimonials Marquee */}
        <div className="relative w-full overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#030712] to-transparent z-10 pointer-events-none"></div>
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#030712] to-transparent z-10 pointer-events-none"></div>
          
          <motion.div
            className="flex gap-6 w-max"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ ease: "linear", duration: 30, repeat: Infinity }}
          >
            {[...testimonials, ...testimonials].map((t, i) => (
              <div key={i} className="w-[400px] bg-[#0F172A] p-8 rounded-3xl border border-white/5 flex-shrink-0 shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-[#6366F1]/10 transition-colors"></div>
                <div className="flex items-center gap-1 mb-4 text-[#F59E0B]">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg key={star} className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                  ))}
                </div>
                <p className="text-slate-300 text-lg mb-6 leading-relaxed relative z-10">"{t.text}"</p>
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white font-bold border border-white/20">
                    {t.name[0]}
                  </div>
                  <div>
                    <h4 className="text-white font-bold">{t.name}</h4>
                    <p className="text-sm text-[#6366F1] font-semibold">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
