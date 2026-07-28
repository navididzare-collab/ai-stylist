"use client";
import { useEffect, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { sendMessage, ChatHistoryItem } from "@/services/chat";
import { getProduct } from "@/services/api";
import { useTheme } from "@/components/theme/ThemeProvider";
import TryOnModal from "@/components/tryon/TryOnModal";
import OutfitTryOnModal from "@/components/tryon/OutfitTryOnModal";
import StyleQuizModal, {
  StyleQuizAnswers,
} from "@/components/chat/StyleQuizModal";

interface Product {
  id: number;
  title: string;
  price: number;
  image_url?: string;
}

interface FullProductDetails {
  id: number;
  name: string;
  brand?: string;
  category?: string;
  color?: string;
  gender?: string;
  season?: string;
  occasion?: string;
  material?: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  products?: Product[];
  time: string;
  isError?: boolean;
  outfitCombo?: {
    productIds: number[];
    titles: string[];
  };
}

interface OutfitContextData {
  product: FullProductDetails;
  suggested: { id: number; name: string }[];
}

const STARTER_PROMPTS = [
  "استایل رسمی مردانه",
  "استایل کژوال زنانه",
];

const REQUIRED_FIELDS: (keyof StyleQuizAnswers)[] = [
  "gender",
  "skinTone",
  "height",
  "weight",
  "occasion",
];

const GENDER_LABELS: Record<string, string> = {
  male: "مرد",
  female: "زن",
  unspecified: "نامشخص",
};
const SKIN_LABELS: Record<string, string> = {
  fair: "کرم",
  tan: "برنزه",
  dark: "تیره",
  unspecified: "نامشخص",
};
const HEIGHT_LABELS: Record<string, string> = {
  "150-160": "۱۵۰ الی ۱۶۰ سانتی‌متر",
  "160-170": "۱۶۰ الی ۱۷۰ سانتی‌متر",
  "170-180": "۱۷۰ الی ۱۸۰ سانتی‌متر",
  "180+": "۱۸۰ سانتی‌متر به بالا",
  unspecified: "نامشخص",
};
const WEIGHT_LABELS: Record<string, string> = {
  "30-50": "۳۰ الی ۵۰ کیلوگرم",
  "50-70": "۵۰ الی ۷۰ کیلوگرم",
  "70-90": "۷۰ الی ۹۰ کیلوگرم",
  "90+": "بالای ۹۰ کیلوگرم",
  unspecified: "نامشخص",
};
const OCCASION_LABELS: Record<string, string> = {
  yes: "دارد",
  no: "ندارد",
  any: "فرقی نمی‌کند",
};

function buildProfileBlock(profile: StyleQuizAnswers): string {
  const lines: string[] = [];

  if (profile.gender) lines.push(`جنسیت: ${GENDER_LABELS[profile.gender] ?? profile.gender}`);
  if (profile.skinTone) lines.push(`رنگ پوست: ${SKIN_LABELS[profile.skinTone] ?? profile.skinTone}`);
  if (profile.height) lines.push(`قد: ${HEIGHT_LABELS[profile.height] ?? profile.height}`);
  if (profile.weight) lines.push(`وزن: ${WEIGHT_LABELS[profile.weight] ?? profile.weight}`);
  if (profile.occasion) {
    const occasionLine =
      profile.occasion === "yes" && profile.occasionDetail
        ? `مناسبت خاص: بله - ${profile.occasionDetail}`
        : `مناسبت خاص: ${OCCASION_LABELS[profile.occasion] ?? profile.occasion}`;
    lines.push(occasionLine);
  }

  if (lines.length === 0) return "";
  return `\n\n[اطلاعات مشتری]\n${lines.join("\n")}`;
}

function buildProfileSummary(profile: StyleQuizAnswers): string {
  const parts: string[] = [];
  if (profile.gender) parts.push(`جنسیت: ${GENDER_LABELS[profile.gender] ?? profile.gender}`);
  if (profile.skinTone) parts.push(`رنگ پوست: ${SKIN_LABELS[profile.skinTone] ?? profile.skinTone}`);
  if (profile.height) parts.push(`قد: ${HEIGHT_LABELS[profile.height] ?? profile.height}`);
  if (profile.weight) parts.push(`وزن: ${WEIGHT_LABELS[profile.weight] ?? profile.weight}`);
  if (profile.occasion === "yes" && profile.occasionDetail) {
    parts.push(`مناسبت/کاربرد فعلی: ${profile.occasionDetail}`);
  } else if (profile.occasion) {
    parts.push(`مناسبت: ${OCCASION_LABELS[profile.occasion] ?? profile.occasion}`);
  }
  return parts.join(" - ");
}

function buildProductDetailsBlock(product: FullProductDetails): string {
  const lines: string[] = [];
  lines.push(`نام: ${product.name}`);
  if (product.brand) lines.push(`برند: ${product.brand}`);
  if (product.category) lines.push(`دسته‌بندی: ${product.category}`);
  if (product.color) lines.push(`رنگ: ${product.color}`);
  if (product.material) lines.push(`جنس: ${product.material}`);
  if (product.gender) lines.push(`جنسیت: ${product.gender}`);
  if (product.season) lines.push(`فصل: ${product.season}`);
  if (product.occasion) lines.push(`مناسبت: ${product.occasion}`);
  return `\n\n[مشخصات دقیق محصول انتخاب‌شده]\n${lines.join("\n")}`;
}

function buildOutfitContextBlock(context: OutfitContextData): string {
  const lines: string[] = [];
  const p = context.product;
  lines.push(
    `محصول اصلی: ${p.name}${p.category ? ` (دسته‌بندی: ${p.category})` : ""}`
  );

  if (context.suggested.length > 0) {
    const names = context.suggested.map((s) => s.name).join("، ");
    lines.push(`آیتم‌هایی که قبلاً برای ست کردن با این محصول پیشنهاد شده (این‌ها را دیگر پیشنهاد نده): ${names}`);
  } else {
    lines.push("هنوز هیچ آیتمی برای ست کردن با این محصول پیشنهاد داده نشده.");
  }

  return `\n\n[زمینه‌ی ست قبلی]\n${lines.join("\n")}`;
}

interface StyleDetectionResult {
  isStyleRequest: boolean;
  profile: Partial<StyleQuizAnswers>;
  resetOutfitContext: boolean;
  wantsNewProfile: boolean;
}

async function detectStyleRequest(
  text: string,
  opts?: { hasActiveOutfit?: boolean; previousProfileSummary?: string }
): Promise<StyleDetectionResult> {
  try {
    const res = await fetch("/api/detect-style", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        hasActiveOutfit: !!opts?.hasActiveOutfit,
        previousProfileSummary: opts?.previousProfileSummary ?? "",
      }),
    });
    const data = await res.json();
    return {
      isStyleRequest: !!data.isStyleRequest,
      profile: data.profile ?? {},
      resetOutfitContext: data.resetOutfitContext === true,
      wantsNewProfile: !!data.wantsNewProfile,
    };
  } catch (error) {
    console.error("style detection failed:", error);
    return { isStyleRequest: false, profile: {}, resetOutfitContext: false, wantsNewProfile: false };
  }
}

