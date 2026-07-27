import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* The escape hatch: visit /api/reset and the browser is handed a clean slate.

   Clears the SoFit session plus every Vercel Deployment-Protection cookie, so a
   token the browser refuses to let go of can never lock anyone out of the
   deployment again. Safe to bookmark — the worst it does is sign you out. */
const COOKIES_TO_CLEAR = ["sofit_session", "_vercel_jwt", "_vercel_sso_nonce", "_vercel_sso_session", "__vdpl", "__vdpl_"];

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/", request.url), 303);

  for (const name of COOKIES_TO_CLEAR) {
    response.cookies.delete(name);
  }

  // Belt and braces: tells the browser to drop everything for this origin,
  // including any cookie name we did not think to list above.
  response.headers.set("Clear-Site-Data", '"cookies"');
  response.headers.set("Cache-Control", "no-store, max-age=0");

  return response;
}
