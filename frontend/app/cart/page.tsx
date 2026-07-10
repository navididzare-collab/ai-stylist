"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useTheme } from "@/components/theme/ThemeProvider";

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, totalPrice, totalCount } =
    useCart();
  const { theme } = useTheme();
  const dark = theme === "dark";

  if (items.length === 0) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-24 min-h-screen flex flex-col items-center justify-center text-center bg-white dark:bg-neutral-950 transition-colors">
        <p className="text-lg text-neutral-500 dark:text-neutral-400 mb-4">
          سبد خرید شما خالیه
        </p>
        <Link
          href="/products"
          className="px-5 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-semibold dark:bg-white dark:text-neutral-900"
        >
          مشاهده‌ی محصولات
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-10 min-h-screen bg-white dark:bg-neutral-950 transition-colors">
      <h1 className="text-lg sm:text-2xl font-bold mb-5 sm:mb-8 text-neutral-900 dark:text-white">
        سبد خرید ({totalCount} کالا)
      </h1>

      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-center gap-3 sm:gap-4 rounded-xl border p-2.5 sm:p-4 ${
              dark ? "border-neutral-800" : "border-neutral-100"
            }`}
          >
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800">
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.name}
                  className="h-full w-full object-contain"
                />
              ) : null}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium line-clamp-2 text-neutral-800 dark:text-neutral-200">
                {item.name}
              </p>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                {item.price.toLocaleString()} تومان
              </p>

              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-neutral-300 dark:border-neutral-700 flex items-center justify-center text-sm text-neutral-700 dark:text-neutral-300"
                >
                  −
                </button>
                <span className="w-5 text-center text-xs sm:text-sm text-neutral-800 dark:text-neutral-200">
                  {item.quantity}
                </span>
                <button
                  onClick={() => {
                    if (item.stock === undefined || item.quantity < item.stock) {
                      updateQuantity(item.id, item.quantity + 1);
                    }
                  }}
                  disabled={item.stock !== undefined && item.quantity >= item.stock}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-neutral-300 dark:border-neutral-700 flex items-center justify-center text-sm text-neutral-700 dark:text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  +
                </button>
              </div>

              {item.stock !== undefined && item.quantity >= item.stock && (
                <p className="mt-1 text-[11px] text-red-500">
                  حداکثر موجودی همینه
                </p>
              )}
            </div>

            <button
              onClick={() => removeFromCart(item.id)}
              className="text-red-500 text-xs sm:text-sm px-2 sm:px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 flex-shrink-0 self-start sm:self-center"
            >
              حذف
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 sm:mt-8 border-t border-neutral-100 dark:border-neutral-800 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
          جمع کل: {totalPrice.toLocaleString()} تومان
        </div>
        <button className="w-full sm:w-auto px-6 py-3 rounded-xl bg-neutral-900 text-white font-medium dark:bg-white dark:text-neutral-900">
          ادامه‌ی خرید و پرداخت
        </button>
      </div>
    </main>
  );
}