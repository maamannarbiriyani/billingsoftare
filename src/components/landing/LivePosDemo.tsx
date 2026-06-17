"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Plus, Minus, ScanBarcode, Printer, CheckCircle2, Loader2, FileText, ArrowRight } from "lucide-react";

const DEMO_PRODUCTS = [
  { id: 1, name: "Premium Coffee Beans", price: 450, category: "Groceries" },
  { id: 2, name: "Organic Honey 500g", price: 320, category: "Groceries" },
  { id: 3, name: "Wireless Mouse", price: 899, category: "Electronics" },
  { id: 4, name: "Notebook A4", price: 120, category: "Stationery" },
];

export function LivePosDemo() {
  const [cart, setCart] = useState<{ id: number; name: string; price: number; qty: number }[]>([]);
  const [step, setStep] = useState<"SCAN" | "PROCESSING" | "PRINTING" | "SUCCESS">("SCAN");
  const [lastScanned, setLastScanned] = useState<number | null>(null);

  const addToCart = (product: typeof DEMO_PRODUCTS[0]) => {
    setLastScanned(product.id);
    setTimeout(() => setLastScanned(null), 500); // clear flash
    setCart((prev) => {
      const exists = prev.find((i) => i.id === product.id);
      if (exists) {
        return prev.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i))
        .filter((i) => i.qty > 0)
    );
  };

  const total = cart.reduce((acc, item) => acc + item.price * item.qty, 0);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setStep("PROCESSING");
    
    // Workflow simulation
    setTimeout(() => {
      setStep("PRINTING");
      setTimeout(() => {
        setStep("SUCCESS");
      }, 2500);
    }, 1500);
  };

  return (
    <section id="demo" className="py-12 bg-[#030712] relative z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-[0.05]"></div>
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#6366F1]/10 text-[#6366F1] text-sm font-semibold mb-6 shadow-sm border border-[#6366F1]/20"
          >
            <ScanBarcode className="h-4 w-4" />
            <span>Interactive Demo</span>
          </motion.div>
          <h2 className="text-2xl md:text-3xl font-black text-white mb-6 tracking-tight">
            Try it yourself. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">No signup required.</span>
          </h2>
          <p className="text-lg text-slate-400 font-medium">
            Experience the speed of our Point of Sale system right here in your browser. Add products, generate a bill, and see how fast you can checkout a customer.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 max-w-5xl mx-auto items-stretch">
          
          {/* Left: Product Scanner Simulation */}
          <div className="flex-1 w-full bg-white/5 backdrop-blur-md rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/10 flex flex-col">
            <h3 className="font-bold text-white mb-6 flex items-center gap-2 text-lg">
              <ScanBarcode className="h-6 w-6 text-indigo-400" />
              Tap to Scan Products
            </h3>
            <div className="grid grid-cols-2 gap-4 flex-1">
              {DEMO_PRODUCTS.map((p) => (
                <motion.button
                  key={p.id}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (step === "SUCCESS") {
                      setCart([]);
                      setStep("SCAN");
                    }
                    addToCart(p);
                  }}
                  className="relative bg-white/5 border border-white/10 p-5 rounded-2xl text-left transition-colors group overflow-hidden hover:bg-white/10"
                >
                  {/* Scan Flash Overlay */}
                  <AnimatePresence>
                    {lastScanned === p.id && (
                      <motion.div 
                        initial={{ opacity: 0.8, scale: 1 }}
                        animate={{ opacity: 0, scale: 1.1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-[#10B981]/20 z-0 pointer-events-none"
                      />
                    )}
                  </AnimatePresence>
                  
                  <div className="relative z-10">
                    <p className="font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">{p.name}</p>
                    <p className="text-sm font-semibold text-slate-400 mt-1 flex justify-between items-center">
                      ₹{p.price}
                      <Plus className="h-4 w-4 text-slate-500 group-hover:text-indigo-400" />
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>
            <div className="mt-8 p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-sm text-indigo-300 font-medium flex items-start gap-3">
              <div className="mt-0.5">💡</div>
              <p>Pro tip: In the real application, you can use a physical USB/Bluetooth barcode scanner to add products instantly.</p>
            </div>
          </div>

          {/* Right: Cart & Checkout */}
          <div className="w-full lg:w-[420px] bg-[#030712] rounded-[2rem] p-6 text-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] border border-white/10 relative overflow-hidden flex flex-col flex-shrink-0">
            {/* Ambient Top Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 bg-[#6366F1]/30 blur-2xl rounded-full pointer-events-none"></div>
            
            <h3 className="font-bold mb-6 flex items-center gap-2 text-white text-lg relative z-10">
              <ShoppingCart className="h-6 w-6 text-[#6366F1]" />
              Current Order
            </h3>

            <div className="bg-[#0F172A]/80 backdrop-blur-sm rounded-2xl p-4 flex-1 flex flex-col border border-white/5 relative z-10 min-h-[350px]">
              <div className="flex-1 space-y-3 overflow-y-auto max-h-[300px] pr-2 scrollbar-thin scrollbar-thumb-slate-700">
                <AnimatePresence>
                  {cart.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="h-full flex flex-col items-center justify-center text-slate-500 py-12"
                    >
                      <ShoppingCart className="h-12 w-12 mb-3 opacity-20" />
                      <p className="text-sm font-medium">Cart is empty</p>
                    </motion.div>
                  ) : (
                    cart.map((item) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -20, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9, height: 0, marginTop: 0 }}
                        className="flex items-center justify-between bg-[#1E293B] p-3 rounded-xl border border-white/5 shadow-sm"
                      >
                        <div className="flex-1 min-w-0 pr-3">
                          <p className="font-bold text-sm text-white truncate">{item.name}</p>
                          <p className="text-xs text-slate-400 font-medium mt-0.5">₹{item.price} x {item.qty}</p>
                        </div>
                        <div className="flex items-center gap-1.5 bg-[#030712] rounded-lg p-1 border border-white/5">
                          <button onClick={() => updateQty(item.id, -1)} className="p-1 hover:bg-slate-700 rounded-md text-slate-400 transition-colors">
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="text-xs font-bold w-5 text-center text-white">{item.qty}</span>
                          <button onClick={() => updateQty(item.id, 1)} className="p-1 hover:bg-slate-700 rounded-md text-slate-400 transition-colors">
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>

              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-slate-400 font-medium">Total Amount</span>
                  <span className="text-3xl font-black text-white">₹{total.toLocaleString()}</span>
                </div>
                
                <AnimatePresence mode="wait">
                  {step === "SCAN" && (
                    <motion.button
                      key="scan"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      onClick={handleCheckout}
                      disabled={cart.length === 0}
                      className="relative w-full py-4 bg-[#6366F1] hover:bg-[#4F46E5] disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl transition-colors active:scale-95 group overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
                      <span className="flex items-center justify-center gap-2 relative z-10">
                        Generate Bill <ArrowRight className="h-4 w-4" />
                      </span>
                    </motion.button>
                  )}

                  {step === "PROCESSING" && (
                    <motion.div
                      key="process"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="w-full py-4 bg-[#0F172A] border border-white/10 text-indigo-400 font-bold rounded-xl flex items-center justify-center gap-3 shadow-inner"
                    >
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Processing Sale...
                    </motion.div>
                  )}

                  {step === "PRINTING" && (
                    <motion.div
                      key="print"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="w-full py-4 bg-[#0F172A] border border-white/10 text-white font-bold rounded-xl flex flex-col items-center justify-center relative overflow-hidden"
                    >
                      <div className="flex items-center gap-3 relative z-10">
                        <Printer className="h-5 w-5 animate-bounce text-slate-300" />
                        Printing Receipt
                      </div>
                      {/* Animated receipt paper out of button */}
                      <motion.div 
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 20, opacity: 1 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-x-10 bottom-0 h-10 bg-white/10 rounded-t-lg border border-white/20 -z-0"
                      />
                    </motion.div>
                  )}

                  {step === "SUCCESS" && (
                    <motion.button
                      key="success"
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      onClick={() => { setCart([]); setStep("SCAN"); }}
                      className="w-full py-4 bg-[#10B981] hover:bg-[#059669] text-white font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                    >
                      <CheckCircle2 className="h-5 w-5" />
                      Success! Next Customer
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
