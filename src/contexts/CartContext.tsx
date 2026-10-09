import { startTransition, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import { computeDisplayPrice } from "@/lib/format";
import { CartContext, type CartItem, type CartContextValue } from "@/hooks/use-cart";

const STORAGE_KEY = "neocharge_cart_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [paymentCurrency, setPaymentCurrency] = useState<"USD" | "CUP">("USD");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch (e) {
      console.warn("Cart: unable to load from storage", e);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn("Cart: unable to save to storage", e);
    }
  }, [items, hydrated]);

  const addItem: CartContextValue["addItem"] = useCallback((incoming) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === incoming.id);
      const qty = incoming.quantity ?? 1;
      // M10: topar la cantidad por el stock conocido del producto
      // (null/undefined = sin control de stock → sin tope). Nunca se permite
      // cantidad > stock, y un producto agotado no entra al carrito.
      const cap = incoming.stock != null && incoming.stock >= 0 ? incoming.stock : null;
      if (existing) {
        const next = existing.quantity + qty;
        const capped = cap != null ? Math.min(next, cap) : next;
        if (capped <= 0) return prev.filter((i) => i.id !== incoming.id);
        return prev.map((i) =>
          i.id === incoming.id ? { ...i, quantity: capped } : i,
        );
      }
      const finalQty = cap != null ? Math.min(qty, cap) : qty;
      if (finalQty <= 0) return prev;
      return [...prev, { ...incoming, quantity: finalQty }];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.id !== id)
        : prev.map((i) => (i.id === id ? { ...i, quantity } : i)),
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);
  // El CartSheet va en chunk lazy: abrirlo en un evento síncrono mientras el
  // chunk aún no cargó suspendía dentro del input y rompía la app (React #306).
  // Con startTransition React espera al chunk en vez de lanzar el error.
  const openCart = useCallback(() => startTransition(() => setIsOpen(true)), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const { rate: exchangeRate } = useExchangeRate();

  // H8: los totales se redondean al entero MÁS CERCANO. Math.ceil cobraba
  // de más (ej: $60.20 se mostraba y se enviaba como $61.00).
  const roundToNearestWhole = useCallback((num: number) => {
    return Math.round(num);
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const updatedItems = items.map(item => {
      const { usd, cup } = computeDisplayPrice(item, exchangeRate);
      return {
        ...item,
        displayPriceUSD: usd,
        displayPriceCUP: cup,
      };
    });

    const initialTotalUSD = updatedItems.reduce((sum, i) => sum + (i.displayPriceUSD ?? 0) * i.quantity, 0);
    const initialTotalCUP = updatedItems.reduce((sum, i) => sum + (i.displayPriceCUP ?? 0) * i.quantity, 0);
    const itemCount = updatedItems.reduce((sum, i) => sum + i.quantity, 0);

    const totalUSD = roundToNearestWhole(initialTotalUSD);
    const totalCUP = roundToNearestWhole(initialTotalCUP);
    const total = paymentCurrency === "USD" ? totalUSD : totalCUP;
    // Sin tasa de cambio no se inventan conversiones: un total solo es
    // "completo" si cada ítem tiene precio conocido en esa moneda.
    const completeUSD = updatedItems.every((i) => i.displayPriceUSD != null);
    const completeCUP = updatedItems.every((i) => i.displayPriceCUP != null);

    return {
      items: updatedItems,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      isOpen,
      openCart,
      closeCart,
      total,
      totalUSD,
      totalCUP,
      completeUSD,
      completeCUP,
      itemCount,
      paymentCurrency,
      setPaymentCurrency: (currency: "USD" | "CUP") => setPaymentCurrency(currency),
    };
  }, [items, addItem, removeItem, updateQuantity, clearCart, isOpen, openCart, closeCart, exchangeRate, paymentCurrency, roundToNearestWhole]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
