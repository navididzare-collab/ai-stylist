const features = [
  {
    title: "پیشنهاد هوشمند",
    description: "با استفاده از هوش مصنوعی بهترین استایل را دریافت کن.",
    icon: "🤖",
  },
  {
    title: "متناسب با بودجه",
    description: "لباس‌هایی که با بودجه تو هماهنگ هستند نمایش داده می‌شوند.",
    icon: "💰",
  },
  {
    title: "بر اساس فرم بدن",
    description: "پیشنهادها با توجه به فرم بدن و رنگ پوست شخصی‌سازی می‌شوند.",
    icon: "👕",
  },
];

export default function Features() {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-6xl px-6">

        <h2 className="mb-12 text-center text-4xl font-bold">
          چرا AI Stylist؟
        </h2>

        <div className="grid gap-8 md:grid-cols-3">

          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="mb-5 text-5xl">
                {feature.icon}
              </div>

              <h3 className="mb-3 text-2xl font-bold">
                {feature.title}
              </h3>

              <p className="text-gray-600">
                {feature.description}
              </p>
            </div>
          ))}

        </div>
      </div>
    </section>
  );
}