"use client";

import React, { useMemo, useState } from "react";
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
    <section className="mt-4 rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-4 text-emerald-300">
      <h4 className="text-sm font-semibold">تنظیم متغیرهای لازم روی لیارا تأیید شد.</h4>
      {generated.length > 0 && <div className="mt-3 rounded-xl border border-amber-500/40 bg-amber-950/30 p-3 text-xs text-amber-200">
        <p>secret تولیدشده فقط در همین صفحه نگهداری می‌شود. آن را در محل امن ذخیره کنید؛ بعد از بستن صفحه قابل بازیابی نیست.</p>
        {generated.map(({ name }) => <div key={name} className="mt-2 flex flex-wrap items-center gap-2">
          <code>{name}</code>
          <button type="button" onClick={() => setRevealed((prev) => ({ ...prev, [name]: !prev[name] }))}>{revealed[name] ? "پنهان" : "نمایش موقت"}</button>
          <button type="button" onClick={() => void copySecret(name)}>کپی امن</button>
          {revealed[name] && <code dir="ltr" className="max-w-full break-all">{values[name]}</code>}
        </div>)}
      </div>}
    </section>
  );

  return <section className="mt-4 rounded-2xl border border-border bg-card/60 p-4 shadow-sm">
    <div className="border-b border-border/60 pb-3">
      <h4 className="text-sm font-semibold">بررسی متغیرهای اجرای برنامه</h4>
      <p className="mt-1 text-xs text-muted-foreground">متغیرها از فایل‌ها و کد پروژه شناسایی شده‌اند. مقدار نمونه به‌عنوان secret واقعی استفاده نمی‌شود.</p>
    </div>
    <div className="mt-3 space-y-4">
      {requirements.map((requirement) => {
        const { name } = requirement;
        const question = questions.find((item) => item.name === name);
        const provided = Boolean(serviceValues[name]);
        if (!requirement.required || requirement.value_source === "platform_provided") return <div key={name} className="rounded-lg border border-border/60 p-3 text-xs">
          <code>{name}</code> — مقدار را پلتفرم فراهم می‌کند.{requirement.evidence.length > 0 && <p className="mt-1 text-muted-foreground">شاهد: {requirement.evidence.join("، ")}</p>}
        </div>;
        return <div key={name} className="rounded-lg border border-border/60 p-3 text-xs">
          <div className="flex items-start justify-between gap-2"><code>{name}</code><span className="text-muted-foreground">{provided ? "از سرویس تأییدشدهٔ لیارا" : question?.resolution === "user_input" ? "نیازمند اطلاعات شما" : question?.resolution === "choose_secret_source" ? "secret برنامه" : "منبع مقدار نامشخص"}</span></div>
          {requirement.evidence.length > 0 && <p className="mt-1 text-muted-foreground">شاهد: {requirement.evidence.join("، ")}</p>}
          {requirement.example_is_placeholder && <p className="mt-1 text-amber-300">مقدار فایل نمونه placeholder است و استفاده نخواهد شد.</p>}
          {!provided && question?.resolution === "choose_secret_source" && <fieldset className="mt-3 space-y-2"><legend>روش تأمین secret را انتخاب کنید:</legend>
            <label className="flex items-center gap-2"><input type="radio" name={`source-${name}`} checked={choices[name] === "manual"} onChange={() => chooseSecret(name, "manual")} /> خودم وارد می‌کنم</label>
            <label className="flex items-center gap-2"><input type="radio" name={`source-${name}`} checked={choices[name] === "generated"} onChange={() => chooseSecret(name, "generated")} /> مقدار امن تصادفی بساز</label>
          </fieldset>}
          {!provided && (question?.resolution === "user_input" || question?.resolution === "unresolved" || choices[name] === "manual") && <label className="mt-3 block">{question?.resolution === "unresolved" ? "مقدار سرویس وابسته را وارد کنید:" : "مقدار را وارد کنید:"}
            <input type={requirement.sensitive ? "password" : "text"} autoComplete="new-password" value={values[name] || ""} onChange={(event) => setValues((prev) => ({ ...prev, [name]: event.target.value }))} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono" dir="ltr" />
          </label>}
          {choices[name] === "generated" && <p className="mt-2 text-amber-300">مقدار امن ساخته شد و تا تأیید شما روی Liara نوشته نمی‌شود. پس از ثبت، آن را در محل امن ذخیره کنید.<button type="button" className="ms-2 underline" onClick={() => setValues((prev) => ({ ...prev, [name]: generateSecret() }))}>تولید مقدار تازه</button></p>}
        </div>;
      })}
    </div>
    {error && <p role="alert" className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-300">{error}</p>}
    <div className="mt-4 border-t border-border/60 pt-3">
      <p className="mb-3 text-xs text-muted-foreground">با تأیید شما، این متغیرها برای برنامهٔ <strong>{appName}</strong> روی Liara ثبت می‌شوند. دپلوی پس از تأیید ثبت توسط Liara ادامه پیدا می‌کند.</p>
      <button type="button" disabled={!valid || saving || disabled} onClick={() => void writeAndContinue()} className="rounded-xl bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50">{saving ? "در انتظار تأیید Liara..." : "تأیید تنظیم متغیرها و ادامه"}</button>
    </div>
  </section>;
}
