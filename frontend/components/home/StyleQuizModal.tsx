"use client";

import { useEffect, useRef, useState } from "react";

export type StyleQuizAnswers = {
  gender?: "male" | "female" | "unspecified";
  skinTone?: "fair" | "tan" | "dark" | "unspecified";
  height?: "150-160" | "160-170" | "170-180" | "180+" | "unspecified";
  weight?: "30-50" | "50-70" | "70-90" | "90+" | "unspecified";
  occasion?: "yes" | "no" | "any";
  occasionDetail?: string;
};

type Option = { value: string; label: string; swatch?: string };
type Step = {
  key: keyof StyleQuizAnswers;
  question: string;
  options: Option[];
  hasDetail?: boolean;
};

const STEPS: Step[] = [
  {
    key: "gender",
    question: "جنسیت شما چیه؟",
    options: [
      { value: "male", label: "مرد" },
      { value: "female", label: "زن" },
      { value: "unspecified", label: "ترجیح می‌دهم نگویم" },
    ],
  },
  {
    key: "skinTone",
    question: "رنگ پوست شما به کدام نزدیک‌تره؟",
    options: [
      { value: "fair", label: "کرم", swatch: "#E9C6A0" },
      { value: "tan", label: "برنزه", swatch: "#C68A55" },
      { value: "dark", label: "تیره", swatch: "#8A5A34" },
      { value: "unspecified", label: "ترجیح می‌دهم نگویم" },
    ],
  },
  {
    key: "height",
    question: "قدتون تقریباً کدومه؟",
    options: [
      { value: "150-160", label: "۱۵۰ الی ۱۶۰" },
      { value: "160-170", label: "۱۶۰ الی ۱۷۰" },
      { value: "170-180", label: "۱۷۰ الی ۱۸۰" },
      { value: "180+", label: "۱۸۰ به بالا" },
      { value: "unspecified", label: "ترجیح می‌دهم نگویم" },
    ],
  },
  {
    key: "weight",
    question: "وزن شما تقریباً کدومه؟",
    options: [
      { value: "30-50", label: "۳۰ الی ۵۰" },
      { value: "50-70", label: "۵۰ الی ۷۰" },
      { value: "70-90", label: "۷۰ الی ۹۰" },
      { value: "90+", label: "بالای ۹۰" },
      { value: "unspecified", label: "ترجیح می‌دهم نگویم" },
    ],
  },
  {
    key: "occasion",
    question: "برای مناسبت خاصی می‌خواید بپوشید؟",
    options: [
      { value: "yes", label: "بله" },
      { value: "no", label: "خیر" },
      { value: "any", label: "مهم نیست" },
    ],
    hasDetail: true,
  },
];

/**
 * حدس ساده از پیام اولیه‌ی کاربر برای رد کردن سوالاتی که خودش قبلاً جواب داده.
 * پیشنهاد می‌شه سمت بک‌اند هم یه استخراج دقیق‌تر (با NLU/LLM) روی متن اصلی انجام بدید
 * و نتیجه رو به initialAnswers پاس بدید؛ این فقط یه fallback ساده‌ی سمت کلاینته.
 */
export function detectKnownAnswers(message: string): Partial<StyleQuizAnswers> {
  const known: Partial<StyleQuizAnswers> = {};
  const text = message.toLowerCase();

  if (/(آقا|پسر|مرد)/.test(text)) known.gender = "male";
  else if (/(خانم|دختر|زن)/.test(text)) known.gender = "female";

  const occasionWords = ["مهمونی", "عروسی", "جشن", "مصاحبه", "مراسم", "میهمونی"];
  const matched = occasionWords.find((w) => text.includes(w));
  if (matched) {
    known.occasion = "yes";
    known.occasionDetail = message.trim();
  }

  return known;
}

interface StyleQuizModalProps {
  initialAnswers?: Partial<StyleQuizAnswers>;
  onComplete: (answers: StyleQuizAnswers) => void;
  onClose: () => void;
}

