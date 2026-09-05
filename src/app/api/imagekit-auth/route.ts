import { createHmac, randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Generates the short-lived signature ImageKit requires for client-side uploads.
// The private key never leaves the server. Coaches use this for meal/exercise media;
// clients use it for weekly progress photos — both still require a valid session.
export async function GET() {
  const session = await readSession();
  if (!session || !["coach", "client"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!privateKey) {
    return NextResponse.json({ error: "ImageKit is not configured." }, { status: 500 });
  }

  const token = randomUUID();
  const expire = Math.floor(Date.now() / 1000) + 2400; // valid ~40 minutes (must be < 1 hour)
  const signature = createHmac("sha1", privateKey).update(token + expire).digest("hex");

  return NextResponse.json({ token, expire: String(expire), signature });
}
