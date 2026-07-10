"use client";

import Link from "next/link";
import { Trash2, Plus } from "lucide-react";
import { useCart } from "@/context/CartContext";

interface AddToCartButtonProps {
  id: number;
  name: string;
  price: number;
  image?: string;
  stock: number;
}

export default function AddToCartButton({
  id,
  name,
  price,
  image,
  stock,
}: AddToCartButtonProps) {
  const { items, addToCart, updateQuantity, removeFromCart } = useCart();

  const cartItem = items.find((item) => item.id === id);
  const quantity = cartItem?.quantity ?? 0;
  const inStock = stock > 0;
  const atMaxStock = quantity >= stock;

  if (!inStock) {
    return (
      <button
        disabled
        className="mt-3 w-full cursor-not-allowed rounded-full bg-neutral-900 py-3 text-sm font-bold text-white opacity-40 dark:bg-white dark:text-neutral-900"
      >
        ناموجود
      </button>
    );
  }

  // هنوز به سبد اضافه نشده — دکمه‌ی معمولی
  if (quantity === 0) {
    return (
      <button
        onClick={() => addToCart({ id, name, price, image, stock })}
        className="mt-3 w-full rounded-full bg-neutral-900 py-3 text-sm font-bold text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        افزودن به سبد خرید
      </button>
    );
  }

  // در سبد هست — نمایش شمارنده‌ی تعداد
  return (
    <div className="mt-3 flex items-center justify-between gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
          در سبد شما
        </span>
        <Link
          href="/cart"
          className="text-xs font-semibold text-sky-600 hover:underline dark:text-sky-400"
        >
          مشاهده‌ی سبد خرید
        </Link>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900">
        <button
          onClick={() =>
            quantity === 1 ? removeFromCart(id) : updateQuantity(id, quantity - 1)
          }
          aria-label="کاهش تعداد"
          className="flex h-7 w-7 items-center justify-center rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
        >
          <Trash2 size={16} />
        </button>

        <span className="w-4 text-center text-sm font-bold text-neutral-900 dark:text-white">
          {quantity}
        </span>

        <button
          onClick={() => {
            if (!atMaxStock) updateQuantity(id, quantity + 1);
          }}
          disabled={atMaxStock}
          aria-label="افزایش تعداد"
          className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-700 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}