import { NextResponse } from "next/server";
import { pingDatabase } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

/* Splits "the deployment is unreachable" from "the deployment is up but the
   database is slow" — the two very different causes of a page that spins.

   GET /api/health      -> answers instantly, touches nothing. If this responds,
                           the deployment itself is healthy and reachable.
   GET /api/health?db=1 -> also probes MySQL, with a hard timeout so the request
                           always returns rather than hanging. */
export async function GET(request: Request) {
  const probeDatabase = new URL(request.url).searchParams.has("db");

  const body: Record<string, unknown> = {
    ok: true,
    service: "sofit",
    time: new Date().toISOString(),
    region: process.env.VERCEL_REGION ?? "local",
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    env: {
      database: Boolean(process.env.DATABASE_URL || process.env.DB_HOST),
      sessionSecret: Boolean(process.env.SESSION_SECRET),
      imagekit: Boolean(process.env.IMAGEKIT_PRIVATE_KEY && process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY),
    },
  };

  if (probeDatabase) {
    const result = await pingDatabase();
    body.database = result;
    body.ok = result.ok;
  }

  return NextResponse.json(body, {
    status: body.ok ? 200 : 503,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
