"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "خطا در احراز هویت");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("امکان برقراری ارتباط با سرور وجود ندارد.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full grid lg:grid-cols-2 bg-bg text-zinc-200">
      {/* Form side */}
      <main className="relative grid place-items-center p-6 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/bg-cyan.webp"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none"
        />
        <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-white/[.05] backdrop-blur-2xl p-8 shadow-[0_0_80px_-20px_rgba(44,196,244,.35)]">
          <div className="flex items-center gap-3 mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/logo.webp"
              alt="لوگوی ایجنت هوشمند لیارا"
              className="ico w-16 h-16 drop-shadow-[0_0_14px_rgba(44,196,244,.6)]"
            />
            <div>
              <h1 className="text-xl font-bold text-zinc-100">ایجنت هوشمند لیارا</h1>
              <p className="text-sm text-zinc-400">ورود امن اپراتور</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block">
              <span className="text-sm text-zinc-400">نام کاربری</span>
              <input
                type="text"
                dir="ltr"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="mt-2 w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 font-mono text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-liara focus:ring-2 focus:ring-liara/30 transition-colors"
                placeholder="admin"
              />
            </label>

            <label className="block">
              <span className="text-sm text-zinc-400">رمز عبور</span>
              <input
                type="password"
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="mt-2 w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 font-mono text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-liara focus:ring-2 focus:ring-liara/30 transition-colors"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-liara to-mint py-3 font-bold text-zinc-950 shadow-lg shadow-liara/20 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-liara/50 disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-950" />
                  <span>در حال احراز هویت...</span>
                </>
              ) : (
                "ورود به فضای کاری"
              )}
            </button>
          </form>

          <p className="mt-6 flex gap-2 text-xs leading-6 text-zinc-400">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-mint"></span>
            نشست شما در کوکی امن (HttpOnly) نگهداری می‌شود تا عملیات زیرساختی ناخواسته اجرا نشود.
          </p>
        </div>
      </main>

      {/* Hero side */}
      <aside className="relative hidden lg:grid place-items-center overflow-hidden border-r border-white/10 bg-black/30">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/login-hero.webp"
          alt="Liara Infrastructure Agent"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg via-bg/80 to-transparent p-10 pt-32">
          <h2 className="text-2xl font-bold leading-10 text-zinc-100">زیرساخت خود را با یک گفت‌وگو مدیریت کنید</h2>
          <p className="mt-2 text-sm leading-7 text-zinc-300">دپلوی، رفع خطا و پایش سرویس‌ها، همه با تأیید شما.</p>
        </div>
      </aside>
    </div>
  );
}
