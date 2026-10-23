export interface AppPlan {
  plan_id: string;
  name_fa: string;
  ram: string;
  cpu: string;
  disk: string;
  price_monthly: number | null;
  is_recommended: boolean;
}

export interface AppFeaturePlan {
  plan_id: string;
  bundle_plan_id: string;
  name_fa: string;
  price_monthly: number | null;
  is_recommended: boolean;
}

export interface AppNetwork {
  id: string;
  name: string;
  is_recommended: boolean;
}

export interface AppCreationCatalog {
  plans: AppPlan[];
  feature_plans: AppFeaturePlan[];
  networks: AppNetwork[];
}

export function formatPlanPrice(price: number | null | undefined): string {
  if (price == null) return "قیمت توسط لیارا اعلام نشده";
  return `${price.toLocaleString("fa-IR")} تومان/ماه`;
}

export type FetchResponse = { ok: boolean; json: () => Promise<any> };
export type Fetcher = (url: string, init?: RequestInit) => Promise<FetchResponse>;

export async function loadAppPlans(fetcher: Fetcher = fetch): Promise<
  { ok: true; plans: AppPlan[] } | { ok: false; error: string }
> {
  try {
    const response = await fetcher("/api/liara/app-plans", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok || data?.ok !== true || !Array.isArray(data.plans) || data.plans.length === 0) {
      return {
        ok: false,
        error: "دریافت پلن‌های معتبر از لیارا ممکن نشد. اتصال و توکن لیارا را بررسی کنید و دوباره تلاش کنید.",
      };
    }

    const plans = data.plans.filter((plan: any) => typeof plan?.plan_id === "string" && plan.plan_id.length > 0);
    if (plans.length === 0) {
      return { ok: false, error: "لیارا پلن قابل‌استفاده‌ای برای این حساب برنگرداند. بعداً دوباره تلاش کنید." };
    }
    return { ok: true, plans };
  } catch {
    return {
      ok: false,
      error: "ارتباط با لیارا برقرار نشد؛ پلن‌های معتبر در دسترس نیستند. اتصال را بررسی کنید و دوباره تلاش کنید.",
    };
  }
}

export async function loadAppCreationCatalog(fetcher: Fetcher = fetch): Promise<
  { ok: true; catalog: AppCreationCatalog } | { ok: false; error: string }
> {
  try {
    const response = await fetcher("/api/liara/app-plans", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok || data?.ok !== true || !Array.isArray(data.plans) || !Array.isArray(data.feature_plans) || !Array.isArray(data.networks)) {
      return { ok: false, error: "گزینه‌های ساخت سرویس از لیارا کامل دریافت نشدند؛ تا بررسی دوباره، ساخت غیرفعال است." };
    }
    const plans = data.plans.filter((plan: any) => typeof plan?.plan_id === "string" && plan.plan_id.length > 0);
    const featurePlans = data.feature_plans.filter((plan: any) => typeof plan?.plan_id === "string" && typeof plan?.bundle_plan_id === "string");
    const networks = data.networks.filter((network: any) => typeof network?.id === "string" && typeof network?.name === "string");
    if (!plans.length || !featurePlans.length || !networks.length) {
      return { ok: false, error: "لیارا پلن بسته یا شبکهٔ قابل‌استفاده‌ای برای این حساب برنگرداند. ابتدا در کنسول لیارا یک شبکه بسازید یا دسترسی حساب را بررسی کنید." };
    }
    return { ok: true, catalog: { plans, feature_plans: featurePlans, networks } };
  } catch {
    return { ok: false, error: "ارتباط با لیارا برقرار نشد؛ گزینه‌های معتبر سرویس در دسترس نیستند. اتصال را بررسی کنید و دوباره تلاش کنید." };
  }
}

export function recommendFeaturePlan(featurePlans: AppFeaturePlan[], planId: string): AppFeaturePlan | null {
  return featurePlans
    .filter((plan) => plan.plan_id === planId)
    .sort((a, b) => (a.price_monthly ?? Number.MAX_SAFE_INTEGER) - (b.price_monthly ?? Number.MAX_SAFE_INTEGER))[0] || null;
}

