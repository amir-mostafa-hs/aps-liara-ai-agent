"use client";

import React, { useEffect, useState } from "react";
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
import { AppPlan, AppFeaturePlan, AppNetwork, checkAppNameAvailability, formatPlanPrice, loadAppCreationCatalog, recommendAppPlan, recommendFeaturePlan } from "@/lib/app-preflight";
import type { ExistingAppCandidate } from "@/lib/app-creation-workflow";
import { findExistingApp } from "@/lib/app-creation-workflow";

export interface AppTargetSelectorWidgetProps {
  suggestedAppName?: string;
  detectedPlatform?: string;
  teamScope?: { id: string; name: string } | null;
  detectedDatabaseCount?: number;
  existingApps?: Array<{ name: string; status: string; endpoint?: string }>;
  onSelectExistingApp: (appName: string) => void;
  onCreateNewApp: (input: { appName: string; platform: string; planId: string; bundlePlanId: string; networkId: string; teamId: string | null; priceMonthly: number | null; bundlePriceMonthly: number | null }) => Promise<{ ok: boolean; error?: string; recovery?: { service: ExistingAppCandidate } }>;
  disabled?: boolean;
}

export function AppTargetSelectorWidget({
  suggestedAppName = "my-app",
  detectedPlatform = "node",
  teamScope = null,
  detectedDatabaseCount = 0,
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
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [plans, setPlans] = useState<AppPlan[]>([]);
  const [featurePlans, setFeaturePlans] = useState<AppFeaturePlan[]>([]);
  const [networks, setNetworks] = useState<AppNetwork[]>([]);
  const [selectedBundlePlanId, setSelectedBundlePlanId] = useState<string>("");
  const [selectedNetworkId, setSelectedNetworkId] = useState<string>("");
  const [plansLoading, setPlansLoading] = useState<boolean>(false);
  const [nameCheckLoading, setNameCheckLoading] = useState<boolean>(false);
  const [availableName, setAvailableName] = useState<string | null>(null);
  const [preflightMessage, setPreflightMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recommendedPlanReason, setRecommendedPlanReason] = useState<string | null>(null);
  const [recoveryService, setRecoveryService] = useState<ExistingAppCandidate | null>(null);
  const selectedPlan = plans.find((plan) => plan.plan_id === selectedPlanId);
  const availableBundlePlans = featurePlans.filter((plan) => plan.plan_id === selectedPlanId);
  const selectedBundlePlan = availableBundlePlans.find((plan) => plan.bundle_plan_id === selectedBundlePlanId);
  const selectedNetwork = networks.find((network) => network.id === selectedNetworkId);

  useEffect(() => {
    if (mode !== "new") return;
    let active = true;
    setPlansLoading(true);
    setPlans([]);
    setFeaturePlans([]);
    setNetworks([]);
    setSelectedPlanId("");
    setSelectedBundlePlanId("");
    setSelectedNetworkId("");
    setAvailableName(null);
    setPreflightMessage(null);
    loadAppCreationCatalog()
      .then((result) => {
        if (!active) return;
        if (!result.ok) {
          setPreflightMessage(result.error);
          return;
        }
        const recommendation = recommendAppPlan(result.catalog.plans, { platform: detectedPlatform, databaseCount: detectedDatabaseCount });
        const recommendedBundle = recommendFeaturePlan(result.catalog.feature_plans, recommendation.plan.plan_id);
        setPlans(result.catalog.plans.map((plan) => ({ ...plan, is_recommended: plan.plan_id === recommendation.plan.plan_id })));
        setFeaturePlans(result.catalog.feature_plans);
        setNetworks(result.catalog.networks);
        setRecommendedPlanReason(recommendation.reason);
        setSelectedPlanId(recommendation.plan.plan_id);
        setSelectedBundlePlanId(recommendedBundle?.bundle_plan_id || "");
        setSelectedNetworkId(result.catalog.networks.find((network) => network.is_recommended)?.id || result.catalog.networks[0]?.id || "");
      })
      .finally(() => {
        if (active) setPlansLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mode, detectedPlatform, detectedDatabaseCount, teamScope?.id]);

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
    if (!plans.some((plan) => plan.plan_id === selectedPlanId)) {
      setErrorMessage("ابتدا یک پلن معتبر از فهرست لیارا انتخاب کنید.");
      return;
    }
    if (!selectedBundlePlan || !selectedNetwork) {
      setErrorMessage("یک پلن بسته و شبکهٔ معتبر از گزینه‌های در دسترس لیارا انتخاب کنید.");
      return;
    }
    if (availableName !== slug) {
      setErrorMessage("پیش از ساخت، آزاد بودن نام را در لیارا بررسی کنید.");
      return;
    }
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const res = await onCreateNewApp({
        appName: slug,
        platform: detectedPlatform,
        planId: selectedPlanId,
        bundlePlanId: selectedBundlePlan.bundle_plan_id,
        networkId: selectedNetwork.id,
        teamId: teamScope?.id || null,
        priceMonthly: selectedPlan?.price_monthly ?? null,
        bundlePriceMonthly: selectedBundlePlan.price_monthly ?? null,
      });
      setRecoveryService(res.recovery?.service || null);
      if (!res.ok) {
        setErrorMessage(res.error || "خطا در ساخت سرویس در لیارا");
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "خطای غیرمنتظره در ساخت برنامه");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckName = async () => {
    const slug = cleanSlug(newAppName);
    setAvailableName(null);
    setNameCheckLoading(true);
    setPreflightMessage(null);
    const result = await checkAppNameAvailability(slug);
    setAvailableName(result.available ? slug : null);
    setPreflightMessage(result.message);
    if (!result.available && result.reason === "already_exists") {
      setRecoveryService(await findExistingApp(slug));
    } else {
      setRecoveryService(null);
    }
    setNameCheckLoading(false);
  };

  return (
    <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/[.04] backdrop-blur p-5 shadow-xl flex flex-col gap-4 text-zinc-200">
      {/* Widget Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-liara/10 border border-liara/20 flex items-center justify-center text-liara">
            <Globe className="h-4.5 w-4.5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-100">تعیین سرویس مقصد در لیارا</h4>
            <p className="text-xs text-zinc-400">
              پلتفرم شناسایی‌شده:{" "}
              <span className="font-mono text-liara font-semibold">{detectedPlatform}</span>
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
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors py-1 px-2.5 rounded-lg border border-white/10 hover:bg-white/5 cursor-pointer"
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
              onChange={(e) => {
                setNewAppName(e.target.value);
                setRecoveryService(null);
                setAvailableName(null);
                setPreflightMessage(null);
              }}
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
            <button
              type="button"
              onClick={handleCheckName}
              disabled={nameCheckLoading || plansLoading || disabled}
              className="self-start rounded-lg border border-blue-500/30 px-3 py-1.5 text-[11px] text-blue-300 hover:bg-blue-950/40 disabled:opacity-50"
            >
              {nameCheckLoading ? "در حال بررسی نام در لیارا..." : "بررسی آزاد بودن نام در لیارا"}
            </button>
            {preflightMessage && (
              <p className={`rounded-lg p-2 text-[11px] ${availableName === cleanSlug(newAppName) ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300"}`}>
                {preflightMessage}
              </p>
            )}
          </div>

          {/* Plan Selector Cards */}
          <div className="flex flex-col gap-1.5 pt-1">
            <label className="text-[11px] text-zinc-300 font-medium flex items-center justify-between">
              <span>انتخاب پلن سخت‌افزاری برنامه:</span>
              <span className="text-[10px] text-zinc-500">قابل ارتقا در هر زمان</span>
            </label>

            {plansLoading ? (
              <p className="rounded-lg bg-zinc-950/60 p-3 text-[11px] text-zinc-400">در حال دریافت پلن‌های این حساب از لیارا...</p>
            ) : plans.length === 0 ? (
              <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-[11px] text-amber-300">
                {preflightMessage || "پلن معتبر از لیارا دریافت نشد؛ تا زمان دریافت پلن، ساخت سرویس غیرفعال است."}
              </p>
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {plans.map((plan) => {
                const isSelected = plan.plan_id === selectedPlanId;
                return (
                  <div
                    key={plan.plan_id}
                    onClick={() => {
                      if (isSubmitting) return;
                      setSelectedPlanId(plan.plan_id);
                      setSelectedBundlePlanId(recommendFeaturePlan(featurePlans, plan.plan_id)?.bundle_plan_id || "");
                    }}
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
                      {formatPlanPrice(plan.price_monthly)}
                    </div>
                    {plan.is_recommended && <p className="text-[10px] text-zinc-400">{recommendedPlanReason || "برای شروع پیشنهاد می‌شود؛ هزینه و منابع را بررسی کنید."}</p>}
                  </div>
                );
              })}
            </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-[11px] text-zinc-300">
              <span>امکانات سرویس (پلن بسته):</span>
              <select
                value={selectedBundlePlanId}
                onChange={(event) => setSelectedBundlePlanId(event.target.value)}
                disabled={isSubmitting || plansLoading || availableBundlePlans.length === 0}
                className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs text-zinc-200"
              >
                {availableBundlePlans.map((bundle) => (
                  <option key={bundle.bundle_plan_id} value={bundle.bundle_plan_id}>
                    {bundle.name_fa} — {formatPlanPrice(bundle.price_monthly)}{bundle.is_recommended ? " (پیشنهادی)" : ""}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-zinc-500">پیشنهاد، کم‌هزینه‌ترین گزینهٔ قابل‌استفاده برای این پلن است.</span>
            </label>
            <label className="flex flex-col gap-1.5 text-[11px] text-zinc-300">
              <span>شبکهٔ لیارا:</span>
              <select
                value={selectedNetworkId}
                onChange={(event) => setSelectedNetworkId(event.target.value)}
                disabled={isSubmitting || plansLoading || networks.length === 0}
                className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs text-zinc-200"
              >
                {networks.map((network) => (
                  <option key={network.id} value={network.id}>
                    {network.name}{network.is_recommended ? " (پیشنهادی)" : ""}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-zinc-500">اگر شبکه‌ای ندارید، ابتدا یک شبکه در کنسول لیارا بسازید.</span>
            </label>
          </div>

          <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 text-[10px] leading-relaxed text-amber-200">
            با انتخاب «تأیید و ساخت سرویس»، نام <span dir="ltr" className="font-mono">{cleanSlug(newAppName) || "—"}</span>، پلتفرم {detectedPlatform}، پلن سخت‌افزاری «{selectedPlan?.name_fa || selectedPlanId || "—"}» ({formatPlanPrice(selectedPlan?.price_monthly)})، امکانات «{selectedBundlePlan?.name_fa || "—"}» ({formatPlanPrice(selectedBundlePlan?.price_monthly)})، شبکهٔ «{selectedNetwork?.name || "—"}» و محدوده {teamScope ? `تیم ${teamScope.name} (${teamScope.id})` : "حساب شخصی"} را تأیید می‌کنید. قیمت‌ها جداگانه مطابق اطلاعات لیارا نمایش داده شده‌اند؛ این عملیات ممکن است هزینه داشته باشد.
          </p>

          <button
            type="button"
            onClick={handleCreateNew}
            disabled={isSubmitting || disabled || plansLoading || plans.length === 0 || !selectedPlanId || !selectedBundlePlan || !selectedNetwork || availableName !== cleanSlug(newAppName)}
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
      {recoveryService && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex flex-col gap-2 text-xs text-amber-200">
          <span>سرویس «{recoveryService.name}» در حساب فعال پیدا شد. ساخت دوباره انجام نمی‌شود.</span>
          <button
            type="button"
            onClick={() => onSelectExistingApp(recoveryService.name)}
            disabled={disabled || isSubmitting}
            className="self-start rounded-lg bg-amber-500/20 px-3 py-1.5 font-semibold hover:bg-amber-500/30 disabled:opacity-50"
          >
            استفاده از سرویس پیدا‌شده و ادامه دپلوی
          </button>
        </div>
      )}
    </div>
  );
}

