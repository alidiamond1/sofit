import "server-only";

import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { readSession } from "@/lib/auth/session";
import { database } from "@/lib/db";
import { LOCALE_COOKIE, defaultLocale, isSupportedLocale, type AppLocale } from "@/i18n/config";

/* Locale resolution priority:
     1. The signed-in user's saved `user_settings.language` — the source of
        truth once someone has an account, so it follows them across devices.
     2. The `sofit_locale` cookie — carries a choice for logged-out visitors
        (and doubles as a fast path immediately after a signed-in user changes
        their language, before the DB round trip below would otherwise matter).
     3. English. */
export default getRequestConfig(async () => {
  let locale: AppLocale | undefined;

  try {
    const session = await readSession();
    if (session) {
      const row = await database()("user_settings").select("language").where({ user_id: session.id }).first();
      if (isSupportedLocale(row?.language)) locale = row.language;
    }
  } catch {
    // Locale is a preference, not authorization. Keep the translation provider
    // available when MySQL is unreachable; page/action access still fails closed.
  }

  if (!locale) {
    const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
    if (isSupportedLocale(cookieLocale)) locale = cookieLocale;
  }

  locale ||= defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
