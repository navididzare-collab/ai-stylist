"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { getToken, subscribeToAuthChanges } from "@/lib/auth";
import { getImageUrl } from "@/services/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://app-python-f3b4n.apps.teh11.abrhapaas.com";

export interface CartProduct {
  id: number;
  name: string;
  price: number;
  image?: string;
  stock?: number;
}

interface CartItem extends CartProduct {
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: CartProduct) => Promise<boolean>;
  removeFromCart: (id: number) => Promise<void>;
  updateQuantity: (id: number, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  totalPrice: number;
  totalCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

type ApiCartItem = {
  id: number;
  quantity: number;
  product: {
    id: number;
    name: string;
    price: number;
    stock: number;
    image_url: string | null;
  };
};

function mapApiItem(item: ApiCartItem): CartItem {
  return {
    id: item.product.id,
    name: item.product.name,
    price: item.product.price,
    stock: item.product.stock,
    image: item.product.image_url ? getImageUrl(item.product.image_url) ?? undefined : undefined,
    quantity: item.quantity,
  };
}

/** هدر Authorization رو می‌سازه */
function authHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setItems([]);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/cart/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data: ApiCartItem[] = await res.json();
      setItems(data.map(mapApiItem));
    } catch {
      // بی‌سروصدا رد می‌شیم؛ سبد خالی می‌مونه
    }
  }, []);

  useEffect(() => {
    refresh();
    const unsubscribe = subscribeToAuthChanges(refresh);
    return unsubscribe;
  }, [refresh]);

  const addToCart = useCallback(
    async (product: CartProduct): Promise<boolean> => {
      const token = getToken();
      if (!token) return false;

      const res = await fetch(`${API_BASE}/cart/`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ product_id: product.id, quantity: 1 }),
      });

      if (res.ok) await refresh();
      return res.ok;
    },
    [refresh]
  );

  const removeFromCart = useCallback(
    async (id: number) => {
      const token = getToken();
      if (!token) return;
      await fetch(`${API_BASE}/cart/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      await refresh();
    },
    [refresh]
  );

  const updateQuantity = useCallback(
    async (id: number, quantity: number) => {
      const token = getToken();
      if (!token) return;

      if (quantity < 1) {
        await removeFromCart(id);
        return;
      }

      await fetch(`${API_BASE}/cart/${id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ quantity }),
      });
      await refresh();
    },
    [refresh, removeFromCart]
  );

  const clearCart = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    await fetch(`${API_BASE}/cart/`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setItems([]);
  }, []);

  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalPrice,
        totalCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart باید داخل CartProvider استفاده بشه");
  }
  return context;
}