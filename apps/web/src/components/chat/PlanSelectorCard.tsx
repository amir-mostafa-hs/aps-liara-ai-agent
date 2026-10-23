"use client";

import React, { useId, useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

export interface PlanTier {
  plan_id: string;
  name_fa: string;
  ram: string;
  cpu: string;
  disk: string;
  price_monthly: number;
  is_recommended: boolean;
}

interface PlanSelectorCardProps {
  databases: Array<{
    db_type: string;
    driver_or_orm: string;
    default_port: number;
    suggested_env_vars?: string[];
  }>;
  onDatabaseCreated: (result: {
    db_name: string;
    db_type: string;
    plan_id: string;
    internal_host: string;
    port: number;
    suggested_env_vars: Record<string, string>;
  }) => void;
  onCancel?: () => void;
  disabled?: boolean;
}

export const DEFAULT_PLANS: PlanTier[] = [
  {
    plan_id: "ir-standard-1",
    name_fa: "پایه (اقتصادی)",
    ram: "512 مگابایت",
    cpu: "0.25 هسته",
    disk: "10 گیگابایت SSD",
    price_monthly: 60000,
    is_recommended: false,
  },
  {
    plan_id: "ir-standard-2",
    name_fa: "استاندارد",
    ram: "1 گیگابایت",
    cpu: "0.5 هسته",
    disk: "20 گیگابایت SSD",
    price_monthly: 120000,
    is_recommended: true,
  },
  {
    plan_id: "ir-standard-4",
    name_fa: "حرفه‌ای",
    ram: "2 گیگابایت",
    cpu: "1 هسته",
    disk: "40 گیگابایت SSD",
    price_monthly: 240000,
    is_recommended: false,
  },
];

export function PlanSelectorCard({
  databases,
  onDatabaseCreated,
  onCancel,
  disabled = false,
}: PlanSelectorCardProps) {
  const widgetId = useId();
  const primaryDb = databases[0] || {
    db_type: "postgres",
    driver_or_orm: "pg",
    default_port: 5432,
  };

  const [dbName, setDbName] = useState(
    `app-${primaryDb.db_type}-${Math.random().toString(36).substring(2, 6)}`
  );
  const [selectedPlan, setSelectedPlan] = useState<string>("ir-standard-2");
  const [plans, setPlans] = useState<PlanTier[]>(DEFAULT_PLANS);
  const [loading, setLoading] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);

  useEffect(() => {
    fetch("/api/liara/plans")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.plans) && data.plans.length > 0) {
          setPlans(data.plans);
        }
      })
      .catch(() => {});
  }, []);

  const handleCreate = async () => {
    if (!dbName.trim()) {
      setError("لطفاً یک نام معتبر برای پایگاه‌داده وارد کنید.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/liara/databases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dbName: dbName.trim(),
          dbType: primaryDb.db_type,
          planId: selectedPlan,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "خطا در ایجاد پایگاه‌داده");
      }

      setCreated(true);
      onDatabaseCreated({
        db_name: data.db_name,
        db_type: data.db_type,
        plan_id: data.plan_id,
        internal_host: data.internal_host,
        port: data.port,
        suggested_env_vars: data.suggested_env_vars || {},
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (cancelled) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-3 text-xs font-mono text-zinc-400">
        ساخت دیتابیس توسط کاربر لغو گردید.
      </div>
    );
  }

  if (created) {
    return (
      <article className="relative overflow-hidden rounded-lg border border-emerald-500/30 bg-emerald-500/[.04] p-5 shadow-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/state-success.webp"
          alt=""
          className="absolute inset-y-0 left-0 h-full w-1/2 object-cover opacity-80 [mask-image:linear-gradient(to_right,#000_30%,transparent)] pointer-events-none"
        />
        <div className="relative ml-auto w-full text-right sm:w-3/5 space-y-1">
          <h3 className="font-bold text-emerald-300 text-base">دیتابیس آماده شد</h3>
          <p className="t">
            پایگاه‌داده <b className="text-emerald-200">{dbName}</b> با موفقیت ایجاد شد و اطلاعات اتصال در متغیرها تنظیم گردید.
          </p>
        </div>
      </article>
    );
  }

  return (
    <article className="card w-full !items-stretch flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/icon-db.webp" alt="" className="ico fl !w-10 !h-10" />
          <div>
            <h3 className="font-bold text-zinc-100 text-base">
              پلن دیتابیس {primaryDb.db_type.toUpperCase()}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              درایور شناسایی‌شده: <code className="text-liara font-mono">{primaryDb.driver_or_orm}</code> (پورت {primaryDb.default_port})
            </p>
          </div>
        </div>
        <span className="pill border border-liara/30 bg-liara/10 text-liara">
          تأیید اپراتور
        </span>
      </div>

      {/* Database Name */}
      <div className="space-y-1.5">
        <label htmlFor={`${widgetId}-database-host`} className="text-xs text-zinc-400 font-medium">نام هاست دیتابیس در لیارا:</label>
        <input
          id={`${widgetId}-database-host`}
          type="text"
          dir="ltr"
          value={dbName}
          onChange={(e) => setDbName(e.target.value)}
          disabled={loading || disabled}
          placeholder="e.g. app-postgres-db"
          className="inp"
        />
      </div>

      {/* Plans Grid */}
      <div className="space-y-2">
        <p id={`${widgetId}-database-plan-label`} className="text-sm text-zinc-400 font-medium">انتخاب پلن سخت‌افزاری:</p>
        <div role="group" aria-labelledby={`${widgetId}-database-plan-label`} className="grid sm:grid-cols-3 gap-3">
          {plans.map((p) => {
            const isSelected = selectedPlan === p.plan_id;
            return (
              <button
                key={p.plan_id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => !loading && !disabled && setSelectedPlan(p.plan_id)}
                disabled={loading || disabled}
                className={`plan relative w-full text-right cursor-pointer disabled:cursor-not-allowed ${
                  isSelected
                    ? "border-liara bg-liara/10 shadow-[0_0_20px_-8px_#2cc4f4]"
                    : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <b className="text-zinc-100 text-sm">{p.name_fa}</b>
                  {p.is_recommended && (
                    <span className="pill bg-emerald-400/20 text-emerald-300 border border-emerald-400/40 text-[10px]">
                      پیشنهادی
                    </span>
                  )}
                </div>

                <dl className="mt-3 space-y-1.5">
                  <div className="row">
                    <dt>رم</dt>
                    <dd>{p.ram}</dd>
                  </div>
                  <div className="row">
                    <dt>CPU</dt>
                    <dd>{p.cpu}</dd>
                  </div>
                  <div className="row">
                    <dt>SSD</dt>
                    <dd>{p.disk}</dd>
                  </div>
                </dl>

                <p className="mt-3 text-sm font-bold text-liara">
                  {p.price_monthly ? (
                    <>
                      {p.price_monthly.toLocaleString("fa-IR")} تومان
                      <span className="text-xs font-normal text-zinc-500"> / ماه</span>
                    </>
                  ) : (
                    "رایگان یا بر اساس مصرف"
                  )}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <p role="alert" aria-live="assertive" className="text-sm text-rose-200 bg-rose-500/10 border border-rose-500/30 rounded-lg p-2">
          {error}
        </p>
      )}

      {/* Buttons */}
      <div className="flex items-center gap-2 pt-2">
        <button
          type="button"
          onClick={handleCreate}
          disabled={loading || disabled}
          className="b1 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin text-zinc-950" />}
          <span>ساخت دیتابیس</span>
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={() => {
              setCancelled(true);
              onCancel();
            }}
            disabled={loading || disabled}
            className="b0"
          >
            انصراف
          </button>
        )}
      </div>
    </article>
  );
}
