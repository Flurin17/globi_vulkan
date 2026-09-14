export const CONSENT_KEY = "globi-vulkan:analytics-consent:v1";
export const CONSENT_LIFETIME = 180 * 24 * 60 * 60 * 1000;

export type Consent = {
  analytics: boolean;
  measurementId: string;
  expiresAt: number;
};

export function measurementId(value: string | undefined): string {
  const id = value?.trim() ?? "";
  return /^G-[A-Z0-9]+$/.test(id) ? id : "";
}

export function parseConsent(raw: string | null, id: string, now = Date.now()): Consent | null {
  try {
    const value = JSON.parse(raw ?? "null");
    if (
      value && typeof value.analytics === "boolean" &&
      value.measurementId === id && typeof value.expiresAt === "number" &&
      value.expiresAt > now && value.expiresAt <= now + CONSENT_LIFETIME
    ) return value;
  } catch {
    // Unreadable or older preferences never grant permission to track.
  }
  return null;
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}

const denied = {
  analytics_storage: "denied",
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
};

/** Basic consent mode: no Google script or requests before an explicit opt-in. */
export function createAnalyticsController(id: string) {
  let initialized = false;
  let active = false;
  return (allowed: boolean) => {
    if (!measurementId(id)) return;
    const browser = window;
    browser[`ga-disable-${id}`] = !allowed;
    if (!allowed) {
      if (active) browser.gtag?.("consent", "update", denied);
      active = false;
      // GA cookies use path=/; remove host-only and parent-domain variants.
      for (const cookie of document.cookie.split(";")) {
        const name = cookie.split("=")[0].trim();
        if (name !== "_ga" && !name.startsWith("_ga_")) continue;
        const deletion = `${name}=; Max-Age=0; path=/`;
        document.cookie = deletion;
        const parts = location.hostname.split(".");
        for (let i = 0; i < parts.length - 1; i++) {
          document.cookie = `${deletion}; domain=${parts.slice(i).join(".")}`;
        }
      }
      return;
    }
    if (active) return;
    active = true;
    if (!initialized) {
      initialized = true;
      browser.dataLayer ??= [];
      browser.gtag = function () {
        // Google's command queue expects Arguments objects, not rest arrays.
        // eslint-disable-next-line prefer-rest-params
        browser.dataLayer!.push(arguments);
      };
      browser.gtag("consent", "default", denied);
      browser.gtag("consent", "update", { ...denied, analytics_storage: "granted" });
      browser.gtag("js", new Date());
      browser.gtag("config", id, {
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        cookie_path: "/",
        cookie_expires: CONSENT_LIFETIME / 1000,
      });
      const script = document.createElement("script");
      script.id = "globi-google-analytics";
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
      document.head.appendChild(script);
    } else {
      browser.gtag?.("consent", "update", { ...denied, analytics_storage: "granted" });
    }
  };
}
