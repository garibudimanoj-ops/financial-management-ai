'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { finalizeSaleAction } from '@/actions/invoice';
import { listProducts } from '@/actions/product';
import { getTaxRateForCategory } from '@/lib/invoices/calculations';
import { getStockWarning } from '@/lib/pos/stockWarning';
import Link from 'next/link';
import { Search, Plus, Minus, Trash2, ShoppingCart, User, CreditCard, Banknote, Smartphone, X, Check, AlertCircle, Wallet } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  SKU: string;
  barcode: string | null;
  costPrice: string | number;
  sellingPrice: string | number;
  stockQuantity: string | number;
  unit: string;
  taxCategory: string;
}

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  currentBalance: string | number;
  creditLimit: string | number | null;
}

interface POSTerminalProps {
  businessId: string;
  businessName: string;
  currency: string;
  products: Product[];
  customers: Customer[];
}

interface CartItem {
  productId: string;
  name: string;
  SKU: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  taxCategory: string;
  costPrice: number;
  lineTotal: number;
}

type PaymentMethod = 'CASH' | 'CARD' | 'UPI' | 'BANK_TRANSFER' | 'OTHER' | 'CREDIT';

// Split tender only supports real cash/bank tenders — CREDIT is a sale status, not a tender.
type TenderMethod = Exclude<PaymentMethod, 'CREDIT'>;

