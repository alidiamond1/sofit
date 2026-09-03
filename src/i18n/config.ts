export const LOCALE_COOKIE = "sofit_locale";
export const locales = ["en", "so"] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = "en";

export function isSupportedLocale(value: string | null | undefined): value is AppLocale {
  return value === "en" || value === "so";
}
