"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { getUser, subscribeToAuthChanges } from "@/lib/auth";

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
  // برمی‌گردونه false اگه کاربر لاگین نباشه (خود UI باید مودال ورود رو باز کنه)
  addToCart: (product: CartProduct) => Promise<boolean>;
  removeFromCart: (id: number) => Promise<void>;
  updateQuantity: (id: number, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  totalPrice: number;
  totalCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// عکس محصولات فقط سمت فرانت نگه داشته می‌شه (بک‌اند فعلاً عکس رو برنمی‌گردونه)
const imageCache = new Map<number, string>();

type ApiCartItem = {
  id: number;
  quantity: number;
  product: { id: number; name: string; price: number; stock: number };
};

function mapApiItem(item: ApiCartItem): CartItem {
  return {
    id: item.product.id,
    name: item.product.name,
    price: item.product.price,
    stock: item.product.stock,
    image: imageCache.get(item.product.id),
    quantity: item.quantity,
  };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const refresh = useCallback(async () => {
    const user = getUser();
    if (!user) {
      setItems([]);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/cart/${user.id}`);
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
      const user = getUser();
      if (!user) return false;

      if (product.image) imageCache.set(product.id, product.image);

      const res = await fetch(`${API_BASE}/cart/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, product_id: product.id, quantity: 1 }),
      });

      if (res.ok) await refresh();
      return res.ok;
    },
    [refresh]
  );

  const removeFromCart = useCallback(
    async (id: number) => {
      const user = getUser();
      if (!user) return;
      await fetch(`${API_BASE}/cart/${user.id}/${id}`, { method: "DELETE" });
      await refresh();
    },
    [refresh]
  );

  const updateQuantity = useCallback(
    async (id: number, quantity: number) => {
      const user = getUser();
      if (!user) return;

      if (quantity < 1) {
        await removeFromCart(id);
        return;
      }

      await fetch(`${API_BASE}/cart/${user.id}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
      await refresh();
    },
    [refresh, removeFromCart]
  );

  const clearCart = useCallback(async () => {
    const user = getUser();
    if (!user) return;
    await fetch(`${API_BASE}/cart/${user.id}`, { method: "DELETE" });
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