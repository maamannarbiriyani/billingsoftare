"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import {
  Search, Plus, Minus, Trash2, ShoppingCart, User,
  CreditCard, Banknote, Smartphone, Tag, Package,
  X, Calculator, Printer, Monitor, SplitSquareHorizontal,
  Clock, ArrowLeftRight, Archive, ScanLine, Pizza, CupSoda,
  Receipt, ChevronRight, Zap, Grid3X3, LayoutGrid, CheckCircle2,
  AlertCircle, RefreshCw, Home, Utensils, Bike, ShoppingBag
} from "lucide-react";
import {
  getAllProductsForBilling,
  getAllCustomersForBilling,
  createInvoice,
  collectKhataPayment,
  CartItem,
} from "@/app/actions/billing";
import { getTables, getRunningOrders, parkOrder, closeOrder, createTable } from "@/app/actions/tables";
import {
  getPendingOnlineOrders,
  acceptOnlineOrder,
  rejectOnlineOrder,
} from "@/app/actions/aggregator";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { KOTPrintReceipt, KOTData } from "./KOTPrintReceipt";

// ─── Design tokens ────────────────────────────────────────────────
const S = {
  bg:        "#f8fafc",
  surface:   "#ffffff",
  card:      "#ffffff",
  border:    "#e2e8f0",
  borderHi:  "rgba(0,0,0,0.15)",
  txt:       "#0f172a",
  muted:     "#64748b",
  dim:       "#94a3b8",
  violet:    "#8b5cf6",
  violetLo:  "rgba(139,92,246,0.15)",
  emerald:   "#10b981",
  emeraldLo: "rgba(16,185,129,0.12)",
  rose:      "#f43f5e",
  roseLo:    "rgba(244,63,94,0.12)",
  amber:     "#f59e0b",
  amberLo:   "rgba(245,158,11,0.12)",
  cyan:      "#06b6d4",
  cyanLo:    "rgba(6,182,212,0.1)",
};

