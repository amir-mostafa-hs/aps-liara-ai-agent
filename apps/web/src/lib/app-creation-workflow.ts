import { checkAppNameAvailability } from "./app-preflight.ts";
import type { Fetcher } from "./app-preflight.ts";
import { buildAppCreationApproval } from "./app-creation-approval.ts";

export interface CreateLiaraAppInput {
  appName: string;
  platform: string;
  planId: string;
  bundlePlanId: string;
  networkId: string;
  teamId: string | null;
  priceMonthly: number | null;
  bundlePriceMonthly: number | null;
}

export interface ExistingAppCandidate {
  name: string;
  status: string;
  endpoint?: string;
}

export async function createLiaraApp(
  input: CreateLiaraAppInput,
  options: {
    fetcher?: Fetcher;
    onConfirmed: (service: Record<string, unknown>) => void | Promise<void>;
  },
): Promise<{ ok: true } | { ok: false; error: string; recovery?: { service: ExistingAppCandidate } }> {
  const fetcher = options.fetcher || fetch;
  const availability = await checkAppNameAvailability(input.appName, fetcher);
  if (!availability.available) {
    if (availability.reason === "already_exists") {
      const service = await findExistingApp(input.appName, fetcher);
      if (service) return { ok: false, error: "این سرویس در حساب شما پیدا شد؛ برای ادامه، استفاده از همین سرویس را تأیید کنید.", recovery: { service } };
    }
    return { ok: false, error: availability.message };
  }

  let confirmedService: Record<string, unknown>;
  try {
    const response = await fetcher("/api/liara/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: input.appName,
        platform: input.platform,
        planId: input.planId,
        bundlePlanId: input.bundlePlanId,
        networkId: input.networkId,
        teamId: input.teamId,
        priceMonthly: input.priceMonthly ?? null,
        bundlePriceMonthly: input.bundlePriceMonthly ?? null,
        approval: buildAppCreationApproval({ ...input, priceMonthly: input.priceMonthly ?? null, bundlePriceMonthly: input.bundlePriceMonthly ?? null }),
      }),
    });
    const data = await response.json();
    if (!response.ok || data?.ok !== true) {
      if (data?.reason === "unverified") {
        const service = await findExistingApp(input.appName, fetcher);
        if (service) return { ok: false, error: "لیارا سرویس را ساخته است؛ برای ادامه، استفاده از همین سرویس را تأیید کنید.", recovery: { service } };
      }
      return {
        ok: false,
        error: data?.error || "ساخت سرویس در لیارا تأیید نشد. لطفاً وضعیت سرویس را بررسی کنید.",
      };
    }
    if (
      typeof data.project_id !== "string" ||
      data.project_id.toLowerCase() !== input.appName.toLowerCase() ||
      !data.status ||
      data.status === "unverified"
    ) {
      return {
        ok: false,
        error: "لیارا وجود سرویس ساخته‌شده را تأیید نکرد؛ برای جلوگیری از ساخت تکراری، ابتدا سرویس‌ها را دوباره بررسی کنید.",
      };
    }

    confirmedService = data;
  } catch {
    const service = await findExistingApp(input.appName, fetcher);
    if (service) return { ok: false, error: "پاسخ ساخت نامشخص بود اما سرویس در لیارا پیدا شد؛ برای ادامه استفاده از آن را تأیید کنید.", recovery: { service } };
    return {
      ok: false,
      error: "ارتباط با لیارا برقرار نشد؛ ساخت سرویس تأیید نشد. پیش از تلاش دوباره، فهرست سرویس‌ها را بررسی کنید.",
    };
  }

  await options.onConfirmed(confirmedService);
  return { ok: true };
}

export async function findExistingApp(name: string, fetcher: Fetcher = fetch): Promise<ExistingAppCandidate | null> {
  try {
    const response = await fetcher("/api/liara/services", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok || data?.ok !== true || !Array.isArray(data.services)) return null;
    const app = data.services.find((service: any) =>
      service?.type === "app" && String(service.name).toLowerCase() === name.toLowerCase(),
    );
    if (!app) return null;
    return {
      name: String(app.name),
      status: String(app.status || "created"),
      endpoint: typeof app.endpoint === "string" ? app.endpoint : undefined,
    };
  } catch {
    return null;
  }
}
