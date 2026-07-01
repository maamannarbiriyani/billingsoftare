"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import {
  Search, Plus, Minus, Trash2, ShoppingCart, User,
  CreditCard, Banknote, Smartphone, Tag, Package,
  X, Calculator, Printer, Monitor, SplitSquareHorizontal,
  Clock, ArrowLeftRight, Archive, ScanLine, Pizza, CupSoda,
  Receipt, ChevronRight, Zap, Grid3X3, LayoutGrid, CheckCircle2,
  AlertCircle, RefreshCw, Home, Utensils, Bike, ShoppingBag, Pencil
} from "lucide-react";
import {
  getAllProductsForBilling,
  getAllCustomersForBilling,
  createInvoice,
  collectKhataPayment,
  CartItem,
} from "@/app/actions/billing";
import { getTables, getRunningOrders, parkOrder, closeOrder, createTable, updateTable, deleteTable } from "@/app/actions/tables";
import {
  getPendingOnlineOrders,
  acceptOnlineOrder,
  rejectOnlineOrder,
} from "@/app/actions/aggregator";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { updateProductOrder } from "@/app/actions/product";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { printBill as printBillReceipt, printKot, getQzConfig, qzGetPrinterStatus } from "@/lib/qz-print";

type StoreInfo = {
  storeName: string;
  phone?: string | null;
  address?: string | null;
  gstNumber?: string | null;
  gstPercent?: number | null;
};

// ─── Design tokens ────────────────────────────────────────────────
const S = {
  bg:        "var(--background)",
  surface:   "var(--card)",
  card:      "var(--card)",
  border:    "var(--border)",
  borderHi:  "var(--border)",
  txt:       "var(--foreground)",
  muted:     "var(--muted-foreground)",
  dim:       "var(--foreground-subtle, #a1a1aa)",
  violet:    "var(--primary)",
  violetLo:  "var(--primary-glow)",
  emerald:   "var(--success)",
  emeraldLo: "var(--success-dim)",
  rose:      "var(--danger)",
  roseLo:    "var(--danger-dim)",
  amber:     "var(--warning)",
  amberLo:   "var(--warning-dim)",
  cyan:      "var(--cyan)",
  cyanLo:    "var(--cyan-dim)",
  // Adaptive fills — flip automatically between light/dark
  input2:    "var(--fill-input)",
  panel:     "var(--fill-panel)",
  subtle:    "var(--fill-subtle)",
  subtleHi:  "var(--fill-subtle-hi)",
};

// ─── Kitchen receipt — QZ Tray (ESC/POS) with browser-print fallback ──
function printKitchenCopy(opts: {
  invoiceNumber: string;
  items: Array<{ name: string; qty: number }>;
  tableName?: string;
  customerName?: string;
  orderMode: string;
}) {
  return printKot(opts);
}