export function recommendAppPlan(
  plans: AppPlan[],
  context: { platform: string; databaseCount: number },
): { plan: AppPlan; reason: string } {
  const minimumRamMb = context.databaseCount > 0 ? 1024 : 512;
  const withKnownRam = plans
    .map((plan) => ({ plan, ramMb: parseRamMb(plan.ram) }))
    .filter((item): item is { plan: AppPlan; ramMb: number } => item.ramMb !== null);
  const suitable = withKnownRam.filter((item) => item.ramMb >= minimumRamMb);
  const sorted = suitable.sort((a, b) => {
    const priceA = a.plan.price_monthly ?? Number.MAX_SAFE_INTEGER;
    const priceB = b.plan.price_monthly ?? Number.MAX_SAFE_INTEGER;
    return priceA - priceB || a.ramMb - b.ramMb;
  });
  const chosen = sorted[0]?.plan || plans.find((plan) => plan.is_recommended) || plans[0];
  const projectKind = context.databaseCount > 0
    ? `پروژه ${context.platform} شما ${context.databaseCount} پایگاه‌داده شناسایی‌شده دارد`
    : `پروژه ${context.platform} شما پایگاه‌داده شناسایی‌شده ندارد`;
  const reason = sorted.length > 0
    ? `${projectKind}؛ با توجه به اطلاعات موجود، کم‌هزینه‌ترین پلن با حداقل ${minimumRamMb} مگابایت RAM پیشنهاد می‌شود. این تخمین جایگزین برآورد ترافیک واقعی نیست.`
    : `${projectKind}؛ اطلاعات منابع پلن‌ها برای پیشنهاد دقیق کافی نیست، پس پیشنهاد لیارا نمایش داده شده است.`;
  return { plan: chosen, reason };
}

function parseRamMb(value: string): number | null {
  const match = value.match(/(\d+(?:\.\d+)?)\s*(GB|MB)/i);
  if (!match) return null;
  const amount = Number(match[1]);
  return match[2].toLowerCase() === "gb" ? amount * 1024 : amount;
}

export async function checkAppNameAvailability(
  name: string,
  fetcher: Fetcher = fetch,
): Promise<{ available: boolean; message: string; reason?: string }> {
  if (!/^[a-z0-9-]{3,64}$/i.test(name.trim())) {
    return { available: false, message: "نام باید ۳ تا ۶۴ حرف انگلیسی، عدد یا خط تیره داشته باشد." };
  }

  try {
    const query = new URLSearchParams({ name: name.trim().toLowerCase() });
    const response = await fetcher(`/api/liara/projects/availability?${query.toString()}`, { cache: "no-store" });
    const data = await response.json();
    if (response.ok && data?.ok && data.available === true) {
      return {
        available: true,
        message: "این نام در حساب یا تیم انتخاب‌شده آزاد است. ممکن است تا زمان ساخت، وضعیت آن تغییر کند.",
      };
    }
    if (data?.reason === "already_exists") {
      return { available: false, reason: "already_exists", message: "این نام قبلاً در حساب یا تیم انتخاب‌شده استفاده شده است؛ نام دیگری انتخاب کنید یا سرویس موجود را از فهرست انتخاب کنید." };
    }
    if (data?.reason === "invalid_name") {
      return { available: false, message: "نام واردشده معتبر نیست؛ فقط حروف انگلیسی، عدد و خط تیره مجاز است." };
    }
    if (data?.reason === "missing_credentials" || data?.reason === "unauthorized") {
      return { available: false, message: "توکن لیارا معتبر نیست یا تنظیم نشده است؛ تنظیمات دسترسی را بررسی کنید." };
    }
    if (data?.reason === "forbidden") {
      return { available: false, message: "این توکن اجازه بررسی سرویس‌های این حساب یا تیم را ندارد." };
    }
    return { available: false, message: "بررسی نام در لیارا کامل نشد؛ فعلاً امکان ساخت امن سرویس وجود ندارد." };
  } catch {
    return { available: false, message: "ارتباط با لیارا برقرار نشد؛ نام را نتوانستم بررسی کنم. دوباره تلاش کنید." };
  }
}