// ─── Kitchen receipt popup (goes to kitchen printer) ──────────────
function printKitchenCopy(opts: {
  invoiceNumber: string;
  items: Array<{ name: string; qty: number }>;
  tableName?: string;
  customerName?: string;
  orderMode: string;
}) {
  const win = window.open("", "_blank", "width=360,height=640,toolbar=0,scrollbars=0,status=0,menubar=0");
  if (!win) {
    alert("⚠️ Popup blocked! Allow popups for this site to print kitchen copy.");
    return;
  }
  const rows = opts.items
    .map(i => `<tr><td class="qty">${i.qty}×</td><td class="name">${i.name.toUpperCase()}</td></tr>`)
    .join("");

  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Kitchen Copy</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Courier New',monospace;width:80mm;padding:6px 8px;font-size:14px;background:#fff;color:#000}
  @page{margin:0;size:80mm auto}
  h1{text-align:center;font-size:20px;font-weight:900;text-transform:uppercase;letter-spacing:3px;margin-bottom:2px}
  .sub{text-align:center;font-size:11px;letter-spacing:1px;margin-bottom:6px}
  .meta{text-align:center;font-size:12px;margin-bottom:8px;padding-bottom:6px;border-bottom:2px dashed #000}
  .badge{display:inline-block;background:#000;color:#fff;padding:2px 8px;font-size:10px;font-weight:900;letter-spacing:2px;margin-bottom:4px}
  table{width:100%;border-collapse:collapse;margin-bottom:6px}
  thead tr{border-bottom:2px solid #000}
  th{font-size:11px;text-transform:uppercase;letter-spacing:1px;padding:3px 0;text-align:left}
  td{padding:6px 0;border-bottom:1px dashed #888;vertical-align:top;font-weight:bold}
  .qty{width:32px;font-size:16px;font-weight:900}
  .name{font-size:15px;padding-left:4px;line-height:1.3}
  .footer{text-align:center;font-size:11px;margin-top:8px;padding-top:6px;border-top:2px dashed #000;font-weight:bold;letter-spacing:2px}
</style></head><body>
<h1>KOT</h1>
<div class="sub">Kitchen Order Ticket</div>
<div class="meta">
  <div class="badge">${opts.orderMode.replace(/_/g, " ")}</div><br>
  <strong>${opts.invoiceNumber}</strong><br>
  ${opts.tableName ? `Table: <strong>${opts.tableName}</strong><br>` : ""}
  ${opts.customerName ? `Customer: <strong>${opts.customerName}</strong><br>` : ""}
  ${new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
</div>
<table>
  <thead><tr><th>Qty</th><th>Item</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="footer">*** END KOT ***</div>
</body></html>`);
  win.document.close();
  setTimeout(() => { win.print(); win.close(); }, 450);
}

export function BillingCart() {
  const [query, setQuery] = useState("");
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [isCheckingOut, startCheckout] = useTransition();
  const [isFetching, startFetching] = useTransition();
  const [viewMode, setViewMode] = useState<"PRODUCTS" | "TABLES" | "ONLINE">("PRODUCTS");
  const [tables, setTables] = useState<any[]>([]);
  const [onlineOrders, setOnlineOrders] = useState<any[]>([]);
  const [runningOrders, setRunningOrders] = useState<any[]>([]);
  const [activeTableId, setActiveTableId] = useState<number | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<number | null>(null);
  const [showNewTableModal, setShowNewTableModal] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMounted, setIsMounted] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState("Cash");
  const [selectedOrderMode, setSelectedOrderMode] = useState("DINE_IN");
  const [printKotData, setPrintKotData] = useState<KOTData | null>(null);
  const [khataPayAmount, setKhataPayAmount] = useState<string>("");
  const [printKOT, setPrintKOT] = useState(true);

  const router = useRouter();

  const loadTablesAndOrders = async () => {
    const [t, ro] = await Promise.all([getTables(), getRunningOrders()]);
    setTables(t);
    setRunningOrders(ro);
  };

  useEffect(() => {
    setIsMounted(true);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchOnline = async () => {
      const data = await getPendingOnlineOrders();
      setOnlineOrders(data);
    };
    fetchOnline();
    const timer = setInterval(fetchOnline, 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    startFetching(async () => {
      const [prods, custs] = await Promise.all([
        getAllProductsForBilling(),
        getAllCustomersForBilling()
      ]);
      setAllProducts(prods);
      setAllCustomers(custs);
      await loadTablesAndOrders();
    });
  }, []);

  const filteredProducts = useMemo(() => {
    return allProducts.filter((p) => {
      const matchesSearch =
        query === "" ||
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        (p.barcode && p.barcode.includes(query));
      const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [allProducts, query, selectedCategory]);

  const categories = useMemo(() => {
    const cats = new Set(allProducts.map((p) => p.category).filter(Boolean));
    return ["All", ...Array.from(cats)];
  }, [allProducts]);

  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        price: product.price,
        costPrice: product.costPrice,
        gstRate: product.gstRate || 0,
        qty: 1
      }];
    });
    setQuery("");
  };

  const updateQty = (productId: number, delta: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, qty: Math.max(1, item.qty + delta) }
          : item
      )
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setDiscountAmount(0);
    setActiveTableId(null);
    setActiveOrderId(null);
  };

  const loadOrderIntoCart = (order: any) => {
    const loadedCart = order.items.map((i: any) => ({
      productId: i.productId,
      name: i.product.name,
      price: i.price,
      costPrice: i.costPrice,
      gstRate: i.gstRate || 0,
      qty: i.qty
    }));
    setCart(loadedCart);
    setActiveOrderId(order.id);
    setActiveTableId(order.tableId);
    setViewMode("PRODUCTS");
  };

  const handleParkOrder = async () => {
    if (cart.length === 0) return;
    if (!activeTableId) {
      toast.error("Please select a table to park the order");
      setViewMode("TABLES");
      return;
    }
    const table = tables.find(t => t.id === activeTableId);
    setPrintKotData({
      tableId: activeTableId,
      tableName: table?.name || "Table " + activeTableId,
      orderId: activeOrderId,
      time: new Date().toLocaleTimeString(),
      items: cart.map(item => ({ name: item.name, qty: item.qty }))
    });
    startCheckout(async () => {
      const res = await parkOrder(activeTableId, cart, activeOrderId);
      if (res.error) {
        toast.error(res.error);
        setPrintKotData(null);
      } else {
        toast.success(activeOrderId ? "KOT Updated" : "KOT Sent to Kitchen");
        setTimeout(async () => {
          window.print();
          clearCart();
          setPrintKotData(null);
          await loadTablesAndOrders();
          setViewMode("TABLES");
        }, 100);
      }
    });
  };

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  const gstAmount = parseFloat(cart.reduce((acc, item) => acc + (item.price * item.qty * (item.gstRate || 0)) / 100, 0).toFixed(2));
  const grandTotal = parseFloat(Math.max(0, subtotal + gstAmount - discountAmount).toFixed(2));

  const handleCheckout = (paymentMethod: string, printBill: boolean) => {
    if (cart.length === 0) return;
    if (paymentMethod === "CREDIT" && !customerName) {
      toast.error("Customer name is required for Khata (Credit) payments.");
      return;
    }
    startCheckout(async () => {
      const effectiveGstRate = subtotal > 0 ? parseFloat(((gstAmount / subtotal) * 100).toFixed(2)) : 0;
      // Capture cart snapshot before clearCart
      const cartSnapshot = [...cart];
      const result = await createInvoice(
        cart,
        { name: customerName, phone: customerPhone },
        { subtotal, gstRate: effectiveGstRate, gstAmount, discountAmount, total: grandTotal, paymentMethod, orderId: activeOrderId || undefined, orderMode: selectedOrderMode }
      );
      if (result.error) {
        toast.error(result.error);
      } else if (result.success && result.invoiceId) {
        if (activeOrderId) await closeOrder(activeOrderId);
        clearCart();
        setCheckoutModalOpen(false);
        await loadTablesAndOrders();

        if (printBill) {
          if (printKOT) {
            // 1. Print kitchen copy in a popup → user directs to kitchen printer
            printKitchenCopy({
              invoiceNumber: result.invoiceNumber || `#${result.invoiceId}`,
              items: cartSnapshot.map(i => ({ name: i.name, qty: i.qty })),
              tableName: tables.find(t => t.id === activeTableId)?.name,
              customerName: customerName || undefined,
              orderMode: selectedOrderMode,
            });
          }
          // 2. Navigate to invoice with ?autoprint=1 → customer bill auto-prints there
          router.push(`/invoices/${result.invoiceId}?autoprint=1`);
        } else {
          toast.success("Invoice created!");
          router.push(`/invoices/${result.invoiceId}`);
        }
      }
    });
  };

  const paymentModes = [
    { label: "CASH",   method: "Cash",   icon: Banknote,            accent: S.emerald, lo: S.emeraldLo },
    { label: "CARD",   method: "Card",   icon: CreditCard,          accent: S.violet,  lo: S.violetLo  },
    { label: "UPI",    method: "UPI",    icon: Smartphone,          accent: S.cyan,    lo: S.cyanLo    },
    { label: "SPLIT",  method: "SPLIT",  icon: SplitSquareHorizontal, accent: S.amber, lo: S.amberLo   },
    { label: "CREDIT", method: "CREDIT", icon: User,                accent: S.rose,    lo: S.roseLo    },
  ];

  return (
    <>
      <KOTPrintReceipt data={printKotData} />

      {/* ═══ FULL-SCREEN POS SHELL (no frame/border/rounded) ═══ */}
      <div
        className="flex flex-col print:hidden"
        style={{
          height: "calc(100vh - 3.5rem)",   /* subtract header height */
          background: S.bg,
          color: S.txt,
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >

        {/* ── STATUS BAR ── */}
        <div
          className="h-11 flex items-center justify-between px-5 flex-shrink-0"
          style={{ background: S.surface, borderBottom: `1px solid ${S.border}` }}
        >
          {/* Left: terminal + status indicators */}
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2.5">
              <span
                className="h-2 w-2 rounded-full animate-pulse"
                style={{ background: S.emerald, boxShadow: `0 0 6px ${S.emerald}` }}
              />
              <span className="text-xs font-black tracking-widest uppercase" style={{ color: S.txt }}>
                Terminal 1
              </span>
            </div>
            <span style={{ background: S.border, width: 1, height: 16 }} />
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: S.emerald }}>
                <Printer className="h-3.5 w-3.5" /> Ready
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: S.emerald }}>
                <ScanLine className="h-3.5 w-3.5" /> Ready
              </div>
            </div>
            {activeTableId && (
              <div
                className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full"
                style={{ background: S.violetLo, color: S.violet, border: `1px solid rgba(139,92,246,0.3)` }}
              >
                <Home className="h-3 w-3" />
                {tables.find(t => t.id === activeTableId)?.name || "Table"}
              </div>
            )}
          </div>

          {/* Right: cashier + time */}
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: S.muted }}>
              <User className="h-3.5 w-3.5" /> Cashier: Admin
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold tabular-nums" style={{ color: S.txt }}>
              <Clock className="h-3.5 w-3.5" style={{ color: S.muted }} />
              {isMounted ? currentTime.toLocaleTimeString() : "--:--:--"}
            </div>
          </div>
        </div>

        {/* ── THREE-COLUMN BODY ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ════ COL 1: CATEGORIES (14%) ════ */}
          <div
            className="flex flex-col flex-shrink-0 overflow-hidden"
            style={{
              width: "14%",
              background: S.surface,
              borderRight: `1px solid ${S.border}`,
            }}
          >
            {/* View toggle */}
            <div className="p-3 flex-shrink-0" style={{ borderBottom: `1px solid ${S.border}` }}>
              <div
                className="flex rounded-lg overflow-hidden p-0.5 gap-0.5"
                style={{ background: "rgba(0,0,0,0.04)", border: `1px solid ${S.border}` }}
              >
                {[
                  { label: "Products", mode: "PRODUCTS" as const },
                  { label: "Tables",   mode: "TABLES"   as const },
                  { label: "Web",      mode: "ONLINE"   as const },
                ].map(({ label, mode }) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className="relative flex-1 py-1.5 text-[11px] font-black rounded-md transition-all"
                    style={
                      viewMode === mode
                        ? { background: S.violetLo, color: "#c4b5fd", border: `1px solid rgba(139,92,246,0.3)` }
                        : { color: S.muted, border: "1px solid transparent" }
                    }
                  >
                    {label}
                    {mode === "ONLINE" && onlineOrders.length > 0 && (
                      <span
                        className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full animate-pulse"
                        style={{ background: S.rose, boxShadow: `0 0 6px ${S.rose}` }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Category list */}
            <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5 scrollbar-thin">
              {categories.map((cat) => {
                const count = cat === "All" ? allProducts.length : allProducts.filter(p => p.category === cat).length;
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => { setSelectedCategory(cat); setViewMode("PRODUCTS"); }}
                    className="w-full flex items-center justify-between px-2.5 py-2.5 rounded-lg transition-all text-left"
                    style={
                      isActive
                        ? { background: S.violetLo, borderLeft: `2px solid ${S.violet}` }
                        : { borderLeft: "2px solid transparent", color: S.muted }
                    }
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Tag className="h-3 w-3 flex-shrink-0" style={{ color: isActive ? S.violet : S.dim }} />
                      <span
                        className="font-bold text-xs truncate"
                        style={{ color: isActive ? "#e0d0ff" : S.muted }}
                      >
                        {cat}
                      </span>
                    </div>
                    <span
                      className="text-[11px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ml-1"
                      style={
                        isActive
                          ? { background: "rgba(139,92,246,0.3)", color: "#c4b5fd" }
                          : { background: "rgba(0,0,0,0.05)", color: S.dim }
                      }
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ════ COL 2: PRODUCT GRID (55%) ════ */}
          <div className="flex flex-col flex-shrink-0 overflow-hidden" style={{ width: "55%", background: S.bg }}>

            {/* Quick actions + search */}
            <div
              className="px-4 pt-3 pb-3 flex-shrink-0 space-y-2.5"
              style={{ background: S.surface, borderBottom: `1px solid ${S.border}` }}
            >
              {/* Action buttons row */}
              <div className="flex gap-2">
                {[
                  { label: "New Bill",  icon: Plus,           action: clearCart },
                  { label: "Recall",    icon: ArrowLeftRight, action: () => setViewMode("TABLES") },
                  { label: "Customer",  icon: User,           action: () => {} },
                  { label: "Invoices",  icon: Receipt,        action: () => router.push("/invoices") },
                ].map(({ label, icon: Icon, action }) => (
                  <button
                    key={label}
                    onClick={action}
                    className="flex-1 py-2 flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-all"
                    style={{
                      background: "rgba(0,0,0,0.03)",
                      border: `1px solid ${S.border}`,
                      color: S.muted,
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.07)";
                      (e.currentTarget as HTMLButtonElement).style.color = S.txt;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.03)";
                      (e.currentTarget as HTMLButtonElement).style.color = S.muted;
                    }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Search bar */}
              <div className="relative">
                <Search
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                  style={{ color: S.violet }}
                />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setViewMode("PRODUCTS"); }}
                  placeholder="Search products by name or barcode..."
                  autoFocus
                  className="w-full pl-10 pr-10 py-2.5 text-sm font-semibold rounded-xl transition-all outline-none"
                  style={{
                    background: "rgba(0,0,0,0.04)",
                    border: `1px solid ${S.borderHi}`,
                    color: S.txt,
                    caretColor: S.violet,
                  }}
                  onFocus={e => {
                    (e.currentTarget as HTMLInputElement).style.border = `1px solid ${S.violet}`;
                    (e.currentTarget as HTMLInputElement).style.boxShadow = `0 0 0 3px ${S.violetLo}`;
                  }}
                  onBlur={e => {
                    (e.currentTarget as HTMLInputElement).style.border = `1px solid ${S.borderHi}`;
                    (e.currentTarget as HTMLInputElement).style.boxShadow = "none";
                  }}
                />
                <ScanLine
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                  style={{ color: S.dim }}
                />
              </div>
            </div>

            {/* Grid area */}
            <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">

              {/* ── ONLINE ORDERS ── */}
              {viewMode === "ONLINE" && (
                <div className="grid grid-cols-2 gap-3">
                  {onlineOrders.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 gap-3">
                      <Smartphone className="h-12 w-12" style={{ color: S.dim }} />
                      <p className="font-bold text-base" style={{ color: S.muted }}>No pending online orders</p>
                      <p className="text-xs" style={{ color: S.dim }}>Waiting for Swiggy / Zomato webhooks...</p>
                    </div>
                  ) : onlineOrders.map(order => (
                    <div
                      key={order.id}
                      className="rounded-xl overflow-hidden flex flex-col"
                      style={{ background: S.card, border: `1px solid ${S.border}` }}
                    >
                      <div
                        className="p-3 flex justify-between items-center font-bold text-white text-sm"
                        style={{ background: order.source === "SWIGGY" ? "#f97316" : "#e11d48" }}
                      >
                        <span>{order.source}</span>
                        <span className="text-xs opacity-80">#{order.externalId}</span>
                      </div>
                      <div className="p-4 flex-1 space-y-1.5">
                        {order.items.map((i: any) => (
                          <div key={i.id} className="flex justify-between text-xs font-semibold" style={{ color: S.txt }}>
                            <span>{i.qty}× {i.product.name}</span>
                            <span>₹{(i.price * i.qty).toFixed(2)}</span>
                          </div>
                        ))}
                        <div className="pt-2 mt-1 text-right font-black text-sm" style={{ borderTop: `1px solid ${S.border}`, color: S.txt }}>
                          ₹{order.items.reduce((s: number, i: any) => s + i.price * i.qty, 0).toFixed(2)}
                        </div>
                      </div>
                      <div className="flex" style={{ borderTop: `1px solid ${S.border}` }}>
                        <button
                          onClick={async () => {
                            await rejectOnlineOrder(order.id);
                            setOnlineOrders(p => p.filter(o => o.id !== order.id));
                            toast.success("Order Rejected");
                          }}
                          className="flex-1 p-3 text-xs font-bold transition-colors"
                          style={{ color: S.rose }}
                        >
                          Reject
                        </button>
                        <div style={{ width: 1, background: S.border }} />
                        <button
                          onClick={async () => {
                            await acceptOnlineOrder(order.id);
                            setOnlineOrders(p => p.filter(o => o.id !== order.id));
                            toast.success("Accepted & KOT Sent");
                            setPrintKotData({
                              tableId: 0, tableName: order.source, orderId: order.id,
                              time: new Date().toLocaleTimeString(),
                              items: order.items.map((i: any) => ({ name: i.product.name, qty: i.qty }))
                            });
                            setTimeout(() => { window.print(); setPrintKotData(null); }, 100);
                          }}
                          className="flex-[2] p-3 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                          style={{ color: S.emerald, background: S.emeraldLo }}
                        >
                          <Printer className="h-4 w-4" /> Accept & KOT
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── PRODUCT GRID ── */}
              {viewMode === "PRODUCTS" && (
                <div className="grid grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5">
                  {filteredProducts.map((product) => {
                    const inCart = cart.find((i) => i.productId === product.id);
                    const isUnlimited = product.stock === 999999;
                    const isOutOfStock = !isUnlimited && product.stock <= 0;
                    const isLowStock = !isUnlimited && !isOutOfStock && product.stock <= 5;
                    return (
                      <motion.button
                        layout
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.15 }}
                        key={product.id}
                        onClick={() => !isOutOfStock && addToCart(product)}
                        disabled={isOutOfStock}
                        className="relative flex flex-col text-left rounded-xl overflow-hidden transition-all duration-200 active:scale-95"
                        style={{
                          background: inCart ? "rgba(139,92,246,0.08)" : S.card,
                          border: inCart
                            ? `1px solid rgba(139,92,246,0.5)`
                            : isOutOfStock
                            ? `1px solid rgba(0,0,0,0.04)`
                            : `1px solid ${S.border}`,
                          opacity: isOutOfStock ? 0.45 : 1,
                          boxShadow: inCart ? `0 0 16px rgba(139,92,246,0.15)` : "none",
                        }}
                      >
                        {/* Image / Icon area */}
                        <div
                          className="h-24 w-full flex items-center justify-center overflow-hidden relative"
                          style={{ background: "rgba(0,0,0,0.02)", borderBottom: `1px solid ${S.border}` }}
                        >
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                          ) : product.category?.toLowerCase().includes("food") || product.category?.toLowerCase().includes("pizza") ? (
                            <Pizza className="h-7 w-7" style={{ color: S.dim }} />
                          ) : product.category?.toLowerCase().includes("drink") || product.category?.toLowerCase().includes("bev") ? (
                            <CupSoda className="h-7 w-7" style={{ color: S.dim }} />
                          ) : (
                            <Package className="h-7 w-7" style={{ color: S.dim }} />
                          )}
                        </div>

                        {/* Info */}
                        <div className="p-2.5 flex flex-col flex-1">
                          <p className="font-bold text-sm leading-tight line-clamp-2 mb-1.5" style={{ color: S.txt }}>
                            {product.name}
                          </p>
                          <div className="mt-auto flex items-center justify-between">
                            <span className="text-sm font-black" style={{ color: S.violet }}>
                              ₹{product.price.toFixed(2)}
                            </span>
                            {isOutOfStock ? (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ background: S.roseLo, color: S.rose }}>
                                OUT
                              </span>
                            ) : isLowStock ? (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ background: S.amberLo, color: S.amber }}>
                                {product.stock} left
                              </span>
                            ) : (
                              <div
                                className="p-1 rounded-lg transition-colors"
                                style={inCart
                                  ? { background: S.violet, color: "#fff" }
                                  : { background: "rgba(0,0,0,0.06)", color: S.muted }
                                }
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Cart badge */}
                        {inCart && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full text-white text-[10px] font-black flex items-center justify-center"
                            style={{ background: S.violet, boxShadow: `0 0 8px ${S.violet}` }}
                          >
                            {inCart.qty}
                          </motion.div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {/* ── TABLES GRID ── */}
              {viewMode === "TABLES" && (
                <div className="grid grid-cols-3 xl:grid-cols-4 gap-3">
                  {tables.map(table => {
                    const isOccupied = table.status === "OCCUPIED";
                    const isActive = activeTableId === table.id;
                    const order = runningOrders.find(o => o.tableId === table.id);
                    return (
                      <button
                        key={table.id}
                        onClick={() => {
                          if (isOccupied && order) loadOrderIntoCart(order);
                          else { setActiveTableId(table.id); setActiveOrderId(null); if (cart.length === 0) setViewMode("PRODUCTS"); }
                        }}
                        className="relative p-4 rounded-xl text-left transition-all duration-200 hover:-translate-y-1 active:scale-95"
                        style={{
                          background: isActive
                            ? "rgba(139,92,246,0.1)"
                            : isOccupied
                            ? "rgba(244,63,94,0.06)"
                            : S.card,
                          border: isActive
                            ? "1px solid rgba(139,92,246,0.5)"
                            : isOccupied
                            ? `1px solid rgba(244,63,94,0.3)`
                            : `1px solid ${S.border}`,
                          boxShadow: isActive ? "0 0 20px rgba(139,92,246,0.12)" : "none",
                        }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <span className="font-black text-sm" style={{ color: S.txt }}>{table.name}</span>
                          {isOccupied && (
                            <span
                              className="h-2 w-2 rounded-full animate-pulse mt-1"
                              style={{ background: S.rose, boxShadow: `0 0 6px ${S.rose}` }}
                            />
                          )}
                        </div>
                        <div
                          className="rounded-lg p-2"
                          style={{
                            background: isOccupied ? "rgba(244,63,94,0.08)" : "rgba(16,185,129,0.08)",
                          }}
                        >
                          <p className="text-[10px] font-black mb-0.5" style={{ color: isOccupied ? S.rose : S.emerald }}>
                            {isOccupied ? "● OCCUPIED" : "● AVAILABLE"}
                          </p>
                          {isOccupied && order && (
                            <p className="text-[10px] font-semibold" style={{ color: S.muted }}>
                              {order.items.reduce((a: any, i: any) => a + i.qty, 0)} items running
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setShowNewTableModal(true)}
                    className="p-4 rounded-xl border-dashed border-2 flex flex-col items-center justify-center gap-2 transition-colors"
                    style={{ borderColor: S.dim, color: S.dim }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = S.violet;
                      (e.currentTarget as HTMLButtonElement).style.color = S.violet;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = S.dim;
                      (e.currentTarget as HTMLButtonElement).style.color = S.dim;
                    }}
                  >
                    <Plus className="h-5 w-5" />
                    <span className="text-xs font-bold">Add Table</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ════ COL 3: CART / CHECKOUT (31%) ════ */}
          <div
            className="flex flex-col flex-shrink-0 overflow-hidden"
            style={{
              width: "31%",
              background: S.surface,
              borderLeft: `1px solid ${S.border}`,
            }}
          >
            {/* Customer input */}
            <div className="px-3.5 pt-3 pb-3 flex-shrink-0" style={{ borderBottom: `1px solid ${S.border}` }}>
              <div className="relative">
                <User
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none"
                  style={{ color: S.muted }}
                />
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => { setCustomerName(e.target.value); setShowCustomerDropdown(true); }}
                  onFocus={(e) => {
                    setShowCustomerDropdown(true);
                    (e.currentTarget as HTMLInputElement).style.border = `1px solid ${S.violet}`;
                    (e.currentTarget as HTMLInputElement).style.boxShadow = `0 0 0 2px ${S.violetLo}`;
                  }}
                  onBlur={(e) => {
                    setTimeout(() => setShowCustomerDropdown(false), 200);
                    (e.currentTarget as HTMLInputElement).style.border = `1px solid ${S.border}`;
                    (e.currentTarget as HTMLInputElement).style.boxShadow = "none";
                  }}
                  placeholder="Walk-in Customer"
                  className="w-full pl-8 pr-3 py-2 text-xs font-semibold rounded-lg outline-none transition-all"
                  style={{
                    background: "rgba(0,0,0,0.04)",
                    border: `1px solid ${S.border}`,
                    color: S.txt,
                  }}
                />
                {/* Autocomplete dropdown */}
                {showCustomerDropdown && customerName && (
                  <div
                    className="absolute z-50 top-[calc(100%+4px)] left-0 right-0 rounded-xl overflow-hidden shadow-2xl max-h-44 overflow-y-auto"
                    style={{ background: S.card, border: `1px solid ${S.borderHi}` }}
                  >
                    {allCustomers
                      .filter(c => c.name.toLowerCase().includes(customerName.toLowerCase()))
                      .map(c => (
                        <button
                          key={c.id}
                          className="w-full text-left px-3 py-2.5 text-xs font-semibold transition-colors"
                          style={{ color: S.txt, borderBottom: `1px solid ${S.border}` }}
                          onClick={() => { setCustomerName(c.name); setCustomerPhone(c.phone || ""); setShowCustomerDropdown(false); }}
                          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.05)"}
                          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "transparent"}
                        >
                          {c.name}
                          {c.phone && <span className="ml-2" style={{ color: S.muted }}>{c.phone}</span>}
                        </button>
                      ))}
                    {allCustomers.filter(c => c.name.toLowerCase().includes(customerName.toLowerCase())).length === 0 && (
                      <div className="px-3 py-2.5 text-xs italic" style={{ color: S.muted }}>New customer will be recorded</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Khata balance + quick collect */}
            {(() => {
              const selected = allCustomers.find(c => c.name === customerName);
              if (!selected || selected.balance <= 0) return null;
              return (
                <div className="px-3.5 py-2 flex-shrink-0" style={{ borderBottom: `1px solid ${S.border}`, background: "rgba(244,63,94,0.05)" }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold" style={{ color: S.rose }}>Outstanding Khata</span>
                    <span className="text-sm font-black" style={{ color: S.rose }}>₹{selected.balance.toFixed(2)}</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      max={selected.balance}
                      step="0.01"
                      value={khataPayAmount}
                      onChange={e => setKhataPayAmount(e.target.value)}
                      placeholder="Amount to collect"
                      className="flex-1 rounded-lg px-2 py-1 text-xs font-bold outline-none transition-all"
                      style={{ background: "rgba(0,0,0,0.05)", border: `1px solid ${S.border}`, color: S.txt }}
                      onFocus={e => (e.currentTarget as HTMLInputElement).style.border = `1px solid ${S.rose}`}
                      onBlur={e => (e.currentTarget as HTMLInputElement).style.border = `1px solid ${S.border}`}
                    />
                    <button
                      onClick={async () => {
                        const amt = parseFloat(khataPayAmount);
                        if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
                        const res = await collectKhataPayment(selected.id, amt);
                        if (res.error) { toast.error(res.error); }
                        else {
                          toast.success(`₹${amt.toFixed(2)} collected. Remaining: ₹${res.newBalance?.toFixed(2)}`);
                          setKhataPayAmount("");
                          const custs = await getAllCustomersForBilling();
                          setAllCustomers(custs);
                        }
                      }}
                      className="px-3 py-1 rounded-lg text-xs font-black"
                      style={{ background: S.roseLo, color: S.rose, border: `1px solid rgba(244,63,94,0.3)` }}
                    >
                      Collect
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 scrollbar-thin">
              {cart.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-center justify-center gap-3"
                >
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: "rgba(0,0,0,0.03)", border: `1px solid ${S.border}` }}
                  >
                    <ShoppingCart className="h-7 w-7" style={{ color: S.dim }} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold" style={{ color: S.muted }}>Cart is empty</p>
                    <p className="text-xs mt-1 px-6 leading-relaxed" style={{ color: S.dim }}>
                      Scan items or click products to add them to the bill.
                    </p>
                  </div>
                </motion.div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {cart.map((item) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9, x: -16 }}
                      transition={{ type: "spring", stiffness: 400, damping: 28 }}
                      key={item.productId}
                      className="rounded-xl p-2.5 group"
                      style={{
                        background: S.card,
                        border: `1px solid ${S.border}`,
                      }}
                    >
                      {/* Name + remove */}
                      <div className="flex items-start justify-between gap-1.5 mb-2">
                        <p className="text-sm font-bold leading-tight" style={{ color: S.txt }}>
                          {item.name}
                        </p>
                        <button
                          onClick={() => removeFromCart(item.productId)}
                          className="flex-shrink-0 p-0.5 rounded transition-colors"
                          style={{ color: S.dim }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLButtonElement).style.color = S.rose;
                            (e.currentTarget as HTMLButtonElement).style.background = S.roseLo;
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLButtonElement).style.color = S.dim;
                            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                          }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Price + qty + total */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold" style={{ color: S.muted }}>
                          ₹{item.price.toFixed(2)}
                        </span>

                        {/* Qty stepper */}
                        <div
                          className="flex items-center rounded-lg overflow-hidden"
                          style={{ border: `1px solid ${S.border}`, background: "rgba(0,0,0,0.03)" }}
                        >
                          <button
                            onClick={() => updateQty(item.productId, -1)}
                            className="px-2.5 py-1.5 text-sm font-black transition-colors"
                            style={{ color: S.muted }}
                            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = S.txt}
                            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = S.muted}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span
                            className="px-2.5 py-1.5 text-sm font-black tabular-nums min-w-[2.25rem] text-center"
                            style={{ color: S.txt, borderLeft: `1px solid ${S.border}`, borderRight: `1px solid ${S.border}` }}
                          >
                            {item.qty}
                          </span>
                          <button
                            onClick={() => updateQty(item.productId, 1)}
                            className="px-2.5 py-1.5 text-sm font-black transition-colors"
                            style={{ color: S.muted }}
                            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = S.txt}
                            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = S.muted}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <span className="text-base font-black" style={{ color: S.txt }}>
                          ₹{(item.price * item.qty).toFixed(2)}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* ── TOTALS + ACTIONS ── */}
            <div className="flex-shrink-0" style={{ borderTop: `1px solid ${S.border}` }}>

              {/* Breakdown */}
              <div className="px-4 py-3 space-y-2" style={{ background: "rgba(0,0,0,0.02)" }}>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold" style={{ color: S.muted }}>Subtotal</span>
                  <span className="font-bold" style={{ color: S.txt }}>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold" style={{ color: S.muted }}>Tax</span>
                  <span className="font-bold" style={{ color: S.txt }}>+₹{gstAmount.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm pt-2" style={{ borderTop: `1px solid ${S.border}` }}>
                  <span className="font-semibold" style={{ color: S.muted }}>Discount (₹)</span>
                  <input
                    type="number"
                    min="0"
                    value={discountAmount || ""}
                    onChange={(e) => setDiscountAmount(Number(e.target.value))}
                    placeholder="0.00"
                    className="w-24 text-right rounded-lg px-2 py-1.5 text-sm font-bold outline-none transition-all"
                    style={{
                      background: "rgba(0,0,0,0.05)",
                      border: `1px solid ${S.border}`,
                      color: S.txt,
                    }}
                    onFocus={e => (e.currentTarget as HTMLInputElement).style.border = `1px solid ${S.violet}`}
                    onBlur={e => (e.currentTarget as HTMLInputElement).style.border = `1px solid ${S.border}`}
                  />
                </div>
              </div>

              {/* Grand total */}
              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{ background: S.card, borderTop: `1px solid ${S.border}`, borderBottom: `1px solid ${S.border}` }}
              >
                <span className="text-sm font-black uppercase tracking-widest" style={{ color: S.muted }}>Total</span>
                <span
                  className="text-3xl font-black tabular-nums tracking-tight"
                  style={{ color: S.violet, textShadow: `0 0 24px rgba(139,92,246,0.4)` }}
                >
                  ₹{grandTotal.toFixed(2)}
                </span>
              </div>

              {/* CTA buttons */}
              <div className="p-3 flex gap-2" style={{ background: S.surface }}>
                <button
                  onClick={handleParkOrder}
                  disabled={cart.length === 0 || isCheckingOut}
                  className="flex-[1] py-4 rounded-xl font-black text-sm tracking-wide transition-all active:scale-95 disabled:opacity-30"
                  style={{ background: S.amberLo, color: S.amber, border: `1px solid rgba(245,158,11,0.3)` }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(245,158,11,0.2)"}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = S.amberLo}
                >
                  KOT
                </button>
                <button
                  onClick={() => setCheckoutModalOpen(true)}
                  disabled={cart.length === 0 || isCheckingOut}
                  className="flex-[2] py-4 rounded-xl font-black text-base tracking-wide transition-all active:scale-95 disabled:opacity-30 flex items-center justify-center gap-2"
                  style={{
                    background: `linear-gradient(135deg, ${S.emerald}, #059669)`,
                    color: "#fff",
                    boxShadow: cart.length > 0 ? `0 4px 20px rgba(16,185,129,0.3)` : "none",
                  }}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Check Out
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ══ NEW TABLE MODAL ══ */}
        {showNewTableModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="w-full max-w-sm rounded-2xl overflow-hidden"
              style={{ background: S.card, border: `1px solid ${S.borderHi}` }}
            >
              <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${S.border}` }}>
                <h2 className="font-black text-base" style={{ color: S.txt }}>Add New Table</h2>
                <button
                  onClick={() => setShowNewTableModal(false)}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: S.muted }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.07)"}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "transparent"}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-5">
                <label className="text-[10px] font-black uppercase tracking-widest mb-2 block" style={{ color: S.muted }}>Table Name or Number</label>
                <input
                  autoFocus
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter" && newTableName) {
                      startFetching(async () => {
                        const res = await createTable(newTableName);
                        if (res.error) toast.error(res.error);
                        else { toast.success("Table created!"); setNewTableName(""); setShowNewTableModal(false); await loadTablesAndOrders(); }
                      });
                    }
                  }}
                  className="w-full rounded-xl px-4 py-3 text-sm font-semibold outline-none transition-all mb-5"
                  style={{ background: "rgba(0,0,0,0.04)", border: `1px solid ${S.borderHi}`, color: S.txt }}
                  onFocus={e => (e.currentTarget as HTMLInputElement).style.border = `1px solid ${S.violet}`}
                  onBlur={e => (e.currentTarget as HTMLInputElement).style.border = `1px solid ${S.borderHi}`}
                  placeholder="e.g. Table 1, T-5, Balcony A"
                />
                <div className="flex gap-2.5">
                  <button
                    onClick={() => setShowNewTableModal(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors"
                    style={{ background: "rgba(0,0,0,0.04)", border: `1px solid ${S.border}`, color: S.muted }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!newTableName) return;
                      startFetching(async () => {
                        const res = await createTable(newTableName);
                        if (res.error) toast.error(res.error);
                        else { toast.success("Table created!"); setNewTableName(""); setShowNewTableModal(false); await loadTablesAndOrders(); }
                      });
                    }}
                    disabled={isFetching || !newTableName}
                    className="flex-[2] py-2.5 rounded-xl text-sm font-black transition-all active:scale-95 disabled:opacity-40"
                    style={{ background: `linear-gradient(135deg, ${S.violet}, #7c3aed)`, color: "#fff" }}
                  >
                    {isFetching ? "Saving…" : "Save Table"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* ══ CHECKOUT MODAL ══ */}
        {checkoutModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)" }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col"
              style={{ background: S.card, border: `1px solid ${S.borderHi}`, maxHeight: "90vh" }}
            >
              {/* Header */}
              <div className="px-6 py-4 flex items-center justify-between" style={{ background: S.surface, borderBottom: `1px solid ${S.border}` }}>
                <div>
                  <h2 className="font-black text-lg" style={{ color: S.txt }}>Settle Payment</h2>
                  <p className="text-xs mt-0.5" style={{ color: S.muted }}>{cart.length} item{cart.length !== 1 ? "s" : ""} in order</p>
                </div>
                <button
                  onClick={() => setCheckoutModalOpen(false)}
                  className="p-2 rounded-xl transition-colors"
                  style={{ color: S.muted }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.07)"}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "transparent"}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex flex-1 overflow-hidden">
                {/* Left: summary */}
                <div className="w-1/2 p-6 flex flex-col gap-5" style={{ borderRight: `1px solid ${S.border}` }}>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: S.muted }}>Amount Due</div>
                    <div
                      className="text-5xl font-black tabular-nums tracking-tight"
                      style={{ color: S.violet, textShadow: `0 0 32px rgba(139,92,246,0.5)` }}
                    >
                      ₹{grandTotal.toFixed(2)}
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    {[
                      { label: "Subtotal", val: `₹${subtotal.toFixed(2)}` },
                      { label: "Tax", val: `+₹${gstAmount.toFixed(2)}` },
                      { label: "Discount", val: `-₹${discountAmount.toFixed(2)}` },
                    ].map(row => (
                      <div key={row.label} className="flex justify-between">
                        <span style={{ color: S.muted }}>{row.label}</span>
                        <span className="font-bold" style={{ color: S.txt }}>{row.val}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 pt-2" style={{ borderTop: `1px solid ${S.border}` }}>
                    {customerName && (
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: "rgba(0,0,0,0.04)" }}>
                        <User className="h-3.5 w-3.5 flex-shrink-0" style={{ color: S.muted }} />
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate" style={{ color: S.txt }}>{customerName}</p>
                          {customerPhone && <p className="text-[11px]" style={{ color: S.muted }}>{customerPhone}</p>}
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest mb-1.5 block" style={{ color: S.dim }}>Order Notes (optional)</label>
                      <textarea
                        rows={2}
                        placeholder="Special instructions, allergies…"
                        className="w-full rounded-lg px-3 py-2 text-xs font-medium resize-none outline-none transition-all"
                        style={{ background: "rgba(0,0,0,0.04)", border: `1px solid ${S.border}`, color: S.txt }}
                        onFocus={e => (e.currentTarget as HTMLTextAreaElement).style.border = `1px solid ${S.violet}`}
                        onBlur={e => (e.currentTarget as HTMLTextAreaElement).style.border = `1px solid ${S.border}`}
                      />
                    </div>
                    <div className="rounded-lg px-3 py-2 text-xs font-semibold" style={{ background: "rgba(175,23,99,0.1)", border: `1px solid rgba(175,23,99,0.25)`, color: "#f9a8d4" }}>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={printKOT} onChange={(e) => setPrintKOT(e.target.checked)} className="rounded" style={{ accentColor: S.violet }} />
                        <span className="font-black">Include KOT (Kitchen Copy)</span>
                      </label>
                      <p className="mt-1 opacity-80 pl-5">If unchecked, it will only print the customer bill.</p>
                    </div>
                  </div>
                </div>

                {/* Right: payment + order modes */}
                <div className="w-1/2 p-6 flex flex-col gap-5 overflow-y-auto scrollbar-thin">
                  {/* Payment modes */}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: S.dim }}>Payment Method</p>
                    <div className="grid grid-cols-2 gap-2">
                      {paymentModes.map(mode => {
                        const isSelected = selectedPaymentMode === mode.method;
                        return (
                          <button
                            key={mode.method}
                            onClick={() => setSelectedPaymentMode(mode.method)}
                            className="p-3 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all font-bold text-xs"
                            style={{
                              background: isSelected ? mode.lo : "rgba(0,0,0,0.03)",
                              border: `1px solid ${isSelected ? mode.accent : S.border}`,
                              color: isSelected ? mode.accent : S.muted,
                              boxShadow: isSelected ? `0 0 12px ${mode.lo}` : "none",
                            }}
                          >
                            <mode.icon className="h-5 w-5" />
                            {mode.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Order modes */}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: S.dim }}>Order Mode</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { label: "DINE IN",   value: "DINE_IN",  Icon: Utensils },
                        { label: "SWIGGY",    value: "SWIGGY",   Icon: Bike     },
                        { label: "ZOMATO",    value: "ZOMATO",   Icon: Bike     },
                        { label: "TAKEAWAY",  value: "TAKEAWAY", Icon: ShoppingBag },
                      ].map(({ label, value, Icon }) => {
                        const isSelected = selectedOrderMode === value;
                        return (
                          <button
                            key={value}
                            onClick={() => setSelectedOrderMode(value)}
                            className="p-2 rounded-xl flex flex-col items-center gap-1 transition-all text-[9px] font-black"
                            style={{
                              background: isSelected ? S.emeraldLo : "rgba(0,0,0,0.03)",
                              border: `1px solid ${isSelected ? S.emerald : S.border}`,
                              color: isSelected ? S.emerald : S.muted,
                            }}
                          >
                            <Icon className="h-4 w-4" />
                            <span className="text-center leading-tight">{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer actions */}
              <div className="p-4 flex gap-3" style={{ background: S.surface, borderTop: `1px solid ${S.border}` }}>
                <button
                  onClick={() => handleCheckout(selectedPaymentMode, false)}
                  disabled={isCheckingOut}
                  className="flex-1 py-4 rounded-xl font-black flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40"
                  style={{
                    background: "rgba(0,0,0,0.04)",
                    border: `1px solid ${S.border}`,
                    color: S.muted,
                  }}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {isCheckingOut ? "Processing…" : "Settle Only"}
                </button>
                <button
                  onClick={() => handleCheckout(selectedPaymentMode, true)}
                  disabled={isCheckingOut}
                  className="flex-[2] py-4 rounded-xl font-black text-base flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40"
                  style={{
                    background: isCheckingOut
                      ? "rgba(0,210,91,0.4)"
                      : `linear-gradient(135deg, ${S.emerald}, #00a846)`,
                    color: "#fff",
                    boxShadow: isCheckingOut ? "none" : `0 4px 24px rgba(0,210,91,0.3)`,
                  }}
                >
                  <Printer className="h-5 w-5" />
                  {isCheckingOut ? "Processing…" : (printKOT ? "Print Bill + KOT" : "Print Bill Only")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </>
  );
}

