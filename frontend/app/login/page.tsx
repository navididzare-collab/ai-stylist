"use client";

import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { User, Phone, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/useAuth";
import { loginUser, registerUser } from "@/lib/api/auth";

type Mode = "login" | "register";

const PHONE_LENGTH = 11;
const MIN_PASSWORD_LENGTH = 8;

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const [mode, setMode] = useState<Mode>("login");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function switchMode() {
    setMode((prev) => (prev === "login" ? "register" : "login"));
    setError(null);
    setPassword("");
    setConfirmPassword("");
  }

  function handleFullNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const lettersOnly = e.target.value.replace(
      /[^a-zA-Zا-یآ-ی\s]/g,
      ""
    );
    setFullName(lettersOnly);
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, PHONE_LENGTH);
    setPhone(digitsOnly);
  }

  function validate(): string | null {
    if (mode === "register" && fullName.trim() === "") {
      return "لطفاً نام و نام خانوادگی را وارد کنید.";
    }

    if (phone.length !== PHONE_LENGTH) {
      return `شماره موبایل باید ${PHONE_LENGTH} رقم باشد.`;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return `رمز عبور باید حداقل ${MIN_PASSWORD_LENGTH} کاراکتر باشد.`;
    }

    if (mode === "register" && confirmPassword.length < MIN_PASSWORD_LENGTH) {
      return `تکرار رمز عبور باید حداقل ${MIN_PASSWORD_LENGTH} کاراکتر باشد.`;
    }

    if (mode === "register" && password !== confirmPassword) {
      return "رمز عبور و تکرار آن یکسان نیستند.";
    }

    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const response =
        mode === "login"
          ? await loginUser(phone, password)
          : await registerUser(fullName, phone, password);

      // API حالا {access_token, token_type, user} برمی‌گردونه
      login(
        {
          id: response.user.id,
          fullName: response.user.full_name,
          phone: response.user.phone,
        },
        response.access_token
      );

      router.push(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطایی رخ داد.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-neutral-900 p-6 shadow-sm">
        <h1 className="text-center text-lg font-bold mb-6 text-neutral-900 dark:text-white">
          {mode === "login" ? "ورود به حساب کاربری" : "ساخت حساب کاربری"}
        </h1>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {mode === "register" && (
            <div className="flex items-center gap-2 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2.5">
              <User size={16} className="text-neutral-400" />
              <input
                value={fullName}
                onChange={handleFullNameChange}
                placeholder="نام و نام خانوادگی"
                required
                className="w-full bg-transparent outline-none text-sm"
              />
            </div>
          )}

          <div className="flex items-center gap-2 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2.5">
            <Phone size={16} className="text-neutral-400" />
            <input
              value={phone}
              onChange={handlePhoneChange}
              placeholder="شماره موبایل"
              dir="ltr"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={PHONE_LENGTH}
              required
              className="w-full bg-transparent outline-none text-sm"
            />
          </div>

          <div className="flex items-center gap-2 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2.5">
            <Lock size={16} className="text-neutral-400" />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="رمز عبور"
              type={showPassword ? "text" : "password"}
              required
              minLength={MIN_PASSWORD_LENGTH}
              className="w-full bg-transparent outline-none text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="text-neutral-400 shrink-0"
              tabIndex={-1}
              aria-label={showPassword ? "پنهان کردن رمز عبور" : "نمایش رمز عبور"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {mode === "register" && (
            <div className="flex items-center gap-2 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2.5">
              <Lock size={16} className="text-neutral-400" />
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="تکرار رمز عبور"
                type={showConfirmPassword ? "text" : "password"}
                required
                minLength={MIN_PASSWORD_LENGTH}
                className="w-full bg-transparent outline-none text-sm"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="text-neutral-400 shrink-0"
                tabIndex={-1}
                aria-label={
                  showConfirmPassword ? "پنهان کردن رمز عبور" : "نمایش رمز عبور"
                }
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 py-2.5 text-sm font-medium disabled:opacity-60"
          >
            {loading
              ? "در حال ارسال..."
              : mode === "login"
              ? "ورود"
              : "ایجاد حساب"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-neutral-500 dark:text-neutral-400">
          {mode === "register" ? (
            <>
              قبلاً ثبت‌نام کرده‌ام.{" "}
              <button
                type="button"
                onClick={switchMode}
                className="text-sky-600 dark:text-sky-400 font-semibold hover:underline"
              >
                ورود
              </button>
            </>
          ) : (
            <>
              هنوز ثبت‌نام نکرده‌ام.{" "}
              <button
                type="button"
                onClick={switchMode}
                className="text-sky-600 dark:text-sky-400 font-semibold hover:underline"
              >
                ثبت‌نام
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}