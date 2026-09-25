import { createContext, useContext } from "react";

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
  displayPriceUSD?: number | null;
  displayPriceCUP?: number | null;
}

export interface CartContextValue {
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
  /** true si todos los ítems tienen precio conocido en esa moneda (sin tasa, una conversión puede faltar). */
  completeUSD: boolean;
  completeCUP: boolean;
  itemCount: number;
  paymentCurrency: "USD" | "CUP";
  setPaymentCurrency: (currency: "USD" | "CUP") => void;
}

export const CartContext = createContext<CartContextValue | undefined>(undefined);

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
