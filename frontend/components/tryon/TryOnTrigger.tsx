"use client";

import { useState } from "react";
import { Sparkles, ChevronLeft } from "lucide-react";
import TryOnModal from "./TryOnModal";

interface TryOnTriggerProps {
  productId: number;
  productTitle: string;
}

export default function TryOnTrigger({ productId, productTitle }: TryOnTriggerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative w-full flex items-center justify-start rounded-full bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/50 pl-10 pr-3 py-2 text-right transition hover:bg-purple-100 dark:hover:bg-purple-950/60"
      >
        <ChevronLeft
          size={18}
          className="absolute left-4 text-neutral-400 dark:text-neutral-500 shrink-0"
        />

        <div className="flex items-center justify-start gap-3 text-right">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white">
            <Sparkles size={18} />
          </span>

          <div>
            <p className="text-sm font-bold text-neutral-900 dark:text-white">
              روی تن خودت ببین
            </p>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
              آپلود عکس و پرو مجازی با این لباس
            </p>
          </div>
        </div>
      </button>

      {open && (
        <TryOnModal
          productId={productId}
          productTitle={productTitle}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}