function SortableProductItem({ product, inCart, isOutOfStock, isLowStock, addToCart, cartItemsCount, isOverlay = false }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: isOverlay ? `overlay-${product.id}` : product.id 
  });
  
  if (isDragging && !isOverlay) {
    return (
      <div 
        ref={setNodeRef} 
        style={{
          border: '2px dashed #1e40af', 
          background: 'rgba(124,58,237,.08)', 
          borderRadius: '16px', 
          opacity: 1,
          height: '100%',
          minHeight: '160px'
        }} 
      />
    );
  }

  const style = {
    transform: isOverlay ? 'scale(1.03) rotate(2deg)' : CSS.Transform.toString(transform),
    transition,
    zIndex: isOverlay ? 9999 : (isDragging ? 50 : 1),
    opacity: isOutOfStock ? 0.45 : 1,
    background: inCart ? "rgba(59,130,246,0.08)" : S.card,
    border: inCart
      ? `1px solid rgba(59,130,246,0.5)`
      : isOutOfStock
      ? `1px solid rgba(0,0,0,0.04)`
      : `1px solid ${S.border}`,
    boxShadow: isOverlay 
      ? "0 20px 50px rgba(0,0,0,.15), 0 8px 20px rgba(0,0,0,.1)" 
      : inCart ? `0 0 16px rgba(59,130,246,0.15)` : "none",
    cursor: isOverlay ? "grabbing" : "default"
  };

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={style}
      className={`relative flex flex-col text-left rounded-xl overflow-hidden transition-colors duration-200 ${isOverlay ? 'cursor-grabbing' : 'cursor-grab active:cursor-grabbing'}`}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (!isOverlay && !isOutOfStock) {
          addToCart(product);
        }
      }}
    >
      <div
        className="h-24 w-full flex items-center justify-center overflow-hidden relative pointer-events-none"
        style={{ background: S.subtle, borderBottom: `1px solid ${S.border}` }}
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

      <div className="p-2.5 flex flex-col flex-1 pointer-events-none">
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
                : { background: S.subtleHi, color: S.muted }
              }
            >
              <Plus className="h-3.5 w-3.5" />
            </div>
          )}
        </div>
      </div>

      {inCart && (
        <div
          className="absolute top-2 right-2 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-md pointer-events-none"
          style={{ background: S.violet }}
        >
          {cartItemsCount}
        </div>
      )}
    </div>
  );
}

