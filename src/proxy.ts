import { NextResponse, type NextRequest } from "next/server";

/* Sweeps dead auth cookies before they can wedge a request.

   `_vercel_jwt` is issued by Vercel Deployment Protection. Once it goes stale
   the browser keeps replaying it on every visit and the edge answers with a
   protection bounce — or a 503 — instead of the app, which is the "spins
   forever and never loads" symptom. We cannot verify the token (only Vercel
   holds that key), but the `exp` claim is public, so we drop the cookie only
   once it is provably dead. A still-valid token is never touched, which keeps
   Deployment Protection working if it is ever switched back on.

   `sofit_session` gets the same treatment: an expired session JWT can never
   authenticate anyone, so replaying it just costs a verify on every request. */
const SESSION_COOKIE = "sofit_session";
const VERCEL_PROTECTION_COOKIE = "_vercel_jwt";

/** Reads the unsigned `exp` claim. Returns null when the value isn't a JWT. */
function expiresAt(token: string): number | null {
  const segments = token.split(".");
  if (segments.length !== 3) return null;
  try {
    const base64 = segments[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const claims = JSON.parse(atob(padded)) as { exp?: unknown };
    return typeof claims.exp === "number" ? claims.exp : null;
  } catch {
    return null;
  }
}

/** Dead = not a JWT at all, or already past its own expiry (30s of clock slack). */
function isDead(token: string, nowSeconds: number): boolean {
  const exp = expiresAt(token);
  if (exp === null) return true;
  return exp <= nowSeconds - 30;
}

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const nowSeconds = Math.floor(Date.now() / 1000);

  for (const name of [VERCEL_PROTECTION_COOKIE, SESSION_COOKIE]) {
    const value = request.cookies.get(name)?.value;
    if (value && isDead(value, nowSeconds)) {
      response.cookies.delete(name);
    }
  }

  return response;
}

export const config = {
  // Skip static assets, the icons, the manifest and the service worker so a
  // Set-Cookie header never rides along with a cacheable file.
  matcher: ["/((?!_next/static|_next/image|.*\\.[\\w]+$).*)"],
};
