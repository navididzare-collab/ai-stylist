"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sparkles, X } from "lucide-react";

const FULL_MESSAGE = "سلام! من دستیار استایلتم ✨ اگه کمک لازم داری، اینجام";
const TYPE_SPEED_MS = 40; // سرعت تایپ هر حرف
const SHOWN_FLAG_KEY = "ai-assistant-bubble-shown";

export default function AIAssistantBubble() {
  const pathname = usePathname();
  const router = useRouter();

  const [showBubble, setShowBubble] = useState(false);
  const [closed, setClosed] = useState(false);
  const [typedText, setTypedText] = useState("");

  // مسیرهایی که کامپوننت اصلاً نباید توشون دیده بشه: صفحه‌ی چت و صفحات محصولات
  const isHiddenRoute = pathname === "/chat" || pathname.startsWith("/products");

  // فقط یک‌بار در کل سشن، بعد از ۲ ثانیه از اولین ورود به سایت (به‌جز مسیرهای مخفی) نمایش داده می‌شه
  useEffect(() => {
    if (isHiddenRoute) return;

    const alreadyShown =
      typeof window !== "undefined" &&
      sessionStorage.getItem(SHOWN_FLAG_KEY) === "true";

    if (alreadyShown) return;

    const showTimer = setTimeout(() => {
      setShowBubble(true);
      sessionStorage.setItem(SHOWN_FLAG_KEY, "true");
    }, 2000);

    return () => clearTimeout(showTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // فقط یک‌بار موقع mount شدن کامپوننت اجرا می‌شه، نه با هر تغییر مسیر

  // افکت تایپ‌رایتر
  useEffect(() => {
    if (!showBubble) return;

    let index = 0;
    const typeInterval = setInterval(() => {
      index++;
      setTypedText(FULL_MESSAGE.slice(0, index));
      if (index >= FULL_MESSAGE.length) {
        clearInterval(typeInterval);
      }
    }, TYPE_SPEED_MS);

    return () => clearInterval(typeInterval);
  }, [showBubble]);

  if (isHiddenRoute) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* دایره‌ی شناور */}
      <button
        onClick={() => router.push("/chat")}
        className="relative w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-xl flex items-center justify-center hover:scale-105 transition-transform"
        aria-label="دستیار استایل"
      >
        <span className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 animate-ping opacity-40" />
        <Sparkles className="w-5 h-5 text-white relative z-10" />
      </button>

      {/* حباب پیام - بالا و چپِ دایره - فقط یک‌بار در کل سشن */}
      {showBubble && !closed && (
        <div
          dir="rtl"
          className="absolute bottom-[56px] right-[56px] w-[min(240px,calc(100vw-100px))] rounded-2xl rounded-br-md bg-white dark:bg-neutral-800 shadow-lg border border-neutral-200 dark:border-neutral-700 px-4 py-3 text-sm leading-6 text-neutral-800 dark:text-neutral-100 animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setClosed(true);
            }}
            className="absolute -top-2 -left-2 w-5 h-5 flex items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
            aria-label="بستن پیام"
          >
            <X className="w-3 h-3" />
          </button>

          <span onClick={() => router.push("/chat")} className="cursor-pointer">
            {typedText}
            {typedText.length < FULL_MESSAGE.length && (
              <span className="inline-block w-[2px] h-4 bg-neutral-500 ml-0.5 align-middle animate-pulse" />
            )}
          </span>
        </div>
      )}
    </div>
  );
}