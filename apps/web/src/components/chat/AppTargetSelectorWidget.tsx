"use client";

import React, { useState } from "react";
import {
  Globe,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Server,
  Cpu,
  Layers,
  ChevronLeft,
} from "lucide-react";
import { DEFAULT_PLANS, PlanTier } from "./PlanSelectorCard";

export interface AppTargetSelectorWidgetProps {
  suggestedAppName?: string;
  detectedPlatform?: string;
  existingApps?: Array<{ name: string; status: string; endpoint?: string }>;
  onSelectExistingApp: (appName: string) => void;
  onCreateNewApp: (appName: string, planId: string) => Promise<{ ok: boolean; error?: string }>;
  disabled?: boolean;
}

export function AppTargetSelectorWidget({
  suggestedAppName = "my-app",
  detectedPlatform = "node",
  existingApps = [],
  onSelectExistingApp,
  onCreateNewApp,
  disabled = false,
}: AppTargetSelectorWidgetProps) {
  const [mode, setMode] = useState<"ask" | "existing" | "new">("ask");

  // Existing App Mode State
  const [selectedExistingName, setSelectedExistingName] = useState<string>(
    existingApps.length > 0 ? existingApps[0].name : ""
  );
  const [customExistingName, setCustomExistingName] = useState<string>("");

  // New App Mode State
  const [newAppName, setNewAppName] = useState<string>(suggestedAppName);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("ir-standard-2");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const cleanSlug = (str: string) =>
    str
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

  const handleConfirmExisting = () => {
    const target = customExistingName.trim() || selectedExistingName.trim();
    if (!target) {
      setErrorMessage("لطفاً یک برنامه انتخاب کنید یا نام آن را وارد نمایید.");
      return;
    }
    setErrorMessage(null);
    onSelectExistingApp(cleanSlug(target));
  };

  const handleCreateNew = async () => {
    const slug = cleanSlug(newAppName);
    if (!slug || slug.length < 3) {
      setErrorMessage("شناسه برنامه باید حداقل ۳ کاراکتر انگلیسی باشد.");
      return;
    }
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const res = await onCreateNewApp(slug, selectedPlanId);
      if (!res.ok) {
        setErrorMessage(res.error || "خطا در ساخت سرویس در لیارا");
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "خطای غیرمنتظره در ساخت برنامه");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-900/90 p-5 shadow-xl flex flex-col gap-4 text-zinc-200">
      {/* Widget Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Globe className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-100">تعیین سرویس مقصد در لیارا</h4>
            <p className="text-[11px] text-zinc-400">
              پلتفرم شناسایی‌شده:{" "}
              <span className="font-mono text-zinc-300 font-semibold">{detectedPlatform}</span>
            </p>
          </div>
        </div>

        {mode !== "ask" && (
          <button
            type="button"
            onClick={() => {
              setMode("ask");
              setErrorMessage(null);
            }}
            disabled={isSubmitting || disabled}
            className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors py-1 px-2 rounded-md hover:bg-zinc-800"
          >
            <span>بازگشت</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Mode 1: Initial Question (Ask) */}
      {mode === "ask" && (
        <div className="flex flex-col gap-3">
          <p className="text-xs leading-relaxed text-zinc-300">
            در فایل‌های پروژه کانفیگ اختصاصی <code className="bg-zinc-800 px-1 py-0.5 rounded text-amber-300 font-mono text-[11px]">liara.json</code> برای اتصال به یک برنامه مشخص یافت نشد.
            <br />
            آیا این اپلیکیشن را قبلاً در حساب لیارای خود ساخته‌اید یا می‌خواهید یک سرویس جدید برای آن ایجاد شود؟
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setMode("existing");
                setErrorMessage(null);
              }}
              disabled={disabled}
              className="flex flex-col items-start gap-2 p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 hover:border-blue-500/60 hover:bg-blue-950/20 transition-all text-right group"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-blue-400" />
                  <span className="text-xs font-semibold text-zinc-200 group-hover:text-blue-300">
                    سرویس موجود در لیارا
                  </span>
                </div>
                <ChevronLeft className="h-3.5 w-3.5 text-zinc-500 group-hover:text-blue-400" />
              </div>
              <span className="text-[11px] text-zinc-400">
                اتصال به یکی از برنامه‌های فعال حساب شما ({existingApps.length} برنامه در دسترس)
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("new");
                setErrorMessage(null);
              }}
              disabled={disabled}
              className="flex flex-col items-start gap-2 p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 hover:border-emerald-500/60 hover:bg-emerald-950/20 transition-all text-right group"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <PlusCircle className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-zinc-200 group-hover:text-emerald-300">
                    ساخت سرویس جدید
                  </span>
                </div>
                <ChevronLeft className="h-3.5 w-3.5 text-zinc-500 group-hover:text-emerald-400" />
              </div>
              <span className="text-[11px] text-zinc-400">
                ایجنت سرویس جدید را با پلن انتخابی شما در لیارا ایجاد و پیکربندی می‌کند
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Mode 2: Select Existing App */}
      {mode === "existing" && (
        <div className="flex flex-col gap-3.5">
          <div className="text-xs text-zinc-300">
            برنامه مورد نظر خود را از میان سرویس‌های فعال لیارا انتخاب کنید یا نام آن را بنویسید:
          </div>

          {existingApps.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-zinc-400">انتخاب از برنامه‌های فعال اکانت:</label>
              <select
                value={selectedExistingName}
                onChange={(e) => {
                  setSelectedExistingName(e.target.value);
                  setCustomExistingName("");
                }}
                disabled={disabled}
                className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
              >
                {existingApps.map((app) => (
                  <option key={app.name} value={app.name}>
                    {app.name} ({app.status === "running" ? "فعال" : app.status})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl">
              هیچ برنامه فعالی در اکانت شما یافت نشد. می‌توانید نام برنامه را به صورت دستی وارد کنید یا بازگشته و سرویس جدید بسازید.
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-zinc-400">یا نام اپلیکیشن را دستی وارد کنید:</label>
            <input
              type="text"
              value={customExistingName}
              onChange={(e) => setCustomExistingName(e.target.value)}
              placeholder="مثال: my-production-app"
              dir="ltr"
              disabled={disabled}
              className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <button
            type="button"
            onClick={handleConfirmExisting}
            disabled={disabled}
            className="mt-2 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-md shadow-blue-900/30"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>تأیید و اتصال به این سرویس</span>
          </button>
        </div>
      )}

      {/* Mode 3: Create New App */}
      {mode === "new" && (
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-zinc-300 font-medium">
              نام / شناسه اپلیکیشن در لیارا (App ID):
            </label>
            <input
              type="text"
              value={newAppName}
              onChange={(e) => setNewAppName(e.target.value)}
              placeholder="مثال: my-nodejs-service"
              dir="ltr"
              disabled={isSubmitting || disabled}
              className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 font-mono"
            />
            <p className="text-[10px] text-zinc-500">
              آدرس دسترسی پس از دپلوی:{" "}
              <span dir="ltr" className="font-mono text-zinc-400">
                https://{cleanSlug(newAppName) || "your-app"}.liara.run
              </span>
            </p>
          </div>

          {/* Plan Selector Cards */}
          <div className="flex flex-col gap-1.5 pt-1">
            <label className="text-[11px] text-zinc-300 font-medium flex items-center justify-between">
              <span>انتخاب پلن سخت‌افزاری برنامه:</span>
              <span className="text-[10px] text-zinc-500">قابل ارتقا در هر زمان</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {DEFAULT_PLANS.slice(0, 3).map((plan) => {
                const isSelected = plan.plan_id === selectedPlanId;
                return (
                  <div
                    key={plan.plan_id}
                    onClick={() => !isSubmitting && setSelectedPlanId(plan.plan_id)}
                    className={`cursor-pointer rounded-xl border p-2.5 flex flex-col gap-1.5 transition-all relative ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-950/20 shadow-sm"
                        : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700"
                    }`}
                  >
                    {plan.is_recommended && (
                      <span className="absolute -top-2 left-2 bg-emerald-500 text-zinc-950 text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                        پیشنهادی
                      </span>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-200">{plan.name_fa}</span>
                      <span className="text-[10px] font-mono text-zinc-400">{plan.plan_id}</span>
                    </div>

                    <div className="text-[11px] text-zinc-400 flex flex-col gap-0.5">
                      <div className="flex items-center gap-1">
                        <Cpu className="h-3 w-3 text-zinc-500" />
                        <span>{plan.ram} رم | {plan.cpu}</span>
                      </div>
                    </div>

                    <div className="text-xs font-semibold text-emerald-400 pt-1 border-t border-zinc-800/80">
                      {plan.price_monthly.toLocaleString("fa-IR")} تومان/ماه
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={handleCreateNew}
            disabled={isSubmitting || disabled}
            className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50 shadow-md shadow-emerald-900/30"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                در حال ساخت سرویس در لیارا...
              </span>
            ) : (
              <>
                <PlusCircle className="h-4 w-4" />
                <span>تأیید و ساخت سرویس در لیارا</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
