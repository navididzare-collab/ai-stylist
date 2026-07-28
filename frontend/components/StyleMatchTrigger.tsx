"use client";

import { useRouter } from "next/navigation";
import { Palette, ChevronLeft } from "lucide-react";

interface StyleMatchTriggerProps {
  productId: number;
}

export default function StyleMatchTrigger({ productId }: StyleMatchTriggerProps) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(`/chat?productId=${productId}`)}
      className="relative w-full flex items-center justify-start rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 pl-10 pr-3 py-2 text-right transition hover:bg-amber-100 dark:hover:bg-amber-950/50"
    >
      <ChevronLeft
        size={18}
        className="absolute left-4 text-neutral-400 dark:text-neutral-500 shrink-0"
      />

      <div className="flex items-center justify-start gap-3 text-right">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white">
          <Palette size={18} />
        </span>

        <div>
          <p className="text-sm font-bold text-neutral-900 dark:text-white">
            ست کردن لباس بر اساس سلایقتون
          </p>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
            پیشنهاد ست هوشمند متناسب با استایل شما
          </p>
        </div>
      </div>
    </button>
  );
}