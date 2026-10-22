"use client";

import React, { useState, useEffect } from "react";

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

const DEFAULT_PLANS: PlanTier[] = [
  {
    plan_id: "ir-standard-1",
    name_fa: "اقتصادی",
    ram: "512 MB",
    cpu: "0.25 هسته",
    disk: "10 GB SSD",
    price_monthly: 60000,
    is_recommended: false,
  },
  {
    plan_id: "ir-standard-2",
    name_fa: "استاندارد",
    ram: "1024 MB (1 GB)",
    cpu: "0.5 هسته",
    disk: "20 GB SSD",
    price_monthly: 120000,
    is_recommended: true,
  },
  {
    plan_id: "ir-standard-4",
    name_fa: "حرفه‌ای",
    ram: "2048 MB (2 GB)",
    cpu: "1 هسته",
    disk: "40 GB SSD",
    price_monthly: 240000,
    is_recommended: false,
  },
  {
    plan_id: "ir-standard-8",
    name_fa: "تجاری",
    ram: "4096 MB (4 GB)",
    cpu: "2 هسته",
    disk: "60 GB SSD",
    price_monthly: 480000,
    is_recommended: false,
  },
];

export function PlanSelectorCard({
  databases,
  onDatabaseCreated,
  onCancel,
  disabled = false,
}: PlanSelectorCardProps) {
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

  const dbIcon =
    primaryDb.db_type.includes("postgres")
      ? "🐘"
      : primaryDb.db_type.includes("redis")
      ? "⚡"
      : primaryDb.db_type.includes("mongo")
      ? "🍃"
      : primaryDb.db_type.includes("mysql")
      ? "🐬"
      : "🗄️";

  if (cancelled) {
    return (
      <div className="mt-3 rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        ساخت دیتابیس توسط کاربر لغو گردید.
      </div>
    );
  }

  if (created) {
    return (
      <div className="mt-3 rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4 text-emerald-300">
        <div className="flex items-center gap-2 font-bold text-sm">
          <span>✔</span>
          <span>پایگاه‌داده {dbName} با موفقیت روی لیارا ایجاد شد.</span>
        </div>
        <p className="mt-1 text-xs text-emerald-400/80">
          مشخصات اتصال جهت تزریق خودکار به متغیرهای محیطی برنامه آماده است.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card/60 p-4 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <span className="text-xl">{dbIcon}</span>
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              ایجاد سرویس پایگاه‌داده {primaryDb.db_type.toUpperCase()} روی لیارا
            </h4>
            <p className="text-xs text-muted-foreground">
              درایور شناسایی‌شده: <code className="text-primary">{primaryDb.driver_or_orm}</code> (پورت {primaryDb.default_port})
            </p>
          </div>
        </div>
        <span className="text-xs rounded-full bg-primary/10 text-primary px-2.5 py-0.5 font-medium border border-primary/20">
          تأیید اپراتور الزامی است
        </span>
      </div>

      {/* Database Name Input */}
      <div className="mt-4">
        <label className="block text-xs font-medium text-foreground mb-1">
          شناسه / نام هاست دیتابیس در لیارا:
        </label>
        <input
          type="text"
          value={dbName}
          onChange={(e) => setDbName(e.target.value)}
          disabled={loading || disabled}
          placeholder="e.g. my-postgres-db"
          dir="ltr"
          className="w-full text-left font-mono rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Plan Tiers Selection */}
      <div className="mt-4">
        <label className="block text-xs font-medium text-foreground mb-2">
          انتخاب پلن منابع سخت‌افزاری:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {plans.map((p) => {
            const isSelected = selectedPlan === p.plan_id;
            return (
              <button
                key={p.plan_id}
                type="button"
                onClick={() => setSelectedPlan(p.plan_id)}
                disabled={loading || disabled}
                className={`relative flex flex-col items-start p-3 rounded-xl border text-right transition-all cursor-pointer ${
                  isSelected
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border hover:border-border/80 bg-background/50 hover:bg-background/80"
                }`}
              >
                {p.is_recommended && (
                  <span className="absolute top-2 left-2 text-[10px] bg-primary text-primary-foreground font-semibold px-2 py-0.5 rounded-full">
                    پیشنهادی
                  </span>
                )}
                <div className="flex items-center gap-1.5 font-medium text-xs text-foreground">
                  <span>{p.name_fa}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">({p.plan_id})</span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground space-y-0.5">
                  <div>رم: <span className="font-semibold text-foreground">{p.ram}</span> | پردازنده: <span className="font-semibold text-foreground">{p.cpu}</span></div>
                  <div>دیسک: <span className="font-semibold text-foreground">{p.disk}</span></div>
                </div>
                <div className="mt-2 text-xs font-semibold text-primary">
                  {p.price_monthly.toLocaleString()} تومان / ماه
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-lg bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-400">
          {error}
        </div>
      )}

      {/* Action Button */}
      <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          هزینه بر اساس مصرف دقیق ساعتی در حساب لیارا محاسبه می‌شود.
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setCancelled(true);
              if (onCancel) onCancel();
            }}
            disabled={loading || disabled}
            className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted transition-all cursor-pointer"
          >
            انصراف
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={loading || disabled || !dbName.trim()}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50 cursor-pointer shadow"
          >
            {loading ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                <span>در حال ایجاد در لیارا...</span>
              </>
            ) : (
              <>
                <span>⚡</span>
                <span>ایجاد دیتابیس در لیارا</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