export default function StyleQuizModal({
  initialAnswers = {},
  onComplete,
  onClose,
}: StyleQuizModalProps) {
  const activeSteps = useRef(
    STEPS.filter((s) => !(s.key in initialAnswers))
  ).current;

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<StyleQuizAnswers>(initialAnswers);
  const [transitioning, setTransitioning] = useState(false);
  const [showOccasionInput, setShowOccasionInput] = useState(false);
  const [occasionText, setOccasionText] = useState("");

  // اگه همه‌ی سوال‌ها از قبل جواب داده شده بودن، اصلاً مودال رو باز نکن
  useEffect(() => {
    if (activeSteps.length === 0) {
      onComplete(initialAnswers as StyleQuizAnswers);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (activeSteps.length === 0) return null;

  const step = activeSteps[idx];
  const isLast = idx === activeSteps.length - 1;

  function commit(value: string) {
    setTransitioning(true);
    setTimeout(() => {
      const next: StyleQuizAnswers = { ...answers, [step.key]: value } as StyleQuizAnswers;
      if (isLast) {
        onComplete(next);
      } else {
        setAnswers(next);
        setIdx((i) => i + 1);
        setShowOccasionInput(false);
        setOccasionText("");
        setTransitioning(false);
      }
    }, 220);
  }

  function handleOptionClick(value: string) {
    if (step.hasDetail && value === "yes") {
      setShowOccasionInput(true);
      return;
    }
    commit(value);
  }

  function handleOccasionSubmit() {
    if (!occasionText.trim()) return;
    setTransitioning(true);
    setTimeout(() => {
      const next: StyleQuizAnswers = {
        ...answers,
        occasion: "yes",
        occasionDetail: occasionText.trim(),
      };
      onComplete(next);
    }, 220);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md px-4">
      <div className="relative w-full max-w-sm rounded-3xl bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl shadow-2xl border border-white/20 dark:border-neutral-700/50 p-6">
        <button
          onClick={onClose}
          aria-label="بستن"
          className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        >
          ✕
        </button>

        {/* progress dots */}
        <div className="flex justify-center gap-1.5 mb-6">
          {activeSteps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === idx
                  ? "w-6 bg-neutral-900 dark:bg-white"
                  : i < idx
                  ? "w-1.5 bg-neutral-400 dark:bg-neutral-500"
                  : "w-1.5 bg-neutral-200 dark:bg-neutral-700"
              }`}
            />
          ))}
        </div>

        <div
          className={`flex flex-col items-center gap-6 transition-all duration-200 ${
            transitioning ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
          }`}
        >
          <h3 className="text-base font-bold text-neutral-900 dark:text-white text-center">
            {step.question}
          </h3>

          <div className="flex flex-wrap justify-center gap-4">
            {step.options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleOptionClick(opt.value)}
                className="group flex flex-col items-center gap-1.5 focus:outline-none"
              >
                <span
                  className="flex h-16 w-16 items-center justify-center rounded-full text-xs font-semibold text-center leading-tight transition-transform duration-200 group-hover:scale-110 group-active:scale-95 shadow-md"
                  style={
                    opt.swatch
                      ? { backgroundColor: opt.swatch }
                      : undefined
                  }
                  {...(!opt.swatch && {
                    className:
                      "flex h-16 w-16 items-center justify-center rounded-full text-xs font-semibold text-center leading-tight transition-transform duration-200 group-hover:scale-110 group-active:scale-95 shadow-md bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100 px-2",
                  })}
                >
                  {!opt.swatch && opt.label}
                </span>
                {opt.swatch && (
                  <span className="text-[11px] text-neutral-600 dark:text-neutral-300">
                    {opt.label}
                  </span>
                )}
              </button>
            ))}
          </div>

          {step.hasDetail && showOccasionInput && (
            <div className="w-full flex items-center gap-2 mt-1 animate-[fadeIn_0.25s_ease]">
              <input
                autoFocus
                value={occasionText}
                onChange={(e) => setOccasionText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleOccasionSubmit()}
                placeholder="مثلاً: مهمونی تولد، عروسی، مصاحبه کاری..."
                className="flex-1 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-2.5 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
              />
              <button
                onClick={handleOccasionSubmit}
                disabled={!occasionText.trim()}
                className="rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-4 py-2.5 text-sm font-semibold disabled:opacity-40 transition"
              >
                تایید
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}