export function BillingCart({ cashierName = "Admin", storeInfo }: { cashierName?: string; storeInfo?: StoreInfo }) {
  const [query, setQuery] = useState("");
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [discountType, setDiscountType] = useState<"AMOUNT" | "PERCENTAGE">("AMOUNT");
  const [discountValue, setDiscountValue] = useState<number>(0);
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
  const [khataPayAmount, setKhataPayAmount] = useState<string>("");
  const [printKOT, setPrintKOT] = useState(false);
  const gstRate = storeInfo?.gstPercent || 0;
  const [applyGst, setApplyGst] = useState(gstRate > 0);
  const [editingTableId, setEditingTableId] = useState<number | null>(null);
  const [editingTableName, setEditingTableName] = useState("");

  const router = useRouter();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [activeId, setActiveId] = useState<number | null>(null);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as number);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    setAllProducts((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return items;
      
      const newArray = arrayMove(items, oldIndex, newIndex);
      const updatedArray = newArray.map((p, idx) => ({ ...p, display_order: idx }));
      
      const updates = updatedArray.map((p) => ({ id: p.id, display_order: p.display_order }));
      
      fetch("/api/products/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: updates })
      }).catch((err) => {
        console.error("Failed to persist order", err);
        toast.error("Failed to save product order");
      });
      
      return updatedArray;
    });
  }

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

  // Real printer status for the status bar — was previously a hardcoded
  // "Ready" label with no connection to whether the printer actually works.
  const [printerReady, setPrinterReady] = useState<"browser" | "checking" | "ready" | "offline">("browser");
  useEffect(() => {
    let cancelled = false;
    async function check() {
      const qzCfg = getQzConfig();
      if (!qzCfg.enabled) {
        if (!cancelled) setPrinterReady("browser");
        return;
      }
      if (!cancelled) setPrinterReady("checking");
      const status = await qzGetPrinterStatus(qzCfg.printer);
      if (cancelled) return;
      setPrinterReady(status.online === false ? "offline" : "ready");
    }
    check();
    const timer = setInterval(check, 30000);
    return () => { cancelled = true; clearInterval(timer); };
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
    setDiscountValue(0);
    setDiscountType("AMOUNT");
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
    const tableName = table?.name || "Table " + activeTableId;
    const kotItems = cart.map(item => ({ name: item.name, qty: item.qty }));
    startCheckout(async () => {
      const res = await parkOrder(activeTableId, cart, activeOrderId);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(activeOrderId ? "KOT Updated" : "KOT Sent to Kitchen");
        printKot({
          invoiceNumber: activeOrderId ? `Order #${activeOrderId}` : tableName,
          tableName,
          items: kotItems,
          orderMode: "DINE_IN",
        });
        clearCart();
        await loadTablesAndOrders();
        setViewMode("TABLES");
      }
    });
  };

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  const gstAmount = (applyGst && gstRate > 0) ? parseFloat((cart.reduce((acc, item) => acc + item.price * item.qty, 0) * gstRate / 100).toFixed(2)) : 0;
  const discountAmount = discountType === "PERCENTAGE" ? parseFloat(((subtotal * discountValue) / 100).toFixed(2)) : discountValue;
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
        const invoiceNumber = result.invoiceNumber || `#${result.invoiceId}`;
        const tableName = tables.find(t => t.id === activeTableId)?.name;
        // Snapshot totals BEFORE clearing the cart
        const billSubtotal = cartSnapshot.reduce((a, i) => a + i.price * i.qty, 0);
        const billTotal = grandTotal;

        clearCart();
        setCheckoutModalOpen(false);
        await loadTablesAndOrders();

        if (printBill) {
          // Print one after another (not in parallel) — firing both at once
          // would race two QZ Tray connection handshakes simultaneously,
          // which QZ rejects as "Request blocked".
          // 1. Kitchen copy first (so it tears off at the kitchen printer)
          if (printKOT) {
            await printKitchenCopy({
              invoiceNumber,
              items: cartSnapshot.map(i => ({ name: i.name, qty: i.qty })),
              tableName,
              customerName: customerName || undefined,
              orderMode: selectedOrderMode,
            });
          }
          // 2. Customer bill — prints directly via hidden iframe (no page nav, no PDF prompt)
          await printBillReceipt({
            storeName: storeInfo?.storeName || "My Store",
            phone: storeInfo?.phone,
            address: storeInfo?.address,
            gstNumber: storeInfo?.gstNumber,
            logoUrl: "/billlogo.png",
            invoiceNumber,
            customerName: customerName || undefined,
            paymentMethod,
            items: cartSnapshot.map(i => ({ name: i.name, price: i.price, qty: i.qty })),
            subtotal: billSubtotal,
            gstAmount,
            discountAmount,
            total: billTotal,
          });
          toast.success(`Bill ${invoiceNumber} printed`);
        } else {
          toast.success("Invoice created!");
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
              <div
                className="flex items-center gap-1.5 text-xs font-bold"
                style={{
                  color:
                    printerReady === "offline" ? S.rose : printerReady === "checking" ? S.muted : S.emerald,
                }}
                title={
                  printerReady === "browser"
                    ? "QZ Tray printing is off — using browser print dialog"
                    : printerReady === "offline"
                    ? "Thermal printer offline or unreachable"
                    : "Thermal printer ready (QZ Tray)"
                }
              >
                <Printer className="h-3.5 w-3.5" />
                {printerReady === "offline" ? "Offline" : printerReady === "checking" ? "Checking…" : "Ready"}
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: S.emerald }}>
                <ScanLine className="h-3.5 w-3.5" /> Ready
              </div>
            </div>
            {activeTableId && (
              <div
                className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full"
                style={{ background: S.violetLo, color: S.violet, border: `1px solid rgba(59,130,246,0.3)` }}
              >
                <Home className="h-3 w-3" />
                {tables.find(t => t.id === activeTableId)?.name || "Table"}
              </div>
            )}
          </div>

          {/* Right: cashier + time */}
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: S.muted }}>
              <User className="h-3.5 w-3.5" /> Cashier: {cashierName}
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
              background: "var(--header-bg)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderRight: `1px solid ${S.border}`,
            }}
          >
            {/* View toggle */}
            <div className="p-3 flex-shrink-0" style={{ borderBottom: `1px solid ${S.border}` }}>
              <div
                className="flex rounded-lg overflow-hidden p-0.5 gap-0.5"
                style={{ background: S.subtle, border: `1px solid ${S.border}` }}
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
                        ? { background: S.violetLo, color: "#bfdbfe", border: `1px solid rgba(59,130,246,0.3)` }
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
                          ? { background: "rgba(59,130,246,0.3)", color: "#bfdbfe" }
                          : { background: S.subtleHi, color: S.dim }
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
                      background: S.subtle,
                      border: `1px solid ${S.border}`,
                      color: S.muted,
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = S.subtleHi;
                      (e.currentTarget as HTMLButtonElement).style.color = S.txt;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = S.subtle;
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
                    background: S.subtle,
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
                            printKot({
                              invoiceNumber: `${order.source} #${order.externalId || order.id}`,
                              tableName: order.source,
                              orderMode: order.source,
                              items: order.items.map((i: any) => ({ name: i.product.name, qty: i.qty })),
                            });
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
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={filteredProducts.map(p => p.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5">
                      {filteredProducts.map((product) => {
                        const inCart = cart.find((i) => i.productId === product.id);
                        const isUnlimited = product.stock === 999999;
                        const isOutOfStock = !isUnlimited && product.stock <= 0;
                        const isLowStock = !isUnlimited && !isOutOfStock && product.stock <= 5;
                        return (
                          <SortableProductItem
                            key={product.id}
                            product={product}
                            inCart={inCart}
                            isOutOfStock={isOutOfStock}
                            isLowStock={isLowStock}
                            addToCart={addToCart}
                            cartItemsCount={inCart?.qty}
                          />
                        );
                      })}
                    </div>
                  </SortableContext>
                  <DragOverlay>
                    {activeId ? (() => {
                      const product = allProducts.find(p => p.id === activeId);
                      if (!product) return null;
                      const inCart = cart.find((i) => i.productId === product.id);
                      const isUnlimited = product.stock === 999999;
                      const isOutOfStock = !isUnlimited && product.stock <= 0;
                      const isLowStock = !isUnlimited && !isOutOfStock && product.stock <= 5;
                      return (
                        <SortableProductItem
                          product={product}
                          inCart={inCart}
                          isOutOfStock={isOutOfStock}
                          isLowStock={isLowStock}
                          addToCart={addToCart}
                          cartItemsCount={inCart?.qty}
                          isOverlay={true}
                        />
                      );
                    })() : null}
                  </DragOverlay>
                </DndContext>
              )}

              {/* ── TABLES GRID ── */}
              {viewMode === "TABLES" && (
                <div className="grid grid-cols-3 xl:grid-cols-4 gap-3">
                  {tables.map(table => {
                    const isOccupied = table.status === "OCCUPIED";
                    const isActive = activeTableId === table.id;
                    const isEditing = editingTableId === table.id;
                    const order = runningOrders.find(o => o.tableId === table.id);

                    if (isEditing) {
                      return (
                        <div key={table.id} className="relative p-4 rounded-xl text-left border-2 border-blue-600 shadow-lg z-10 flex flex-col gap-2" style={{ background: S.card }}>
                          <input 
                            autoFocus
                            value={editingTableName}
                            onChange={(e) => setEditingTableName(e.target.value)}
                            onKeyDown={async (e) => {
                              if (e.key === "Enter" && editingTableName.trim()) {
                                startFetching(async () => {
                                  const res = await updateTable(table.id, editingTableName.trim());
                                  if (res.error) toast.error(res.error);
                                  else { toast.success("Table updated!"); setEditingTableId(null); await loadTablesAndOrders(); }
                                });
                              } else if (e.key === "Escape") {
                                setEditingTableId(null);
                              }
                            }}
                            className="w-full text-sm font-bold rounded px-2 py-1 outline-none focus:border-blue-600"
                            style={{ background: S.input2, border: `1px solid ${S.border}`, color: S.txt }}
                          />
                          <div className="flex gap-2">
                            <button onClick={() => setEditingTableId(null)} className="flex-1 py-1 rounded text-xs font-bold" style={{ background: S.subtle, color: S.muted }}>Cancel</button>
                            <button 
                              onClick={() => {
                                if (!editingTableName.trim()) return;
                                startFetching(async () => {
                                  const res = await updateTable(table.id, editingTableName.trim());
                                  if (res.error) toast.error(res.error);
                                  else { toast.success("Table updated!"); setEditingTableId(null); await loadTablesAndOrders(); }
                                });
                              }}
                              className="flex-1 py-1 rounded bg-blue-600 text-white text-xs font-bold"
                            >Save</button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={table.id}
                        onClick={() => {
                          if (isOccupied && order) loadOrderIntoCart(order);
                          else { setActiveTableId(table.id); setActiveOrderId(null); if (cart.length === 0) setViewMode("PRODUCTS"); }
                        }}
                        className="relative p-4 rounded-xl text-left transition-all duration-200 hover:-translate-y-1 active:scale-95 group overflow-hidden"
                        style={{
                          background: isActive
                            ? "rgba(59,130,246,0.1)"
                            : isOccupied
                            ? "rgba(244,63,94,0.06)"
                            : S.card,
                          border: isActive
                            ? "1px solid rgba(59,130,246,0.5)"
                            : isOccupied
                            ? `1px solid rgba(244,63,94,0.3)`
                            : `1px solid ${S.border}`,
                          boxShadow: isActive ? "0 0 20px rgba(59,130,246,0.12)" : "none",
                        }}
                      >
                        {/* Hover Actions */}
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 rounded backdrop-blur-sm p-0.5" style={{ background: S.subtleHi }}>
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTableId(table.id);
                              setEditingTableName(table.name);
                            }}
                            className="p-1.5 rounded transition-colors hover:opacity-80"
                            style={{ color: S.muted }}
                          >
                            <Pencil className="h-3 w-3" />
                          </div>
                          {!isOccupied && (
                            <div 
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (confirm(`Are you sure you want to delete ${table.name}?`)) {
                                  startFetching(async () => {
                                    const res = await deleteTable(table.id);
                                    if (res.error) toast.error(res.error);
                                    else { toast.success("Table deleted"); await loadTablesAndOrders(); }
                                  });
                                }
                              }}
                              className="p-1.5 rounded hover:bg-red-100 text-red-500 transition-colors"
                            >
                              <Trash2 className="h-3 w-3" />
                            </div>
                          )}
                        </div>

                        <div className="flex items-start justify-between mb-3">
                          <span className="font-black text-sm pr-6" style={{ color: S.txt }}>{table.name}</span>
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
                    background: S.subtle,
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
                          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = S.subtleHi}
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
                      style={{ background: S.subtleHi, border: `1px solid ${S.border}`, color: S.txt }}
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
                    style={{ background: S.subtle, border: `1px solid ${S.border}` }}
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
                          style={{ border: `1px solid ${S.border}`, background: S.subtle }}
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
              <div className="px-4 py-3 space-y-2" style={{ background: S.subtle }}>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold" style={{ color: S.muted }}>Subtotal</span>
                  <span className="font-bold" style={{ color: S.txt }}>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold" style={{ color: S.muted }}>Tax</span>
                  <span className="font-bold" style={{ color: S.txt }}>+₹{gstAmount.toFixed(2)}</span>
                </div>
                <div className="flex flex-col gap-2 pt-2" style={{ borderTop: `1px solid ${S.border}` }}>
                  <div className="flex items-center justify-between text-sm">
                    <div className="font-semibold flex items-center gap-2" style={{ color: S.muted }}>
                      Discount
                      <div className="flex rounded p-0.5" style={{ background: S.subtleHi }}>
                        <button
                          onClick={() => { setDiscountType("AMOUNT"); setDiscountValue(0); }}
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold transition-all"
                          style={{
                            background: discountType === "AMOUNT" ? S.card : "transparent",
                            color: discountType === "AMOUNT" ? S.txt : S.dim,
                            boxShadow: discountType === "AMOUNT" ? "0 1px 2px rgba(0,0,0,0.1)" : "none"
                          }}
                        >
                          ₹
                        </button>
                        <button
                          onClick={() => { setDiscountType("PERCENTAGE"); setDiscountValue(0); }}
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold transition-all"
                          style={{
                            background: discountType === "PERCENTAGE" ? S.card : "transparent",
                            color: discountType === "PERCENTAGE" ? S.txt : S.dim,
                            boxShadow: discountType === "PERCENTAGE" ? "0 1px 2px rgba(0,0,0,0.1)" : "none"
                          }}
                        >
                          %
                        </button>
                      </div>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={discountValue || ""}
                      onChange={(e) => setDiscountValue(Number(e.target.value))}
                      placeholder="0"
                      className="w-24 text-right rounded-lg px-2 py-1.5 text-sm font-bold outline-none transition-all"
                      style={{
                        background: S.subtleHi,
                        border: `1px solid ${S.border}`,
                        color: S.txt,
                      }}
                      onFocus={e => (e.currentTarget as HTMLInputElement).style.border = `1px solid ${S.violet}`}
                      onBlur={e => (e.currentTarget as HTMLInputElement).style.border = `1px solid ${S.border}`}
                    />
                  </div>
                  {discountType === "PERCENTAGE" && discountValue > 0 && (
                    <div className="text-right text-xs font-bold" style={{ color: S.violet }}>
                      -₹{discountAmount.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>

              {/* Grand total */}
              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{ background: S.card, borderTop: `1px solid ${S.border}`, borderBottom: `1px solid ${S.border}` }}
              >
                <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: S.muted }}>Total</span>
                <span
                  className="text-3xl font-black tabular-nums tracking-tight"
                  style={{ color: S.violet, textShadow: `0 0 24px rgba(59,130,246,0.4)` }}
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
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = S.subtleHi}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "transparent"}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-5">
                <label className="text-[10px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: S.muted }}>Table Name or Number</label>
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
                  style={{ background: S.subtle, border: `1px solid ${S.borderHi}`, color: S.txt }}
                  onFocus={e => (e.currentTarget as HTMLInputElement).style.border = `1px solid ${S.violet}`}
                  onBlur={e => (e.currentTarget as HTMLInputElement).style.border = `1px solid ${S.borderHi}`}
                  placeholder="e.g. Table 1, T-5, Balcony A"
                />
                <div className="flex gap-2.5">
                  <button
                    onClick={() => setShowNewTableModal(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors"
                    style={{ background: S.subtle, border: `1px solid ${S.border}`, color: S.muted }}
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
                    style={{ background: `linear-gradient(135deg, ${S.violet}, #1e40af)`, color: "#fff" }}
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
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6" style={{ background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(16px)" }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-4xl rounded-2xl overflow-hidden flex flex-col relative"
              style={{ background: S.surface, border: `1px solid ${S.border}`, maxHeight: "92vh", boxShadow: "0 24px 60px -15px rgba(0,0,0,0.4)" }}
            >
              {/* Header */}
              <div className="px-7 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${S.border}` }}>
                <div>
                  <h2 className="font-bold text-xl tracking-tight" style={{ color: S.txt }}>Checkout</h2>
                  <p className="text-xs mt-0.5 font-medium" style={{ color: S.muted }}>{cart.length} item{cart.length !== 1 ? "s" : ""} in this order</p>
                </div>
                <button
                  onClick={() => setCheckoutModalOpen(false)}
                  className="p-2.5 rounded-full transition-all hover:rotate-90 duration-300"
                  style={{ color: S.muted, background: S.subtle }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = S.roseLo;
                    (e.currentTarget as HTMLButtonElement).style.color = S.rose;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = S.subtle;
                    (e.currentTarget as HTMLButtonElement).style.color = S.muted;
                  }}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
                {/* Left: Summary */}
                <div className="w-full md:w-5/12 p-7 flex flex-col gap-5" style={{ background: S.panel, borderRight: `1px solid ${S.border}` }}>

                  {/* Total Amount Card */}
                  <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: S.violet, color: "#fff", boxShadow: `0 8px 24px -10px ${S.violet}` }}>
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5 opacity-75">Amount Payable</p>
                    <div className="text-[40px] leading-none font-bold tabular-nums tracking-tight">
                      ₹{grandTotal.toFixed(2)}
                    </div>
                  </div>

                  <div className="space-y-2.5 text-sm font-medium px-1">
                    {[
                      { label: "Subtotal", val: `₹${subtotal.toFixed(2)}` },
                      { label: "Tax (GST)", val: `+₹${gstAmount.toFixed(2)}`, condition: applyGst },
                      { label: "Discount", val: `-₹${discountAmount.toFixed(2)}`, condition: discountAmount > 0 },
                    ].map(row => row.condition !== false && (
                      <div key={row.label} className="flex justify-between items-center">
                        <span style={{ color: S.muted }}>{row.label}</span>
                        <span className="font-bold text-base" style={{ color: S.txt }}>{row.val}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-5 pt-4 flex-1" style={{ borderTop: `1px dashed ${S.dim}` }}>
                    {customerName && (
                      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: S.subtle, border: `1px solid ${S.border}` }}>
                        <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ background: S.violetLo, color: S.violet }}>
                           <User className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold truncate" style={{ color: S.txt }}>{customerName}</p>
                          {customerPhone && <p className="text-xs font-medium mt-0.5" style={{ color: S.muted }}>{customerPhone}</p>}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: S.dim }}>Order Notes</label>
                      <textarea
                        rows={2}
                        placeholder="Add special instructions here..."
                        className="w-full rounded-2xl px-4 py-3 text-sm font-medium resize-none outline-none transition-all shadow-sm"
                        style={{ background: S.input2, border: `1px solid ${S.border}`, color: S.txt }}
                        onFocus={e => {
                          (e.currentTarget as HTMLTextAreaElement).style.border = `1px solid ${S.violet}`;
                          (e.currentTarget as HTMLTextAreaElement).style.boxShadow = `0 0 0 4px ${S.violetLo}`;
                        }}
                        onBlur={e => {
                          (e.currentTarget as HTMLTextAreaElement).style.border = `1px solid ${S.border}`;
                          (e.currentTarget as HTMLTextAreaElement).style.boxShadow = "none";
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Right: Payment + Preferences */}
                <div className="w-full md:w-7/12 p-8 flex flex-col gap-8 overflow-y-auto scrollbar-thin">
                  
                  {/* Preferences Toggles */}
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: S.txt }}>
                      <Zap className="h-4 w-4" style={{ color: S.amber }} /> Bill Preferences
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {/* KOT Toggle */}
                      <button
                        onClick={() => setPrintKOT(!printKOT)}
                        className="relative overflow-hidden flex flex-col items-start p-4 rounded-2xl transition-all duration-300 text-left border-2 group"
                        style={{
                          background: printKOT ? S.emeraldLo : S.subtle,
                          borderColor: printKOT ? S.emerald : "transparent",
                        }}
                      >
                        <div className="flex items-center justify-between w-full mb-2">
                          <div className="flex items-center gap-2">
                            <Printer className="h-5 w-5" style={{ color: printKOT ? S.emerald : S.muted }} />
                            <span className="font-bold text-sm" style={{ color: printKOT ? S.emerald : S.txt }}>Kitchen Copy</span>
                          </div>
                          <div className="w-8 h-5 rounded-full relative transition-colors duration-300" style={{ background: printKOT ? S.emerald : S.border }}>
                            <div className="absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-300" style={{ transform: printKOT ? "translateX(12px)" : "translateX(0)" }} />
                          </div>
                        </div>
                        <p className="text-xs font-medium" style={{ color: printKOT ? S.emerald : S.muted, opacity: printKOT ? 0.9 : 0.7 }}>
                          Print KOT for kitchen staff
                        </p>
                      </button>

                      {/* GST Toggle */}
                      <button
                        onClick={() => setApplyGst(!applyGst)}
                        className="relative overflow-hidden flex flex-col items-start p-4 rounded-2xl transition-all duration-300 text-left border-2 group"
                        style={{
                          background: applyGst ? S.violetLo : S.subtle,
                          borderColor: applyGst ? S.violet : "transparent",
                        }}
                      >
                        <div className="flex items-center justify-between w-full mb-2">
                          <div className="flex items-center gap-2">
                            <Tag className="h-5 w-5" style={{ color: applyGst ? S.violet : S.muted }} />
                            <span className="font-bold text-sm" style={{ color: applyGst ? S.violet : S.txt }}>Apply GST{gstRate > 0 ? ` (${gstRate}%)` : ""}</span>
                          </div>
                          <div className="w-8 h-5 rounded-full relative transition-colors duration-300" style={{ background: applyGst ? S.violet : S.border }}>
                            <div className="absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-300" style={{ transform: applyGst ? "translateX(12px)" : "translateX(0)" }} />
                          </div>
                        </div>
                        <p className="text-xs font-medium" style={{ color: applyGst ? S.violet : S.muted, opacity: applyGst ? 0.9 : 0.7 }}>
                          {gstRate > 0 ? `Add ${gstRate}% GST (set in Settings)` : "Set a GST % in Settings first"}
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: S.txt }}>Payment Method</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {paymentModes.map(mode => {
                        const isSelected = selectedPaymentMode === mode.method;
                        return (
                          <button
                            key={mode.method}
                            onClick={() => setSelectedPaymentMode(mode.method)}
                            className="p-4 rounded-2xl flex flex-col items-center justify-center gap-2.5 transition-all font-bold text-sm group relative overflow-hidden"
                            style={{
                              background: isSelected ? mode.lo : S.input2,
                              border: `2px solid ${isSelected ? mode.accent : S.border}`,
                              color: isSelected ? mode.accent : S.muted,
                              boxShadow: isSelected ? `0 8px 24px -8px ${mode.accent}` : "0 2px 8px -4px rgba(0,0,0,0.05)",
                              transform: isSelected ? "translateY(-2px)" : "none"
                            }}
                          >
                            <mode.icon className="h-6 w-6 transition-transform group-hover:scale-110" />
                            {mode.label}
                            {isSelected && (
                              <div className="absolute top-2 right-2 h-2 w-2 rounded-full" style={{ background: mode.accent }} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Order Mode */}
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: S.txt }}>Order Mode</h3>
                    <div className="grid grid-cols-4 gap-2">
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
                            className="p-3 rounded-xl flex flex-col items-center gap-1.5 transition-all text-[10px] font-black group"
                            style={{
                              background: isSelected ? S.emeraldLo : S.input2,
                              border: `1px solid ${isSelected ? S.emerald : S.border}`,
                              color: isSelected ? S.emerald : S.muted,
                              boxShadow: isSelected ? `0 4px 12px -4px ${S.emerald}` : "none",
                            }}
                          >
                            <Icon className={`h-5 w-5 transition-transform ${isSelected ? 'scale-110' : 'group-hover:scale-110'}`} />
                            <span className="text-center tracking-wide">{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-7 py-5 flex flex-col-reverse sm:flex-row gap-3 items-center sm:justify-end" style={{ background: S.surface, borderTop: `1px solid ${S.border}` }}>
                <button
                  onClick={() => handleCheckout(selectedPaymentMode, false)}
                  disabled={isCheckingOut}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50"
                  style={{
                    color: S.txt,
                    background: S.subtle,
                    border: `1px solid ${S.border}`,
                  }}
                >
                  {isCheckingOut ? "Processing…" : "Settle Only"}
                </button>
                <button
                  onClick={() => handleCheckout(selectedPaymentMode, true)}
                  disabled={isCheckingOut}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] disabled:opacity-50 relative overflow-hidden group"
                  style={{
                    background: S.emerald,
                    color: "#fff",
                    boxShadow: `0 8px 22px -8px ${S.emerald}`,
                  }}
                >
                  <div className="absolute inset-0 bg-white/15 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  <Printer className="h-5 w-5 relative z-10" />
                  <span className="relative z-10">{isCheckingOut ? "Processing…" : "Print Bill & Settle"}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </>
  );
}


