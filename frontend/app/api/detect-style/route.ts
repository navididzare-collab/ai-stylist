import { NextResponse } from "next/server";
import { ProxyAgent, setGlobalDispatcher } from "undici";

// v2rayN proxy port. Change this if you change the local port in v2rayN settings.
const PROXY_URL = "http://127.0.0.1:10808";
setGlobalDispatcher(new ProxyAgent(PROXY_URL));

export async function POST(req: Request) {
  try {
    const { text, hasActiveOutfit, previousProfileSummary } = await req.json();

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      console.error("OPENROUTER_API_KEY تعریف نشده - فایل frontend/.env.local رو چک کنید");
      return NextResponse.json({
        isStyleRequest: false,
        profile: {},
        resetOutfitContext: true,
        wantsNewProfile: false,
        debugError: "missing_api_key",
      });
    }

    const contextBlock = hasActiveOutfit
      ? `

توجه: کاربر در حال حاضر وسط یک گفتگوی «ست کردن لباس» فعال است. اطلاعاتی که تا الان از او گرفته شده:
${previousProfileSummary || "(اطلاعاتی ثبت نشده)"}

نکته‌ی مهم: کاربر معمولاً به محصول اصلی یا آیتم‌های قبلی با اسم دقیق‌شون اشاره نمی‌کنه، بلکه با توصیف کلی و دسته‌بندی (مثلاً «همون لباس دکمه‌ای»، «شلوارش»، «کفشش») بهشون اشاره می‌کنه. اگر توصیف کاربر با دسته‌بندی/نوع محصول اصلی یا آیتم‌های قبلی همخوانی داره (حتی تقریبی و غیردقیق)، این را قویاً نشانه‌ی ادامه در نظر بگیر، نه یک درخواست جدید.

باید مشخص کنی که آیا پیام تازه‌ی کاربر ادامه‌ی طبیعی همین ست‌بندی است (مثلاً یک آیتم دیگر برای همین ست می‌خواهد، یا به یکی از آیتم‌های قبلی با توصیف کلی اشاره می‌کند، یا سوال مرتبط دیگری درباره‌ی همین محصول/ست می‌پرسد) یا اینکه کاربر صراحتاً گفته مشخصات فیزیکی‌اش (جنسیت، قد، وزن) عوض شده، یا موضوع پیام کاملاً بی‌ربط به context قبلی و درباره‌ی یک محصول/مناسبت کاملاً متفاوت و مستقل است.

پیش‌فرض را روی «ادامه‌ی گفتگو» (resetOutfitContext: false) بگذار؛ فقط در صورت وجود نشانه‌ی صریح و قوی از تغییر مشخصات یا موضوع کاملاً بی‌ربط، true بگذار.`
      : "";

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "AI Stylist",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        max_tokens: 300,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: `پیام کاربر را بررسی کن و دقیقاً یک JSON با این ساختار برگردان (بدون هیچ توضیح اضافه، بدون Markdown):

{
  "isStyleRequest": true یا false,
  "gender": "male" یا "female" یا null,
  "skinTone": "fair" یا "tan" یا "dark" یا null,
  "height": "150-160" یا "160-170" یا "170-180" یا "180+" یا null,
  "weight": "30-50" یا "50-70" یا "70-90" یا "90+" یا null,
  "occasion": "yes" یا "no" یا null,
  "occasionDetail": رشته متنی یا null,
  "resetOutfitContext": true یا false,
  "wantsNewProfile": true یا false
}

توضیحات:
- "isStyleRequest": آیا پیام کاربر درخواست پیشنهاد استایل، لباس یا ست کردن است؟
- "gender": فقط اگر از متن مشخص است (مثلاً با کلماتی مثل آقا، پسر، مرد، خانم، دختر، زن) مقداردهی کن، وگرنه null.
- "skinTone": فقط اگر کاربر صراحتاً درباره‌ی رنگ پوستش چیزی گفته (مثلاً «پوست روشن/سفید» = fair، «پوست برنزه/گندمی» = tan، «پوست تیره/سبزه» = dark)، وگرنه null.
- "height" و "weight": فقط اگر عددی برای قد یا وزن در متن ذکر شده، به بازه‌ی مناسب تبدیل کن، وگرنه null.
- "occasion": هر جایی که کاربر مشخص کرده لباس قراره برای چه کاری، چه مکانی یا چه فعالیتی استفاده بشه را به‌عنوان مناسبت در نظر بگیر. این شامل مناسبت‌های رسمی (مهمونی، عروسی، مصاحبه، جشن، مراسم) و همچنین فعالیت‌ها، مکان‌ها و موقعیت‌های روزمره یا ورزشی می‌شود (مثلاً: ورزشگاه، فوتبال، باشگاه، دویدن، پیاده‌روی، سرکار، کلاس، دانشگاه، مسافرت، قرار، جلسه، خرید، مهمانی خانوادگی). در همه‌ی این موارد مقدار "yes" بگذار و خودِ آن فعالیت یا موقعیت را عیناً در "occasionDetail" بنویس. فقط اگر کاربر صراحتاً گفته مناسبت یا هدف خاصی ندارد (مثلاً "فقط یه لباس معمولی می‌خوام" یا "مناسبت خاصی ندارم")، "no" بگذار. اگر هیچ اشاره‌ای به هدف یا مناسبت نشده، null بگذار.
- "resetOutfitContext": اگر در ادامه‌ی این پیام توضیحی درباره‌ی «زمینه‌ی ست فعال» آمده باشد، طبق آن تصمیم بگیر؛ در غیر این صورت (وقتی زمینه‌ی فعالی وجود ندارد) مقدار false بگذار و اهمیتی ندارد.
- "wantsNewProfile": این فیلد کاملاً مستقل از resetOutfitContext است و فقط باید true باشه اگر کاربر صراحتاً و به‌روشنی خواسته مشخصات فیزیکی (جنسیت/قد/وزن/رنگ پوست/مناسبت) که قبلاً ثبت شده کنار گذاشته بشه و از نو پرسیده بشه — مثلاً می‌گه «برای یه نفر دیگه می‌خوام»، «این‌بار واسه‌ی خواهرم/برادرم/مامانم/دوستمه»، «مشخصاتم عوض شده»، «دوباره از اول بپرس»، «قدم/وزنم عوض شده». اگر پیام فقط یک درخواست معمولیِ لباس/ست جدیده و اشاره‌ی صریحی به تغییر مشخصات یا شخص دیگه نداره، حتماً false بگذار. پیش‌فرض همیشه false است؛ فقط با نشونه‌ی خیلی صریح true بگذار.${contextBlock}

پیام کاربر: "${text}"`,
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenRouter API error:", response.status, JSON.stringify(data));
      return NextResponse.json({
        isStyleRequest: false,
        profile: {},
        resetOutfitContext: true,
        wantsNewProfile: false,
        debugError: data,
      });
    }

    const raw = data?.choices?.[0]?.message?.content;
    console.log("detect-style raw answer:", raw);

    let parsed: any = {};
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error("JSON parse error on detect-style response:", raw);
    }

    const profile: Record<string, string> = {};
    if (parsed.gender) profile.gender = parsed.gender;
    if (parsed.skinTone) profile.skinTone = parsed.skinTone;
    if (parsed.height) profile.height = parsed.height;
    if (parsed.weight) profile.weight = parsed.weight;
    if (parsed.occasion) profile.occasion = parsed.occasion;
    if (parsed.occasionDetail) profile.occasionDetail = parsed.occasionDetail;

    return NextResponse.json({
      isStyleRequest: !!parsed.isStyleRequest,
      profile,
      // اگر زمینه‌ی فعالی وجود نداشته، این مقدار بی‌اهمیته و true فرض می‌شه
      // تا مسیر عادی (بررسی isStyleRequest) طی بشه.
      resetOutfitContext: hasActiveOutfit ? !!parsed.resetOutfitContext : true,
      // پیش‌فرض false: فقط با نشونه‌ی صریح مدل این رو true می‌کنه.
      wantsNewProfile: !!parsed.wantsNewProfile,
    });
  } catch (error) {
    console.error("detect-style exception:", error);
    return NextResponse.json({ isStyleRequest: false, profile: {}, resetOutfitContext: true, wantsNewProfile: false });
  }
}