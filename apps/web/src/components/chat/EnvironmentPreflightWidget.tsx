"use client";

import React, { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { allEnvironmentQuestionsAnswered, EnvironmentRequirement, getEnvironmentQuestions, writeApprovedEnvironment } from "@/lib/env-preflight";

interface Props {
  appName: string;
  requirements: EnvironmentRequirement[];
  serviceValues: Record<string, string>;
  onResolved: () => void;
  disabled?: boolean;
}

function generateSecret() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

export function EnvironmentPreflightWidget({ appName, requirements, serviceValues, onResolved, disabled = false }: Props) {
  const questions = useMemo(() => getEnvironmentQuestions(requirements, serviceValues), [requirements, serviceValues]);
  const [values, setValues] = useState<Record<string, string>>(serviceValues);
  const [choices, setChoices] = useState<Record<string, "manual" | "generated">>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const valid = allEnvironmentQuestionsAnswered(questions, values, choices);
  const generated = requirements.filter((item) => choices[item.name] === "generated" && values[item.name]);

  const chooseSecret = (name: string, choice: "manual" | "generated") => {
    setChoices((previous) => ({ ...previous, [name]: choice }));
    setValues((previous) => ({ ...previous, [name]: choice === "generated" ? generateSecret() : "" }));
  };

  const writeAndContinue = async () => {
    if (!valid || saving || disabled) return;
    setSaving(true);
    setError("");
    try {
      const approvedValues = Object.fromEntries(Object.entries(values).filter(([, value]) => Boolean(value.trim())));
      await writeApprovedEnvironment(appName, approvedValues, fetch, () => onResolved());
      setSaved(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "تنظیم متغیرها تأیید نشد؛ دپلوی ادامه پیدا نمی‌کند.");
    } finally {
      setSaving(false);
    }
  };

  const copySecret = async (name: string) => {
    try {
      await navigator.clipboard.writeText(values[name]);
    } catch {
      setError("کپی امن secret ممکن نشد؛ لطفاً آن را با نمایش موقت یادداشت کنید.");
    }
  };

  if (saved) return (
    <article className="relative overflow-hidden rounded-none border border-emerald-500/30 bg-emerald-500/[.04] p-5 shadow-none">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/state-success.webp"
        alt=""
        className="absolute inset-y-0 left-0 h-full w-1/2 object-cover opacity-80 [mask-image:linear-gradient(to_right,#000_30%,transparent)] pointer-events-none"
      />
      <div className="relative sm:w-3/5 mr-auto space-y-2">
        <h4 className="text-sm font-bold text-emerald-300">تنظیم متغیرهای لازم روی لیارا تأیید شد.</h4>
        {generated.length > 0 && (
          <div className="mt-3 rounded-none border border-amber-500/40 bg-zinc-950/90 p-3 text-xs text-amber-200 space-y-2">
            <p>Secret تولیدشده فقط در همین صفحه نگهداری می‌شود. آن را در محل امن ذخیره کنید:</p>
            {generated.map(({ name }) => (
              <div key={name} className="flex flex-wrap items-center gap-2 font-mono">
                <code>{name}</code>
                <button
                  type="button"
                  className="underline text-liara cursor-pointer font-sans"
                  onClick={() => setRevealed((prev) => ({ ...prev, [name]: !prev[name] }))}
                >
                  {revealed[name] ? "پنهان" : "نمایش موقت"}
                </button>
                <button
                  type="button"
                  className="underline text-liara cursor-pointer font-sans"
                  onClick={() => void copySecret(name)}
                >
                  کپی امن
                </button>
                {revealed[name] && <code dir="ltr" className="max-w-full break-all text-emerald-300">{values[name]}</code>}
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );

  return (
    <article className="card w-full !items-stretch flex-col space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div>
          <h4 className="text-sm font-bold text-zinc-100">بررسی متغیرهای اجرای برنامه</h4>
          <p className="mt-1 text-xs text-zinc-400">
            متغیرها از سورس‌کد پروژه شناسایی شده‌اند. مقادیر پیش‌فرض نمونه به‌عنوان secret استفاده نخواهند شد.
          </p>
        </div>
        <span className="pill border border-liara/30 bg-liara/10 text-liara">
          {appName}
        </span>
      </div>

      <div className="space-y-3">
        {requirements.map((requirement) => {
          const { name } = requirement;
          const question = questions.find((item) => item.name === name);
          const provided = Boolean(serviceValues[name]);
          if (!requirement.required || requirement.value_source === "platform_provided") {
            return (
              <div key={name} className="rounded-none border border-zinc-800 bg-zinc-950/70 p-3 text-xs text-zinc-300 space-y-1">
                <code className="text-liara font-mono">{name}</code> — مقدار را پلتفرم به‌طور خودکار تأمین می‌کند.
                {requirement.evidence.length > 0 && (
                  <p className="text-zinc-500 text-[11px] font-mono">شاهد: {requirement.evidence.join("، ")}</p>
                )}
              </div>
            );
          }
          return (
            <div key={name} className="rounded-none border border-zinc-800 bg-zinc-950/70 p-3 text-xs space-y-2">
              <div className="flex items-start justify-between gap-2">
                <code className="text-liara font-mono font-bold">{name}</code>
                <span className="text-zinc-400 text-[11px] font-mono">
                  {provided
                    ? "از سرویس تأییدشدهٔ لیارا"
                    : question?.resolution === "user_input"
                    ? "نیازمند اطلاعات شما"
                    : question?.resolution === "choose_secret_source"
                    ? "Secret اختصاصی برنامه"
                    : "منبع مقدار نامشخص"}
                </span>
              </div>
              {requirement.evidence.length > 0 && (
                <p className="text-zinc-500 text-[11px] font-mono">شاهد: {requirement.evidence.join("، ")}</p>
              )}
              {requirement.example_is_placeholder && (
                <p className="text-amber-300 text-[11px]">مقدار فایل نمونه placeholder است و استفاده نخواهد شد.</p>
              )}
              {!provided && question?.resolution === "choose_secret_source" && (
                <fieldset className="space-y-1.5 pt-1">
                  <legend className="text-zinc-400 text-xs">روش تأمین Secret را انتخاب کنید:</legend>
                  <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                    <input
                      type="radio"
                      name={`source-${name}`}
                      checked={choices[name] === "manual"}
                      onChange={() => chooseSecret(name, "manual")}
                      className="text-liara focus:ring-liara/30"
                    />
                    <span>خودم وارد می‌کنم</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                    <input
                      type="radio"
                      name={`source-${name}`}
                      checked={choices[name] === "generated"}
                      onChange={() => chooseSecret(name, "generated")}
                      className="text-liara focus:ring-liara/30"
                    />
                    <span>تولید کلید امن تصادفی</span>
                  </label>
                </fieldset>
              )}
              {!provided && (question?.resolution === "user_input" || question?.resolution === "unresolved" || choices[name] === "manual") && (
                <label className="block pt-1">
                  <span className="text-zinc-400 text-xs">
                    {question?.resolution === "unresolved" ? "مقدار سرویس وابسته را وارد کنید:" : "مقدار را وارد کنید:"}
                  </span>
                  <input
                    type={requirement.sensitive ? "password" : "text"}
                    autoComplete="new-password"
                    value={values[name] || ""}
                    onChange={(event) => setValues((prev) => ({ ...prev, [name]: event.target.value }))}
                    className="inp mt-1"
                    dir="ltr"
                  />
                </label>
              )}
              {choices[name] === "generated" && (
                <p className="text-amber-300 text-xs pt-1 font-mono">
                  مقدار امن ساخته شد و تا تأیید شما روی لیارا نوشته نمی‌شود.
                  <button
                    type="button"
                    className="ms-2 underline text-liara cursor-pointer font-sans"
                    onClick={() => setValues((prev) => ({ ...prev, [name]: generateSecret() }))}
                  >
                    تولید مقدار تازه
                  </button>
                </p>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="text-xs font-mono text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-none p-2">
          {error}
        </p>
      )}

      <div className="border-t border-zinc-800 pt-3 space-y-2">
        <p className="text-xs text-zinc-400">
          با تأیید شما، این متغیرها برای برنامهٔ <strong className="text-zinc-200">{appName}</strong> روی لیارا ثبت می‌شوند.
        </p>
        <button
          type="button"
          disabled={!valid || saving || disabled}
          onClick={() => void writeAndContinue()}
          className="b1 flex items-center justify-center gap-2 cursor-pointer"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin text-zinc-950" />}
          <span>{saving ? "در انتظار تأیید Liara..." : "تأیید تنظیم متغیرها و ادامه"}</span>
        </button>
      </div>
    </article>
  );
}
