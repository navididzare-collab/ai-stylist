"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { categories } from "@/lib/categories";

export default function Categories() {
  const router = useRouter();

  const handleCategoryClick = (cat: (typeof categories)[number]) => {
    if (!cat.filterType || !cat.value) {
      router.push("/products");
      return;
    }
    router.push(`/products?${cat.filterType}=${encodeURIComponent(cat.value)}`);
  };

  return (
    <section
      className="bg-white dark:bg-neutral-950 border-b border-neutral-100 dark:border-neutral-800 transition-colors px-4 py-4 sm:px-16 sm:py-7"
    >
      <div className="flex items-center gap-4 sm:justify-between overflow-x-auto sm:overflow-visible pb-1 sm:pb-0" style={{ scrollbarWidth: "none" }}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => handleCategoryClick(cat)}
            className="flex flex-col items-center gap-2 sm:gap-3 shrink-0 group min-w-0"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden shadow-sm transition-transform group-hover:scale-110 bg-neutral-900 flex items-center justify-center">
              {cat.icon ? (
                <Image
                  src={cat.icon}
                  alt={cat.label}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-neutral-400 text-lg sm:text-2xl">···</span>
              )}
            </div>
            <span className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 font-medium whitespace-nowrap group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">
              {cat.label}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}