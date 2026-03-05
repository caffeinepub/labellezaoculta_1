import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CreditCard, Loader2, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ShoppingItem } from "../backend.d";
import { useCart } from "../hooks/useCart";
import { useCreateCheckoutSession } from "../hooks/useCheckout";

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatPrice(eurocents: bigint): string {
  const euros = Number(eurocents) / 100;
  return `€${euros.toFixed(2)}`;
}

export function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const { cartItems, removeFromCart, clearCart, cartCount } = useCart();
  const checkout = useCreateCheckoutSession();

  const totalCents = cartItems.reduce(
    (sum, item) => sum + Number(item.photo.price) * item.quantity,
    0,
  );

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;

    const shoppingItems: ShoppingItem[] = cartItems.map((item) => ({
      productName: item.photo.title,
      currency: "eur",
      quantity: BigInt(item.quantity),
      priceInCents: item.photo.price,
      productDescription: item.photo.description || item.photo.title,
    }));

    checkout.mutate(shoppingItems, {
      onSuccess: (session) => {
        clearCart();
        window.location.href = session.url;
      },
      onError: (err) => {
        const msg =
          err instanceof Error ? err.message : "Error al procesar el pago";
        toast.error(msg);
      },
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full sm:max-w-md flex flex-col"
        style={{
          background: "oklch(0.09 0.004 285)",
          borderLeft: "1px solid oklch(0.20 0.006 285 / 0.6)",
        }}
        data-ocid="cart.sheet"
      >
        <SheetHeader className="shrink-0 pb-4">
          <SheetTitle className="font-display text-xl font-light text-foreground flex items-center gap-2.5">
            <ShoppingCart className="w-5 h-5 text-gold" />
            Carrito
            {cartCount > 0 && (
              <span
                className="ml-1 font-mono text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: "oklch(0.78 0.14 75 / 0.15)",
                  border: "1px solid oklch(0.78 0.14 75 / 0.3)",
                  color: "oklch(0.88 0.10 75)",
                }}
              >
                {cartCount}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        <Separator
          style={{ background: "oklch(0.20 0.006 285 / 0.5)" }}
          className="shrink-0"
        />

        {cartItems.length === 0 ? (
          <div
            className="flex-1 flex flex-col items-center justify-center gap-4 text-center py-16"
            data-ocid="cart.empty_state"
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.14 0.004 285), oklch(0.19 0.006 285))",
                border: "1px solid oklch(0.22 0.006 285 / 0.5)",
              }}
            >
              <ShoppingCart className="w-7 h-7 text-text-subtle" />
            </div>
            <div>
              <p className="font-display text-base font-light text-foreground mb-1">
                Tu carrito está vacío
              </p>
              <p className="text-text-dim text-sm font-sans">
                Añade fotografías para comprarlas
              </p>
            </div>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 py-4 -mx-6 px-6">
              <div className="space-y-3" data-ocid="cart.list">
                {cartItems.map((item, idx) => (
                  <div
                    key={item.photo.id}
                    className="flex items-center gap-3 py-3 group"
                    style={{
                      borderBottom: "1px solid oklch(0.16 0.006 285 / 0.5)",
                    }}
                    data-ocid={`cart.item.${idx + 1}`}
                  >
                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.photo.id)}
                      className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-text-subtle hover:text-destructive hover:bg-destructive/10 transition-all"
                      aria-label={`Quitar ${item.photo.title} del carrito`}
                      data-ocid={`cart.delete_button.${idx + 1}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-sm text-foreground truncate">
                        {item.photo.title}
                      </p>
                      {item.photo.description && (
                        <p className="text-text-subtle text-xs font-sans truncate mt-0.5">
                          {item.photo.description}
                        </p>
                      )}
                    </div>

                    {/* Price */}
                    <span
                      className="shrink-0 font-mono text-sm font-medium"
                      style={{ color: "oklch(0.88 0.10 75)" }}
                    >
                      {formatPrice(item.photo.price)}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Footer */}
            <div
              className="shrink-0 pt-4 space-y-4"
              style={{ borderTop: "1px solid oklch(0.20 0.006 285 / 0.5)" }}
            >
              {/* Total */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-widest text-text-dim">
                  Total
                </span>
                <span
                  className="font-display text-2xl font-light"
                  style={{ color: "oklch(0.88 0.10 75)" }}
                >
                  €{(totalCents / 100).toFixed(2)}
                </span>
              </div>

              {/* Checkout button */}
              <Button
                onClick={handleCheckout}
                disabled={checkout.isPending}
                className="w-full gap-2 font-mono text-xs uppercase tracking-widest"
                style={{
                  background: "oklch(0.78 0.14 75)",
                  color: "oklch(0.10 0.004 285)",
                }}
                data-ocid="cart.primary_button"
              >
                {checkout.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    Pagar con tarjeta
                  </>
                )}
              </Button>

              {checkout.isError && (
                <p
                  className="text-destructive text-xs font-mono text-center"
                  data-ocid="cart.error_state"
                >
                  {checkout.error instanceof Error
                    ? checkout.error.message
                    : "Error al procesar el pago"}
                </p>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
