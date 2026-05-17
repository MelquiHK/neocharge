import { Link } from "react-router-dom";
import { Minus, Plus, ShoppingBag, Trash2, X, ArrowRight } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { formatPrice, formatCUP } from "@/lib/format";
import { cn } from "@/lib/utils";

export function CartSheet() {
  const { 
    items, 
    isOpen, 
    closeCart, 
    updateQuantity, 
    removeItem, 
    total, 
    itemCount, 
    clearCart,
    paymentCurrency,
    setPaymentCurrency,
    totalUSD,
    totalCUP
  } = useCart();

  return (
    <Sheet open={isOpen} onOpenChange={(o) => (o ? null : closeCart())}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col gap-0 border-l">
        <SheetHeader className="px-6 py-5 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="font-display text-xl flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              Tu carrito
              {itemCount > 0 && (
                <span className="text-xs font-medium text-muted-foreground">({itemCount})</span>
              )}
            </SheetTitle>
          </div>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
              <ShoppingBag className="w-9 h-9 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold">Tu carrito está vacío</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Descubre nuestros productos.
              </p>
            </div>
            <Button asChild variant="hero" onClick={closeCart}>
              <Link to="/tienda">Ver productos</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-5 p-4 rounded-[1.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-primary/20 transition-all duration-300 shadow-sm hover:shadow-md group"
                >
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-secondary shrink-0">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/producto/${encodeURIComponent(item.slug)}`}
                      onClick={closeCart}
                      className="text-sm font-semibold text-foreground hover:text-primary line-clamp-2"
                    >
                      {item.name}
                    </Link>
                    <p className="text-base font-bold text-primary mt-1">
                      {paymentCurrency === "USD" 
                        ? formatPrice(item.displayPriceUSD || 0) 
                        : formatCUP(item.displayPriceCUP || 0)}
                    </p>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border border-border rounded-full">
                        <button
                          onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))}
                          disabled={item.quantity <= 1}
                          className="w-7 h-7 flex items-center justify-center hover:bg-secondary rounded-l-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Disminuir"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => {
                            const newQty = item.quantity + 1;
                            const maxStock = item.stock || 999;
                            if (newQty <= maxStock) {
                              updateQuantity(item.id, newQty);
                            }
                          }}
                          disabled={item.quantity >= (item.stock || 999)}
                          className="w-7 h-7 flex items-center justify-center hover:bg-secondary rounded-r-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Aumentar"
                          title={item.quantity >= (item.stock || 999) ? "Stock máximo alcanzado" : ""}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-muted-foreground hover:text-destructive p-1.5 rounded-full hover:bg-destructive/10 transition-colors"
                        aria-label="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={clearCart}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1 mx-auto"
              >
                <X className="w-3 h-3" /> Vaciar carrito
              </button>
            </div>

            <div className="border-t border-border/50 px-6 py-8 space-y-6 bg-slate-50/80 dark:bg-slate-900/50 backdrop-blur-xl">
              {/* Currency Selector */}
              <div className="flex items-center justify-between bg-white dark:bg-slate-950 p-1.5 rounded-2xl border border-border/50 shadow-inner">
                <button
                  onClick={() => setPaymentCurrency("USD")}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                    paymentCurrency === "USD" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Pagar en USD
                </button>
                <button
                  onClick={() => setPaymentCurrency("CUP")}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                    paymentCurrency === "CUP" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Pagar en CUP
                </button>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{paymentCurrency === "USD" ? formatPrice(totalUSD) : formatCUP(totalCUP)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Envío</span>
                  <span className="text-xs italic">Calculado al confirmar</span>
                </div>
                <div className="flex items-center justify-between text-lg font-display font-bold pt-4 border-t border-border/50">
                  <span className="tracking-tight">Total estimado</span>
                  <div className="text-right">
                    <span className="text-primary text-3xl block tracking-tighter text-glow">
                      {paymentCurrency === "USD" ? formatPrice(totalUSD) : formatCUP(totalCUP)}
                    </span>
                    {paymentCurrency === "USD" ? (
                      <span className="text-xs text-muted-foreground block font-normal">≈ {formatCUP(totalCUP)}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground block font-normal">≈ {formatPrice(totalUSD)}</span>
                    )}
                  </div>
                </div>
              </div>

              <Button asChild variant="hero" size="lg" className="w-full" onClick={closeCart}>
                <Link to="/checkout">
                  Finalizar pedido <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="w-full" onClick={closeCart}>
                <Link to="/tienda">Seguir comprando</Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
