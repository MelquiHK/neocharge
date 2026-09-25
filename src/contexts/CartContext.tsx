import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
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
      if (existing) {
        return prev.map((i) =>
          i.id === incoming.id ? { ...i, quantity: i.quantity + qty } : i,
        );
      }
      return [...prev, { ...incoming, quantity: qty }];
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
  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const { rate: exchangeRate } = useExchangeRate();

  const roundUpToNextWhole = useCallback((num: number) => {
    return Math.ceil(num);
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

    const totalUSD = roundUpToNextWhole(initialTotalUSD);
    const totalCUP = roundUpToNextWhole(initialTotalCUP);
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
  }, [items, addItem, removeItem, updateQuantity, clearCart, isOpen, openCart, closeCart, exchangeRate, paymentCurrency, roundUpToNextWhole]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
