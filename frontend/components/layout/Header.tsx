export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-[#0B1020]/80 backdrop-blur-2xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-8 h-24 flex items-center justify-between gap-8">

        {/* Logo */}
        <div className="flex items-center gap-4 shrink-0">

          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-300 to-orange-500 flex items-center justify-center text-black font-black text-xl shadow-xl">
            AI
          </div>

          <div>

            <h1 className="text-2xl font-black text-white leading-none">
              AI Style
            </h1>

            <p className="mt-2 text-sm text-gray-400">
              فروشگاه هوشمند مد
            </p>

          </div>

        </div>

        {/* Search */}

        <div className="flex-1 max-w-2xl">

          <div className="relative">

            <input
              type="text"
              placeholder="دنبال چه لباسی می‌گردی؟"
              className="
              w-full
              h-14
              rounded-2xl
              bg-white/5
              border
              border-white/10
              pr-14
              pl-5
              text-base
              text-white
              placeholder:text-gray-500
              outline-none
              transition-all
              focus:border-amber-300
              focus:bg-white/10
              "
            />

            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400">
              🔍
            </span>

          </div>

        </div>

        {/* Actions */}

        <div className="flex items-center gap-4 shrink-0">

          <button
            className="
            h-14
            px-8
            rounded-2xl
            bg-white/5
            border
            border-white/10
            text-white
            font-semibold
            hover:bg-white/10
            transition
            "
          >
            ورود
          </button>

          <button
            className="
            relative
            w-14
            h-14
            rounded-2xl
            bg-gradient-to-r
            from-amber-300
            to-orange-500
            text-xl
            shadow-xl
            transition
            hover:scale-105
            "
          >
            🛒

            <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
              2
            </span>

          </button>

        </div>

      </div>
    </header>
  );
}