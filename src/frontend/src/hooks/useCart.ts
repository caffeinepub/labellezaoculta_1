import { createContext, useCallback, useContext, useState } from "react";
import type { Photo } from "../backend.d";

export interface CartItem {
  photo: Photo;
  quantity: number;
}

interface CartContextValue {
  cartItems: CartItem[];
  cartCount: number;
  addToCart: (photo: Photo) => void;
  removeFromCart: (photoId: string) => void;
  clearCart: () => void;
}

// We export the context for the provider in App/main
export const CartContext = createContext<CartContextValue>({
  cartItems: [],
  cartCount: 0,
  addToCart: () => {},
  removeFromCart: () => {},
  clearCart: () => {},
});

export function useCart(): CartContextValue {
  return useContext(CartContext);
}

export function useCartState(): CartContextValue {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const addToCart = useCallback((photo: Photo) => {
    setCartItems((prev) => {
      if (prev.some((i) => i.photo.id === photo.id)) return prev;
      return [...prev, { photo, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((photoId: string) => {
    setCartItems((prev) => prev.filter((i) => i.photo.id !== photoId));
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  return { cartItems, cartCount, addToCart, removeFromCart, clearCart };
}