function now() {
  return new Date().toLocaleTimeString("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AssistantAvatar({ dark }: { dark: boolean }) {
  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
        dark ? "bg-white" : "bg-neutral-900"
      }`}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill={dark ? "#111111" : "#F2A93B"}>
        <path d="M12 2l2.2 6.2L20.5 10l-6.3 1.8L12 18l-2.2-6.2L3.5 10l6.3-1.8L12 2z" />
      </svg>
    </div>
  );
}

function DoubleCheck({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M2 12l4 4L15 7" />
      <path d="M9 12l4 4L22 7" />
    </svg>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-1 py-2">
      <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-bounce" />
    </div>
  );
}

function ProductTile({
  product,
  dark,
  onTryOn,
}: {
  product: Product;
  dark: boolean;
  onTryOn: (product: Product) => void;
}) {
  return (
    <div className="flex w-24 shrink-0 flex-col items-center gap-1.5 sm:w-28">
      <Link
        href={`/products/${product.id}`}
        className="flex flex-col items-center gap-2 transition hover:opacity-80"
      >
        <div
          className={`flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border sm:h-28 sm:w-28 ${
            dark ? "border-neutral-700 bg-neutral-800" : "border-neutral-200 bg-neutral-50"
          }`}
        >
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image_url} alt={product.title} className="h-full w-full object-cover" />
          ) : (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className={dark ? "text-neutral-500" : "text-neutral-300"}
            >
              <path d="M20 7L12 3 4 7m16 0v10l-8 4m8-14l-8 4m0 10l-8-4V7m8 10V11m0 0L4 7" />
            </svg>
          )}
        </div>
        <p
          className={`line-clamp-1 text-center text-xs font-medium ${
            dark ? "text-neutral-300" : "text-neutral-700"
          }`}
        >
          {product.title}
        </p>
      </Link>

      <button
        onClick={() => onTryOn(product)}
        className={`text-[10px] font-semibold rounded-full px-2 py-1 transition ${
          dark
            ? "bg-neutral-800 text-neutral-200 hover:bg-neutral-700"
            : "bg-neutral-900 text-white hover:bg-neutral-800"
        }`}
      >
       میخوای ببینی رو تنت چجوریه ؟ کلیک کن✨
      </button>
    </div>
  );
}

function ChatPageContent() {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";
  const searchParams = useSearchParams();
  const styleProductId = searchParams.get("productId");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [tryOnProduct, setTryOnProduct] = useState<Product | null>(null);
  const [outfitTryOn, setOutfitTryOn] = useState<{
    productIds: number[];
    titles: string[];
  } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [styleProfile, setStyleProfile] = useState<StyleQuizAnswers>({});
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizInitialAnswers, setQuizInitialAnswers] = useState<Partial<StyleQuizAnswers>>({});
  const pendingTextRef = useRef<string | null>(null);
  const pendingExcludeProductIdRef = useRef<number | null>(null);
  const styleProductTriggeredRef = useRef(false);

  const outfitContextRef = useRef<OutfitContextData | null>(null);

  const historyRef = useRef<ChatHistoryItem[]>([]);
  const MAX_HISTORY_ITEMS = 20;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  useEffect(() => {
    if (!styleProductId || styleProductTriggeredRef.current) return;
    styleProductTriggeredRef.current = true;

    (async () => {
      let productName = "این محصول";
      let detailsBlock = "";
      let fetchedProduct: FullProductDetails | null = null;
      try {
        const product: FullProductDetails | null = await getProduct(styleProductId);
        if (product?.name) productName = product.name;
        if (product) {
          detailsBlock = buildProductDetailsBlock(product);
          fetchedProduct = product;
        }
      } catch (error) {
        console.error("دریافت اطلاعات محصول برای ست کردن با خطا مواجه شد:", error);
      }

      if (fetchedProduct) {
        outfitContextRef.current = { product: fetchedProduct, suggested: [] };
      }

      const text = `کاربر دقیقاً محصول زیر رو انتخاب کرده و می‌خواد براش یک ست مناسب پیدا کنه.${detailsBlock}

دستورالعمل مهم:
- فقط و فقط دقیقاً یک محصول (نه بیشتر، نه کمتر) به‌عنوان مکمل این محصول از بین لیست پیشنهاد بده.
- انتخابت باید کاملاً بر اساس مشخصات دقیق محصول بالا (دسته‌بندی، رنگ، جنسیت، فصل، مناسبت) و مشخصات فیزیکی مشتری باشه، نه یک انتخاب کلی یا رندوم.
- آیتم پیشنهادی باید از نظر دسته‌بندی مکمل باشه: اگر محصول انتخابی پایین‌تنه (شلوار/شلوارک/دامن) است، یک بالاتنه‌ی زیرپوش (تیشرت/پیراهن ساده) پیشنهاد بده؛ اگر بالاتنه‌ی زیرپوش (تیشرت و مشابه) است، یک شلوار مناسب پیشنهاد بده (نه لباس دکمه‌دار رویی، مگر این‌که بعداً صراحتاً درخواست بشه)؛ اگر بالاتنه‌ی رویی/دکمه‌دار (کاپشن/ژاکت/پیراهن روی‌پوش) است، یک شلوار مناسب پیشنهاد بده (نه چیزی که زیرش پوشیده می‌شه، مگر این‌که بعداً صراحتاً درخواست بشه).
- هرگز خودِ همین محصول («${productName}») رو دوباره پیشنهاد نده.`;

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "user",
          text: `می‌خوام برای «${productName}» یه ست مناسب (مثلاً شلوار یا یه لباس مکمل) با توجه به مشخصاتم پیشنهاد بدی.`,
          time: now(),
        },
      ]);

      pendingTextRef.current = text;
      pendingExcludeProductIdRef.current = Number(styleProductId);
      setQuizInitialAnswers({});
      setQuizOpen(true);
    })();
  }, [styleProductId]);

  async function performSend(
    text: string,
    profile: StyleQuizAnswers,
    excludeProductId?: number | null
  ) {
    setLoading(true);
    inputRef.current?.focus();

    const profileBlock = buildProfileBlock(profile);
    const outfitBlock = outfitContextRef.current
      ? buildOutfitContextBlock(outfitContextRef.current)
      : "";
    const finalText = `${text}${profileBlock}${outfitBlock}`;

    const isOutfitFlow = excludeProductId != null || outfitContextRef.current != null;

    const historyForApi = historyRef.current.slice(-MAX_HISTORY_ITEMS);

    try {
      const result = await sendMessage(1, finalText, historyForApi);

      const excludeIds = new Set<number>();
      if (excludeProductId != null) excludeIds.add(excludeProductId);
      if (outfitContextRef.current) {
        excludeIds.add(outfitContextRef.current.product.id);
        outfitContextRef.current.suggested.forEach((s) => excludeIds.add(s.id));
      }

      let filteredProducts = result.products;
      if (excludeIds.size > 0) {
        filteredProducts = filteredProducts?.filter((p) => !excludeIds.has(p.id));
      }
      if (isOutfitFlow) {
        filteredProducts = filteredProducts?.slice(0, 1);
      }

      if (outfitContextRef.current && filteredProducts && filteredProducts.length > 0) {
        outfitContextRef.current.suggested.push(
          ...filteredProducts.map((p) => ({ id: p.id, name: p.title }))
        );
      }

      const productNamesForHistory = filteredProducts?.map((p) => p.title).join("، ");
      historyRef.current.push({ role: "user", content: finalText });
      historyRef.current.push({
        role: "assistant",
        content:
          result.message +
          (productNamesForHistory
            ? `\n(محصولاتی که در این پاسخ پیشنهاد دادم: ${productNamesForHistory})`
            : ""),
      });
      if (historyRef.current.length > MAX_HISTORY_ITEMS) {
        historyRef.current = historyRef.current.slice(-MAX_HISTORY_ITEMS);
      }

      let outfitCombo: ChatMessage["outfitCombo"] = undefined;
      if (
        outfitContextRef.current &&
        filteredProducts &&
        filteredProducts.length === 1
      ) {
        outfitCombo = {
          productIds: [outfitContextRef.current.product.id, filteredProducts[0].id],
          titles: [outfitContextRef.current.product.name, filteredProducts[0].title],
        };
      } else if (
        !isOutfitFlow &&
        result.isOutfitSet === true &&
        filteredProducts &&
        filteredProducts.length >= 2
      ) {
        outfitCombo = {
          productIds: filteredProducts.map((p) => p.id),
          titles: filteredProducts.map((p) => p.title),
        };
      }

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: result.message,
          products: filteredProducts,
          time: now(),
          outfitCombo,
        },
      ]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: "ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کن.",
          isError: true,
          time: now(),
        },
      ]);
    }

    setLoading(false);
  }

  async function handleSend(prefill?: string) {
    const text = (prefill ?? message).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text,
      time: now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setMessage("");
    setLoading(true);

    const hasOutfitContext = outfitContextRef.current != null;

    const { isStyleRequest, profile: extracted, resetOutfitContext, wantsNewProfile } = await detectStyleRequest(
      text,
      hasOutfitContext
        ? {
            hasActiveOutfit: true,
            previousProfileSummary: `${buildProfileSummary(styleProfile)}${
              outfitContextRef.current
                ? ` - محصول اصلی در حال ست‌بندی: ${outfitContextRef.current.product.name}${
                    outfitContextRef.current.product.category
                      ? ` (دسته‌بندی: ${outfitContextRef.current.product.category})`
                      : ""
                  }${
                    outfitContextRef.current.suggested.length > 0
                      ? ` - آیتم(های) قبلاً پیشنهادشده: ${outfitContextRef.current.suggested
                          .map((s) => s.name)
                          .join("، ")}`
                      : ""
                  }`
                : ""
            }`,
          }
        : undefined
    );

    if (hasOutfitContext && !resetOutfitContext) {
      await performSend(text, styleProfile);
      return;
    }

    if (hasOutfitContext && resetOutfitContext) {
      outfitContextRef.current = null;
    }

    if (!isStyleRequest) {
      await performSend(text, styleProfile);
      return;
    }

    const baseProfile: StyleQuizAnswers = wantsNewProfile ? {} : styleProfile;

    const known: StyleQuizAnswers = {};
    const gender = extracted.gender ?? baseProfile.gender;
    if (gender) known.gender = gender;
    const skinTone = extracted.skinTone ?? baseProfile.skinTone;
    if (skinTone) known.skinTone = skinTone;
    const height = extracted.height ?? baseProfile.height;
    if (height) known.height = height;
    const weight = extracted.weight ?? baseProfile.weight;
    if (weight) known.weight = weight;
    const occasion = extracted.occasion ?? baseProfile.occasion;
    if (occasion) known.occasion = occasion;
    const occasionDetail = extracted.occasionDetail ?? baseProfile.occasionDetail;
    if (occasionDetail) known.occasionDetail = occasionDetail;

    const missing = REQUIRED_FIELDS.filter((f) => !(f in known));

    if (missing.length > 0) {
      setLoading(false);
      pendingTextRef.current = text;
      setQuizInitialAnswers(known);
      setQuizOpen(true);
      return;
    }

    setStyleProfile(known);
    await performSend(text, known);
  }

  function handleQuizComplete(answers: StyleQuizAnswers) {
    setQuizOpen(false);
    setStyleProfile(answers);
    const text = pendingTextRef.current;
    const excludeProductId = pendingExcludeProductIdRef.current;
    pendingTextRef.current = null;
    pendingExcludeProductIdRef.current = null;
    if (text) {
      performSend(text, answers, excludeProductId);
    }
  }

  function handleQuizClose() {
    setQuizOpen(false);
    const text = pendingTextRef.current;
    const excludeProductId = pendingExcludeProductIdRef.current;
    pendingTextRef.current = null;
    pendingExcludeProductIdRef.current = null;
    if (text) {
      performSend(text, styleProfile, excludeProductId);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className={`min-h-screen w-full transition-colors ${dark ? "bg-neutral-950" : "bg-[#FAFAF8]"}`}>
      {/* Header */}
      <div
        className={`sticky top-0 z-10 border-b px-4 py-4 backdrop-blur transition-colors sm:px-8 ${
          dark ? "border-neutral-800 bg-neutral-950/90" : "border-neutral-100 bg-[#FAFAF8]/90"
        }`}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${dark ? "bg-white" : "bg-neutral-900"}`}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill={dark ? "#111111" : "#F2A93B"}>
                <path d="M12 2l2.2 6.2L20.5 10l-6.3 1.8L12 18l-2.2-6.2L3.5 10l6.3-1.8L12 2z" />
              </svg>
            </div>
            <div>
              <h1 className={`text-base font-bold sm:text-lg ${dark ? "text-white" : "text-neutral-900"}`}>
                چت با هوش استایلیست ✨
              </h1>
              <p className={`text-xs ${dark ? "text-neutral-400" : "text-neutral-500"}`}>
                هر سوالی درباره استایل، لباس، ست کردن و مد داری بپرس.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="mx-auto max-w-3xl px-4 pb-40 pt-6 sm:px-8">
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-5 py-16 text-center">
            <AssistantAvatar dark={dark} />
            <div>
              <p className={`text-sm font-semibold ${dark ? "text-white" : "text-neutral-900"}`}>سلام 👋</p>
              <p className={`mt-1 max-w-xs text-sm ${dark ? "text-neutral-400" : "text-neutral-500"}`}>
                بگو دنبال چه استایلی هستی تا بهترین گزینه‌ها رو برات پیدا کنم.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="flex flex-col items-end gap-1.5">
                <div
                  className={`max-w-[75%] rounded-2xl rounded-tl-md px-4 py-2.5 text-sm leading-relaxed ${
                    dark ? "bg-white text-neutral-900" : "bg-neutral-900 text-white"
                  }`}
                >
                  {m.text}
                </div>
                <div className={`flex items-center gap-1 pl-1 text-[11px] ${dark ? "text-neutral-500" : "text-neutral-400"}`}>
                  <DoubleCheck />
                  <span>{m.time}</span>
                </div>
              </div>
            ) : (
              <div key={m.id} className="flex items-start gap-3">
                <AssistantAvatar dark={dark} />
                <div className="flex max-w-[85%] flex-1 flex-col gap-3">
                  <p
                    className={`text-sm leading-7 ${
                      m.isError ? "text-red-500" : dark ? "text-neutral-200" : "text-neutral-800"
                    }`}
                  >
                    {m.text}
                  </p>

                  {m.products && m.products.length > 0 && (
                    <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-1">
                      {m.products.map((p) => (
                        <ProductTile key={p.id} product={p} dark={dark} onTryOn={setTryOnProduct} />
                      ))}
                    </div>
                  )}

                  {m.outfitCombo && (
                    <button
                      onClick={() => setOutfitTryOn(m.outfitCombo!)}
                      className={`self-start rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                        dark
                          ? "bg-neutral-800 text-neutral-100 hover:bg-neutral-700"
                          : "bg-neutral-900 text-white hover:bg-neutral-800"
                      }`}
                    >
                      به نظر من این ست بهت میاد، رو خودت امتحانش کن ✨
                    </button>
                  )}

                  <span className={`text-[11px] ${dark ? "text-neutral-500" : "text-neutral-400"}`}>{m.time}</span>
                </div>
              </div>
            )
          )}

          {loading && (
            <div className="flex items-start gap-3">
              <AssistantAvatar dark={dark} />
              <TypingDots />
            </div>
          )}

          {!loading && (
            <div className="flex flex-wrap gap-2 pr-[52px]">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                    dark
                      ? "border-neutral-700 text-neutral-300 hover:bg-neutral-800"
                      : "border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                  }`}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input bar */}
      <div
        className={`fixed inset-x-0 bottom-0 z-10 border-t px-4 py-3 transition-colors sm:px-8 sm:py-4 ${
          dark ? "border-neutral-800 bg-neutral-950" : "border-neutral-100 bg-[#FAFAF8]"
        }`}
      >
        <div className="mx-auto max-w-3xl">
          <div
            className={`flex items-center gap-2 rounded-full border px-2 py-1.5 transition ${
              dark
                ? "border-neutral-700 bg-neutral-900 focus-within:border-neutral-500"
                : "border-neutral-200 bg-white focus-within:border-neutral-300"
            }`}
          >
            <button
              type="button"
              aria-label="افزودن فایل"
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${
                dark ? "text-neutral-400 hover:bg-neutral-800" : "text-neutral-400 hover:bg-neutral-100"
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21.4 11.5L12.5 20.4a5 5 0 01-7.1-7.1l8.9-8.9a3.5 3.5 0 015 5l-8.9 8.9a2 2 0 01-2.8-2.8l8.2-8.2" />
              </svg>
            </button>

            <input
              ref={inputRef}
              className={`flex-1 bg-transparent px-1 py-2 text-sm outline-none ${
                dark ? "text-white placeholder:text-neutral-500" : "text-neutral-800 placeholder:text-neutral-400"
              }`}
              value={message}
              placeholder="سوالتو رو اینجا بنویس..."
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />

            <button
              onClick={() => handleSend()}
              disabled={loading || !message.trim()}
              aria-label="ارسال پیام"
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-40 ${
                dark ? "bg-white text-neutral-900" : "bg-neutral-900 text-white"
              }`}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="-scale-x-100"
              >
                <path d="M22 2L11 13" />
                <path d="M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>

          <p className={`mt-2 text-center text-[11px] ${dark ? "text-neutral-500" : "text-neutral-400"}`}>
            هوش مصنوعی ممکنه اشتباه کنه. همیشه نظر خودت رو هم در نظر بگیر.
          </p>
        </div>
      </div>

      {tryOnProduct && (
        <TryOnModal
          productId={tryOnProduct.id}
          productTitle={tryOnProduct.title}
          onClose={() => setTryOnProduct(null)}
        />
      )}

      {outfitTryOn && (
        <OutfitTryOnModal
          productIds={outfitTryOn.productIds}
          titles={outfitTryOn.titles}
          onClose={() => setOutfitTryOn(null)}
        />
      )}

      {quizOpen && (
        <StyleQuizModal
          initialAnswers={quizInitialAnswers}
          onClose={handleQuizClose}
          onComplete={handleQuizComplete}
        />
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatPageContent />
    </Suspense>
  );
}