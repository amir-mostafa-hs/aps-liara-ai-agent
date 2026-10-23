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
    <div className="h-full w-full grid lg:grid-cols-2 bg-[#0c0c0e] bg-grid text-zinc-200">
      {/* Form side */}
      <main className="relative grid place-items-center p-6 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/bg-cyan.webp"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
        />
        <div className="relative w-full max-w-md rounded-none border border-zinc-800 bg-zinc-950/90 backdrop-blur p-8 shadow-none">
          <div className="flex items-center gap-3 mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/logo.webp"
              alt="لوگوی ایجنت هوشمند لیارا"
              className="ico w-14 h-14"
            />
            <div>
              <h1 className="text-lg font-bold text-zinc-100">ایجنت هوشمند لیارا</h1>
              <p className="text-xs font-mono text-zinc-400">OPERATOR SECURE ACCESS</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 flex items-center gap-2 rounded-none border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-mono text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block">
              <span className="text-xs font-mono text-zinc-400">نام کاربری</span>
              <input
                type="text"
                dir="ltr"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="mt-1.5 w-full rounded-none bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 font-mono text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors"
                placeholder="admin"
              />
            </label>

            <label className="block">
              <span className="text-xs font-mono text-zinc-400">رمز عبور</span>
              <input
                type="password"
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="mt-1.5 w-full rounded-none bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 font-mono text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-none bg-gradient-to-l from-liara to-mint py-2.5 font-mono text-xs font-semibold text-zinc-950 hover:brightness-110 focus:outline-none disabled:opacity-50 transition-all cursor-pointer shadow-sm"
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
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-none bg-mint"></span>
            نشست شما در کوکی امن (HttpOnly) نگهداری می‌شود تا عملیات زیرساختی ناخواسته اجرا نشود.
          </p>
        </div>
      </main>

      {/* Hero side */}
      <aside className="relative hidden lg:grid place-items-center overflow-hidden border-r border-zinc-800 bg-zinc-950/80">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/login-hero.webp"
          alt="Liara Infrastructure Agent"
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0c0c0e] via-[#0c0c0e]/80 to-transparent p-10 pt-32">
          <h2 className="text-xl font-bold leading-9 text-zinc-100">زیرساخت خود را با یک گفت‌وگو مدیریت کنید</h2>
          <p className="mt-1 text-xs leading-6 text-zinc-400">دپلوی، رفع خطا و پایش سرویس‌ها، همه با تأیید شما.</p>
        </div>
      </aside>
    </div>
  );
}
