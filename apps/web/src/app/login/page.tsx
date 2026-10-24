"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [demoCredentials, setDemoCredentials] = useState<{ username: string; password: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/demo-credentials", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (data.available && typeof data.username === "string" && typeof data.password === "string") {
          setDemoCredentials({ username: data.username, password: data.password });
        }
      })
      .catch(() => {});
  }, []);

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
    <div className="h-full w-full grid lg:grid-cols-2 bg-[#101719] bg-grid text-zinc-200">
      {/* Form side */}
      <main className="relative grid place-items-center p-6 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/bg-cyan.webp"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
        />
        <div className="relative w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-950/95 backdrop-blur p-6 sm:p-8 shadow-xl shadow-black/20">
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
            <div role="alert" aria-live="assertive" className="mb-6 flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {demoCredentials && (
            <section aria-labelledby="demo-account-title" className="mb-6 rounded-lg border border-liara/30 bg-liara/10 p-4">
              <h2 id="demo-account-title" className="text-sm font-semibold text-zinc-100">ورود آزمایشی</h2>
              <p className="mt-1 text-xs leading-6 text-zinc-300">
                این حساب عمومی و مشترک است و به توکن Liara سرور دسترسی ندارد. برای حفظ امنیت، توکن یا اطلاعات خصوصی خود را در آن وارد نکنید.
              </p>
              <dl className="mt-3 grid gap-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-zinc-400">نام کاربری</dt>
                  <dd dir="ltr" className="font-mono text-zinc-100">{demoCredentials.username}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-zinc-400">رمز عبور</dt>
                  <dd dir="ltr" className="break-all font-mono text-zinc-100">{demoCredentials.password}</dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={() => {
                  setUsername(demoCredentials.username);
                  setPassword(demoCredentials.password);
                  setError(null);
                }}
                className="mt-3 min-h-10 w-full rounded-lg border border-liara/40 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-liara/50"
              >
                استفاده از حساب آزمایشی
              </button>
            </section>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block">
              <span className="text-xs font-mono text-zinc-400">نام کاربری</span>
              <input
                type="text"
                dir="ltr"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="mt-1.5 w-full rounded-lg bg-zinc-900 border border-zinc-700 px-3.5 py-3 font-mono text-base text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-liara focus:ring-2 focus:ring-liara/40 transition-colors"
                placeholder="admin"
              />
            </label>

            <label className="block">
              <span className="text-xs font-mono text-zinc-400">رمز عبور</span>
              <input
                type="password"
                dir="ltr"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="mt-1.5 w-full rounded-lg bg-zinc-900 border border-zinc-700 px-3.5 py-3 font-mono text-base text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-liara focus:ring-2 focus:ring-liara/40 transition-colors"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex min-h-11 items-center justify-center gap-2 rounded-lg bg-gradient-to-l from-liara to-mint py-2.5 font-semibold text-zinc-950 hover:brightness-110 focus:outline-none disabled:opacity-50 transition-all cursor-pointer shadow-sm"
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
            <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-mint"></span>
            نشست شما در کوکی امن (HttpOnly) نگهداری می‌شود تا عملیات زیرساختی ناخواسته اجرا نشود.
          </p>
        </div>
      </main>

      {/* Hero side */}
      <aside className="relative hidden lg:grid place-items-center overflow-hidden border-r border-zinc-800 bg-zinc-950/80">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/login-hero.webp"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#101719] via-[#101719]/80 to-transparent p-10 pt-32">
          <h2 className="text-xl font-bold leading-9 text-zinc-100">زیرساخت خود را با یک گفت‌وگو مدیریت کنید</h2>
          <p className="mt-1 text-xs leading-6 text-zinc-400">دپلوی، رفع خطا و پایش سرویس‌ها، همه با تأیید شما.</p>
        </div>
      </aside>
    </div>
  );
}
