import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useExchangeRate } from "@/hooks/use-exchange-rate";

export interface CartItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency?: string;
  price_cup?: number;
  extra_cup_per_usd?: number;
  image?: string;
  quantity: number;
  stock?: number;
  warranty_type?: string;
  displayPriceUSD?: number;
  displayPriceCUP?: number;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  total: number;
  totalUSD: number;
  totalCUP: number;
  itemCount: number;
  paymentCurrency: "USD" | "CUP";
  setPaymentCurrency: (currency: "USD" | "CUP") => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);
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
    const decimalPart = num - Math.floor(num);
    if (decimalPart === 0) {
      return num;
    }
    return Math.ceil(num);
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const currentExchangeRate = exchangeRate?.usd_to_cup ?? 1;
    let initialTotalUSD = 0;
    let initialTotalCUP = 0;
    const updatedItems = items.map(item => {
      let itemPriceUSD = 0;
      let itemPriceCUP = 0;

      if (item.currency === "USD") {
        itemPriceUSD = Number(item.price || 0);
        itemPriceCUP = Number(item.price || 0) * currentExchangeRate + Number(item.extra_cup_per_usd || 0);
      } else if (item.currency === "CUP") {
        itemPriceCUP = Number(item.price_cup || 0);
        itemPriceUSD = Number(itemPriceCUP) / currentExchangeRate;
      } else {
        // Default to USD if currency is not specified
        itemPriceUSD = Number(item.price || 0);
        itemPriceCUP = Number(item.price || 0) * currentExchangeRate;
      }

      return {
        ...item,
        displayPriceUSD: itemPriceUSD,
        displayPriceCUP: itemPriceCUP,
      };
    });

    initialTotalUSD = updatedItems.reduce((sum, i) => sum + (i.displayPriceUSD || 0) * i.quantity, 0);
    initialTotalCUP = updatedItems.reduce((sum, i) => sum + (i.displayPriceCUP || 0) * i.quantity, 0);

    const itemCount = updatedItems.reduce((sum, i) => sum + i.quantity, 0);

    // Apply rounding for profit
    const totalUSD = roundUpToNextWhole(initialTotalUSD);
    const totalCUP = roundUpToNextWhole(initialTotalCUP);

    const total = paymentCurrency === "USD" ? totalUSD : totalCUP;

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
      itemCount,
      paymentCurrency,
      setPaymentCurrency: (currency: "USD" | "CUP") => setPaymentCurrency(currency),
    };
  }, [items, addItem, removeItem, updateQuantity, clearCart, isOpen, openCart, closeCart, exchangeRate, paymentCurrency, roundUpToNextWhole]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