export default function POSTerminal({ businessId, businessName, currency, products, customers }: POSTerminalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [invoiceDiscount, setInvoiceDiscount] = useState(0);
  const [idempotencyKey, setIdempotencyKey] = useState(() => `pos-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

  // Internal product cache. The page ships a snapshot, but stock can drop
  // between page load and checkout. We refresh it from the existing inventory
  // service whenever checkout reports a stock problem, then clamp affected
  // cart lines to the refreshed quantity so the UI never shows a misleading
  // "available" count. The server remains the final authority on stock.
  const [productCache, setProductCache] = useState<Product[]>(products);
  const [stockError, setStockError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProductCache(products);
  }, [products]);

  const refreshProducts = useCallback(async (): Promise<Product[]> => {
    try {
      const fresh = await listProducts(businessId);
      setProductCache(fresh as Product[]);
      return fresh as Product[];
    } catch {
      // Fall back to the page snapshot if the refresh fails; the server still
      // guards stock at checkout.
      setProductCache(products);
      return products;
    }
  }, [businessId, products]);

  const clampCartToStock = useCallback((freshProducts: Product[]) => {
    setCart((prev) =>
      prev.map((item) => {
        const fresh = freshProducts.find((p) => p.id === item.productId);
        if (!fresh) return item;
        const maxStock = Number(fresh.stockQuantity);
        if (!Number.isFinite(maxStock) || maxStock < 0) return item;
        return item.quantity > maxStock ? { ...item, quantity: maxStock } : item;
      })
    );
  }, []);

  // Payment mode: 'single' preserves the original one-method checkout exactly.
  // 'split' lets a cashier tender one sale across multiple payment methods.
  const [paymentMode, setPaymentMode] = useState<'single' | 'split'>('single');
  const [splitPayments, setSplitPayments] = useState<{ method: TenderMethod; amount: string; reference?: string }[]>([]);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const currencySymbol = currency === 'INR' ? '₹' : '$';

  const filteredProducts = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const source = productCache;
    if (!query) return source;
    return source.filter((p) =>
      p.name.toLowerCase().includes(query) ||
      p.SKU.toLowerCase().includes(query) ||
      (p.barcode && p.barcode.toLowerCase().includes(query))
    );
  }, [productCache, searchQuery]);

  const addToCart = useCallback((product: Product) => {
    const stockNum = Number(product.stockQuantity);
    const sellPrice = Number(product.sellingPrice);
    const costPrice = Number(product.costPrice);

    if (stockNum <= 0) {
      setError(`${product.name} is out of stock`);
      setTimeout(() => setError(null), 3000);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= stockNum) {
          setError(`Only ${stockNum} ${product.unit} of ${product.name} available`);
          setTimeout(() => setError(null), 3000);
          return prev;
        }
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1, lineTotal: (item.quantity + 1) * item.unitPrice }
            : item
        );
      }
      const newItem: CartItem = {
        productId: product.id,
        name: product.name,
        SKU: product.SKU,
        unit: product.unit,
        quantity: 1,
        unitPrice: sellPrice,
        discount: 0,
        // Single shared tax-rate resolver — never drift from the server's rules.
        taxRate: Number(getTaxRateForCategory(product.taxCategory)),
        taxCategory: product.taxCategory,
        costPrice,
        lineTotal: sellPrice,
      };
      return [...prev, newItem];
    });
    setSearchQuery('');
    barcodeInputRef.current?.focus();
  }, [productCache]);

const updateCartQuantity = useCallback((productId: string, delta: number) => {
    setCart((prev) => {
      return prev.map((item) => {
        if (item?.productId !== productId) return item;
        const newQty = item.quantity + delta;
        if (newQty <= 0) return item;
        const product = productCache.find((p) => p.id === productId);
        const maxStock = product ? Number(product.stockQuantity) : Infinity;
        if (newQty > maxStock) {
          setError(`Only ${maxStock} available`);
          setTimeout(() => setError(null), 3000);
          return item;
        }
        return { ...item, quantity: newQty, lineTotal: newQty * item.unitPrice };
      });
    });
  }, [productCache]);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  }, []);

  const updateItemDiscount = useCallback((productId: string, discount: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, discount: Math.max(0, discount), lineTotal: item.quantity * (item.unitPrice - Math.max(0, discount)) }
          : item
      )
    );
  }, []);

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0), [cart]);
  const totalDiscount = useMemo(() => cart.reduce((sum, item) => sum + item.discount * item.quantity, 0) + invoiceDiscount, [cart, invoiceDiscount]);
  const taxableAmount = useMemo(() => subtotal - totalDiscount, [subtotal, totalDiscount]);
  const taxAmount = useMemo(() => {
    return cart.reduce((sum, item) => {
      const lineSubtotal = item.quantity * (item.unitPrice - item.discount);
      return sum + lineSubtotal * (item.taxRate / 100);
    }, 0);
  }, [cart]);
  const grandTotal = useMemo(() => Math.max(0, taxableAmount + taxAmount), [taxableAmount, taxAmount]);
  const change = useMemo(() => {
    if (paymentMethod !== 'CASH') return 0;
    const received = Number(cashReceived) || 0;
    return Math.max(0, received - grandTotal);
  }, [cashReceived, grandTotal, paymentMethod]);

  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  const creditLimitExceeded = useMemo(() => {
    if (!selectedCustomer || paymentMethod !== 'CREDIT') return false;
    const balanceNum = Number(selectedCustomer.currentBalance);
    const limitNum = selectedCustomer.creditLimit ? Number(selectedCustomer.creditLimit) : Infinity;
    return balanceNum + grandTotal > limitNum;
  }, [selectedCustomer, paymentMethod, grandTotal]);

  // --- Split tender helpers -------------------------------------------------
  const addSplitPayment = () => {
    setSplitPayments((prev) => [...prev, { method: 'CASH', amount: '', reference: '' }]);
  };

  const updateSplitPayment = (index: number, patch: Partial<{ method: TenderMethod; amount: string; reference?: string }>) => {
    setSplitPayments((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  };

  const removeSplitPayment = (index: number) => {
    setSplitPayments((prev) => prev.filter((_, i) => i !== index));
  };

  const totalPaid = useMemo(
    () => splitPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    [splitPayments]
  );
  const remaining = useMemo(() => Math.max(0, grandTotal - totalPaid), [grandTotal, totalPaid]);
  const overpayment = useMemo(() => Math.max(0, totalPaid - grandTotal), [grandTotal, totalPaid]);
  // Total cash actually tendered across split entries. Change is only meaningful
  // for the CASH portion; card/UPI/bank-transfer settle exactly and never give change.
  const splitCash = useMemo(
    () => splitPayments.reduce((sum, p) => sum + (p.method === 'CASH' ? (Number(p.amount) || 0) : 0), 0),
    [splitPayments]
  );
  const splitChange = useMemo(() => {
    if (splitCash <= 0) return 0;
    // Change is the cash tendered above the remaining amount still owed after
    // non-cash tenders are applied. When the split exactly matches the invoice
    // (the enforced rule), change is zero.
    return Math.max(0, splitCash - remaining);
  }, [splitCash, remaining]);
  const splitChangeRounded = useMemo(() => Math.round(splitChange * 100) / 100, [splitChange]);

  // Low-stock warning for a cart line, derived from the existing product cache.
  // The server remains authoritative for final stock validation; this is a
  // cashier-facing hint only.
  const cartStockWarning = (item: CartItem): string | null => {
    const product = productCache.find((p) => p.id === item.productId);
    if (!product) return null;
    return getStockWarning(item.quantity, Number(product.stockQuantity));
  };

  const splitValid = useMemo(() => {
    if (splitPayments.length === 0) return false;
    return splitPayments.every((p) => {
      const amt = Number(p.amount);
      return Number.isFinite(amt) && amt > 0;
    }) && totalPaid >= grandTotal;
  }, [splitPayments, totalPaid, grandTotal]);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setError('Cart is empty');
      return;
    }

    if (paymentMode === 'split') {
      if (splitPayments.length === 0) {
        setError('Add at least one payment entry for split tender');
        return;
      }
      if (splitPayments.some((p) => Number(p.amount) <= 0 || !Number.isFinite(Number(p.amount)))) {
        setError('Each split payment must have a positive amount');
        return;
      }
      if (totalPaid < grandTotal) {
        setError('Total payments are less than the sale total');
        return;
      }
      if (overpayment > 0) {
        setError('Total payments exceed the sale total');
        return;
      }
    } else {
      if (paymentMethod === 'CREDIT' && !selectedCustomerId) {
        setError('Select a customer for credit sale');
        return;
      }

      if (paymentMethod === 'CREDIT' && creditLimitExceeded) {
        setError('Credit limit exceeded for this customer');
        return;
      }

      if (paymentMethod === 'CASH' && Number(cashReceived) < grandTotal) {
        setError('Insufficient cash received');
        return;
      }
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const initialPayments =
        paymentMode === 'split'
          ? splitPayments.map((p) => ({
              amount: Number(p.amount),
              paymentMethod: p.method,
              reference: p.reference || undefined,
              notes: notes || undefined,
            }))
          : undefined;

      const result = await finalizeSaleAction(businessId, {
        customerId: selectedCustomerId || undefined,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          taxRate: item.taxRate,
          taxCategory: item.taxCategory,
        })),
        invoiceDiscount,
        dueDate: paymentMode === 'single' && paymentMethod === 'CREDIT' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : undefined,
        notes: notes || undefined,
        idempotencyKey,
        status: 'ISSUED',
        initialPayment:
          paymentMode === 'single' && paymentMethod !== 'CREDIT' && paymentMethod !== 'CASH'
            ? {
                amount: grandTotal,
                paymentMethod: paymentMethod as 'CASH' | 'CARD' | 'UPI' | 'BANK_TRANSFER' | 'OTHER',
                notes: notes || undefined,
              }
            : undefined,
        initialPayments,
      });

      setSuccess(`Sale completed! Invoice #${result.invoiceNumber}`);
      setCart([]);
      setSelectedCustomerId(null);
      setInvoiceDiscount(0);
      setCashReceived('');
      setNotes('');
      setSplitPayments([]);
      setPaymentMode('single');
      setIdempotencyKey(`pos-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
      setIsCheckoutOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Checkout failed';
      // Stock errors are the one failure mode where the UI should correct
      // itself: refresh the cached stock, clamp the offending cart line(s),
      // and tell the cashier exactly which product was short.
      if (message.startsWith('Insufficient stock')) {
        setStockError(message);
        const fresh = await refreshProducts();
        clampCartToStock(fresh);
        setError(null);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const clearCart = () => {
    setCart([]);
    setInvoiceDiscount(0);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
        <div>
          <h1 className="text-2xl font-extrabold text-white">{businessName}</h1>
          <p className="text-xs text-gray-400">POS Terminal</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-gray-300 hover:text-white">
            Dashboard
          </Link>
          <Link href="/invoices" className="text-sm text-gray-300 hover:text-white">
            Invoices
          </Link>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-0">
        {/* Left: Product Search & Selection */}
        <div className="lg:col-span-2 flex flex-col border-r border-white/10">
          {/* Search Bar */}
          <div className="p-4 border-b border-white/10">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                ref={barcodeInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, SKU, or scan barcode..."
                className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-indigo-500/50"
                autoFocus
              />
            </div>
          </div>

            {stockError && (
              <div className="mx-4 mt-3 flex items-center gap-3 p-3 rounded-xl bg-amber-950/40 border border-amber-500/50 text-amber-200 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                <span className="flex-1">{stockError}</span>
                <button
                  onClick={() => setStockError(null)}
                  className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Product Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {searchQuery && filteredProducts.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <p className="text-lg font-medium">No products found</p>
                <p className="text-sm mt-1">Try a different search term or SKU</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredProducts.map((product) => {
                  const stockNum = Number(product.stockQuantity);
                  const sellPrice = Number(product.sellingPrice);
                  const isOutOfStock = stockNum <= 0;

                  return (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      disabled={isOutOfStock}
                      className={`glass-card p-4 text-left transition-all hover:bg-white/5 ${
                        isOutOfStock ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white text-sm truncate">{product.name}</p>
                          <p className="text-xs text-gray-400 font-mono mt-0.5">SKU: {product.SKU}</p>
                        </div>
                        {isOutOfStock && (
                          <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full font-medium">
                            Out
                          </span>
                        )}
                      </div>
                      <div className="mt-3 flex items-end justify-between">
                        <div>
                          <p className="text-lg font-extrabold text-indigo-400 font-mono">
                            {currencySymbol}{sellPrice.toFixed(2)}
                          </p>
                          <p className="text-[10px] text-gray-500">
                            {stockNum} {product.unit} left
                          </p>
                        </div>
                        <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300">
                          <Plus className="w-4 h-4" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Cart & Checkout */}
        <div className="flex flex-col bg-white/[0.02]">
          {/* Cart Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-indigo-400" />
              <h2 className="font-bold text-white">Cart ({cart.length})</h2>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-red-400 hover:text-red-300 font-medium"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Cart is empty</p>
                <p className="text-xs mt-1">Add products from the left panel</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.productId} className="glass-card p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{item.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{item.SKU}</p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateCartQuantity(item.productId, -1)}
                        className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:text-white"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center font-mono font-bold text-white text-sm">{item.quantity}</span>
                      <button
                        onClick={() => updateCartQuantity(item.productId, 1)}
                        className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:text-white"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs text-gray-400 ml-1">{item.unit}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-white font-mono text-sm">
                        {currencySymbol}{(item.quantity * item.unitPrice).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Line Disc:</span>
                    <input
                      type="number"
                      value={item.discount}
                      onChange={(e) => updateItemDiscount(item.productId, Number(e.target.value))}
                      className="w-16 px-2 py-1 bg-white/5 border border-white/10 rounded text-xs font-mono text-right"
                      min="0"
                      step="0.01"
                    />
                    <span className="text-xs text-gray-500">{currencySymbol}</span>
                  </div>

                  {cartStockWarning(item) && (
                    <div
                      className={`flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-lg ${
                        cartStockWarning(item) === 'Out of stock'
                          ? 'bg-red-500/15 text-red-300 border border-red-500/30'
                          : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{cartStockWarning(item)}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Cart Summary */}
          {cart.length > 0 && (
            <div className="p-4 border-t border-white/10 space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-300">
                  <span>Subtotal</span>
                  <span className="font-mono">{currencySymbol}{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-300 items-center gap-2">
                  <span>Discount</span>
                  <input
                    type="number"
                    value={invoiceDiscount}
                    onChange={(e) => setInvoiceDiscount(Number(e.target.value) || 0)}
                    className="w-20 px-2 py-1 bg-white/5 border border-white/10 rounded text-xs font-mono text-right"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Tax</span>
                  <span className="font-mono">{currencySymbol}{taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-white font-bold text-lg pt-2 border-t border-white/10">
                  <span>Total</span>
                  <span className="font-mono">{currencySymbol}{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={() => setIsCheckoutOpen(true)}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl text-white font-bold shadow-lg hover:opacity-90 transition-all"
              >
                Proceed to Checkout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-card w-full max-w-lg p-6 md:p-8 space-y-6 relative border border-white/20 shadow-2xl bg-[#0f111a]">
            <button
              onClick={() => setIsCheckoutOpen(false)}
              className="absolute right-4 top-4 p-2 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Wallet className="w-5 h-5 text-indigo-400" />
                Checkout
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Total: {currencySymbol}{grandTotal.toFixed(2)}
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-900/30 border border-red-500/50 text-red-200 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-900/30 border border-emerald-500/50 text-emerald-200 text-xs">
                <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{success}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Customer Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Customer
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedCustomerId || ''}
                    onChange={(e) => setSelectedCustomerId(e.target.value || null)}
                    className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm"
                  >
                    <option value="">Walk-in Customer</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id} className="bg-gray-900 text-white">
                        {c.name} {c.phone ? `(${c.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedCustomer && (
                  <p className="text-xs text-gray-400 mt-1">
                    Balance: {currencySymbol}{Number(selectedCustomer.currentBalance).toFixed(2)}
                    {selectedCustomer.creditLimit ? ` | Limit: ${currencySymbol}${Number(selectedCustomer.creditLimit).toFixed(2)}` : ''}
                  </p>
                )}
              </div>

              {/* Payment Mode Toggle */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Payment Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['single', 'split'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setPaymentMode(mode);
                        if (mode === 'single') setSplitPayments([]);
                      }}
                      className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all ${
                        paymentMode === mode
                          ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                      }`}
                    >
                      {mode === 'single' ? 'Single Payment' : 'Split Payment'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Single-payment method picker (preserved exactly) */}
              {paymentMode === 'single' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: 'CASH', label: 'Cash', icon: Banknote },
                      { value: 'CARD', label: 'Card', icon: CreditCard },
                      { value: 'UPI', label: 'UPI', icon: Smartphone },
                      { value: 'BANK_TRANSFER', label: 'Bank', icon: Wallet },
                      { value: 'OTHER', label: 'Other', icon: Wallet },
                      { value: 'CREDIT', label: 'Credit', icon: User },
                    ] as const).map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setPaymentMethod(value)}
                        className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                          paymentMethod === value
                            ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Single cash received (preserved exactly) */}
              {paymentMode === 'single' && paymentMethod === 'CASH' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Cash Received ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm font-mono"
                    placeholder="0.00"
                    min={grandTotal}
                    step="0.01"
                  />
                  {Number(cashReceived) >= grandTotal && (
                    <p className="text-xs text-emerald-400 mt-1">
                      Change: {currencySymbol}{change.toFixed(2)}
                    </p>
                  )}
                </div>
              )}

              {/* Split tender rows */}
              {paymentMode === 'split' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Payment Entries
                    </span>
                    <button
                      type="button"
                      onClick={addSplitPayment}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 rounded-lg text-xs font-semibold text-indigo-300 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Payment
                    </button>
                  </div>

                  {splitPayments.length === 0 && (
                    <p className="text-xs text-gray-500">
                      Add at least one payment entry to tender this sale.
                    </p>
                  )}

                  {splitPayments.map((entry, index) => (
                    <div key={index} className="glass-card p-3 space-y-2 border border-white/10">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-400">Payment {index + 1}</span>
                        {splitPayments.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSplitPayment(index)}
                            className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <select
                            value={entry.method}
                            onChange={(e) => updateSplitPayment(index, { method: e.target.value as TenderMethod })}
                            className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs"
                          >
                            <option value="CASH">Cash</option>
                            <option value="CARD">Card</option>
                            <option value="UPI">UPI</option>
                            <option value="BANK_TRANSFER">Bank Transfer</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </div>
                        <div>
                          <input
                            type="number"
                            value={entry.amount}
                            onChange={(e) => updateSplitPayment(index, { amount: e.target.value })}
                            className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-mono text-right"
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>
                      <input
                        type="text"
                        value={entry.reference || ''}
                        onChange={(e) => updateSplitPayment(index, { reference: e.target.value })}
                        className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs"
                        placeholder="Reference (optional)"
                      />
                    </div>
                  ))}

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                      <p className="text-gray-400">Total Paid</p>
                      <p className="font-mono font-bold text-emerald-400">
                        {currencySymbol}{totalPaid.toFixed(2)}
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                      <p className="text-gray-400">Remaining</p>
                      <p className="font-mono font-bold text-amber-400">
                        {currencySymbol}{remaining.toFixed(2)}
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                      <p className="text-gray-400">Overpayment</p>
                      <p className="font-mono font-bold text-red-400">
                        {currencySymbol}{overpayment.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {splitCash > 0 && (
                    <div className="flex items-center justify-between text-xs px-1">
                      <span className="text-gray-400">Cash tendered</span>
                      <span className="font-mono text-white">
                        {currencySymbol}{splitCash.toFixed(2)}
                      </span>
                      <span className="text-gray-400">Change</span>
                      <span className={`font-mono font-bold ${splitChangeRounded > 0 ? 'text-emerald-400' : 'text-gray-500'}`}>
                        {currencySymbol}{splitChangeRounded.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm"
                  rows={2}
                  placeholder="Optional notes..."
                />
              </div>

              <button
                onClick={handleCheckout}
                disabled={loading || (paymentMode === 'split' && !splitValid)}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl text-white font-bold shadow-lg hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? 'Processing...' : `Pay ${currencySymbol}${grandTotal.toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
