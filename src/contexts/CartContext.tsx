import { startTransition, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import { computeDisplayPrice } from "@/lib/format";
import { getSupabase } from "@/integrations/supabase/lazy-client";
import { CartContext, type CartItem, type CartContextValue, type PaymentCurrency } from "@/hooks/use-cart";

/** Preferencia de moneda guardada desde Ajustes. El carrito la respeta al arrancar. */
export const PREFERRED_CURRENCY_KEY = "nc-preferred-currency";

function readPreferredCurrency(): PaymentCurrency {
  try {
    const v = window.localStorage.getItem(PREFERRED_CURRENCY_KEY);
    return v === "CUP" || v === "EUR" ? v : "USD";
  } catch {
    return "USD";
  }
}

const STORAGE_KEY = "neocharge_cart_v1";

/** Lee el carrito guardado de forma SÍNCRONA (initializer del estado). Antes
 * se cargaba en un efecto tras el primer render: eso abría una ventana en la
 * que el estado aún no reflejaba lo guardado y la revalidación de precios
 * podía pisar productos recién añadidos con la foto vieja del carrito. */
function readStoredCart(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn("Cart: unable to load from storage", e);
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(readStoredCart);
  const [isOpen, setIsOpen] = useState(false);
  const [paymentCurrency, setPaymentCurrency] = useState<PaymentCurrency>(readPreferredCurrency);
  // Aviso de precios revalidados contra el catálogo (se muestra en el CartSheet).
  const [priceNotice, setPriceNotice] = useState<string | null>(null);
  const dismissPriceNotice = useCallback(() => setPriceNotice(null), []);
  const revalidatedRef = useRef(false);

  // Revalidar los precios guardados contra el catálogo en vivo: si un precio
  // cambió desde que se añadió al carrito, se actualiza y se avisa al cliente.
  // Si el producto ya no existe o está inactivo, se quita del carrito.
  // OJO: la mezcla se hace con setItems funcional contra el estado ACTUAL.
  // La versión anterior reconstruía el carrito desde la foto capturada al
  // hidratar y, como el cliente de Supabase carga diferido (segundos), al
  // resolverse pisaba productos que el cliente hubiera añadido mientras
  // tanto: al recargar, el carrito "perdía" lo nuevo y volvía al viejo.
  useEffect(() => {
    if (revalidatedRef.current || items.length === 0) return;
    revalidatedRef.current = true;
    const storedIds = items.map((i) => i.id);
    (async () => {
      try {
        const supabase = await getSupabase();
        const { data, error } = await supabase
          .from("products")
          .select("id,price,currency,price_cup,extra_cup_per_usd,stock,is_active")
          .in("id", storedIds);
        if (error || !data) return;
        const byId = new Map(data.map((p) => [String(p.id), p]));
        const requested = new Set(storedIds.map((id) => String(id)));
        setItems((prev) => {
          const changed: string[] = [];
          const removed: string[] = [];
          let next = prev;
          for (const item of prev) {
            // Solo se revalidan los productos que venían guardados; lo que
            // el cliente añadió en esta sesión ya viene del catálogo vivo.
            if (!requested.has(String(item.id))) continue;
            const live = byId.get(String(item.id));
            if (!live || live.is_active === false) {
              removed.push(item.name);
              next = next.filter((i) => i.id !== item.id);
              continue;
            }
            const priceChanged =
              Number(live.price) !== Number(item.price) ||
              String(live.currency ?? "") !== String(item.currency ?? "") ||
              Number(live.price_cup ?? 0) !== Number(item.price_cup ?? 0) ||
              Number(live.extra_cup_per_usd ?? 0) !== Number(item.extra_cup_per_usd ?? 0);
            const stockChanged = live.stock != null && Number(live.stock) !== Number(item.stock ?? -1);
            if (priceChanged || stockChanged) {
              changed.push(item.name);
              next = next.map((i) =>
                i.id === item.id
                  ? {
                      ...i,
                      price: Number(live.price),
                      currency: live.currency ?? i.currency,
                      price_cup: live.price_cup != null ? Number(live.price_cup) : i.price_cup,
                      extra_cup_per_usd:
                        live.extra_cup_per_usd != null ? Number(live.extra_cup_per_usd) : i.extra_cup_per_usd,
                      stock: live.stock != null ? Number(live.stock) : i.stock,
                    }
                  : i,
              );
            }
          }
          if (changed.length > 0 || removed.length > 0) {
            const parts: string[] = [];
            if (changed.length > 0)
              parts.push(
                changed.length === 1
                  ? `El precio de "${changed[0]}" cambió y se actualizó.`
                  : `Se actualizaron los precios de ${changed.length} productos.`,
              );
            if (removed.length > 0)
              parts.push(
                removed.length === 1
                  ? `"${removed[0]}" ya no está disponible y se quitó del carrito.`
                  : `${removed.length} productos ya no están disponibles y se quitaron del carrito.`,
              );
            const notice = parts.join(" ");
            queueMicrotask(() => setPriceNotice(notice));
          }
          return next;
        });
      } catch (e) {
        console.warn("Cart: price revalidation failed", e);
      }
    })();
    // Solo al montar, sobre el carrito que venía guardado; los cambios
    // posteriores ya vienen del catálogo en vivo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn("Cart: unable to save to storage", e);
    }
  }, [items]);

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
      const { usd, cup, eur } = computeDisplayPrice(item, exchangeRate);
      return {
        ...item,
        displayPriceUSD: usd,
        displayPriceCUP: cup,
        displayPriceEUR: eur,
      };
    });

    const initialTotalUSD = updatedItems.reduce((sum, i) => sum + (i.displayPriceUSD ?? 0) * i.quantity, 0);
    const initialTotalCUP = updatedItems.reduce((sum, i) => sum + (i.displayPriceCUP ?? 0) * i.quantity, 0);
    const initialTotalEUR = updatedItems.reduce((sum, i) => sum + (i.displayPriceEUR ?? 0) * i.quantity, 0);
    const itemCount = updatedItems.reduce((sum, i) => sum + i.quantity, 0);

    const totalUSD = roundToNearestWhole(initialTotalUSD);
    const totalCUP = roundToNearestWhole(initialTotalCUP);
    // Sin tasa de cambio no se inventan conversiones: un total solo es
    // "completo" si cada ítem tiene precio conocido en esa moneda.
    const completeUSD = updatedItems.every((i) => i.displayPriceUSD != null);
    const completeCUP = updatedItems.every((i) => i.displayPriceCUP != null);
    const completeEUR = updatedItems.every((i) => i.displayPriceEUR != null);
    // EUR: desde el precio USD × tasaUSD ÷ tasaEUR (computeDisplayPrice),
    // SIN el extra de cargadores (ese es solo pa CUP). Redondeo a 2
    // decimales. Sin tasa EUR registrada, totalEUR queda null y la opción
    // de pagar en EUR no se ofrece (respaldo limpio).
    const totalEUR = completeEUR ? Math.round(initialTotalEUR * 100) / 100 : null;
    const total =
      paymentCurrency === "USD" ? totalUSD : paymentCurrency === "CUP" ? totalCUP : totalEUR ?? totalUSD;

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
      totalEUR,
      completeUSD,
      completeCUP,
      completeEUR,
      itemCount,
      paymentCurrency,
      setPaymentCurrency: (currency: PaymentCurrency) => setPaymentCurrency(currency),
      priceNotice,
      dismissPriceNotice,
    };
  }, [items, addItem, removeItem, updateQuantity, clearCart, isOpen, openCart, closeCart, exchangeRate, paymentCurrency, roundToNearestWhole, priceNotice, dismissPriceNotice]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
