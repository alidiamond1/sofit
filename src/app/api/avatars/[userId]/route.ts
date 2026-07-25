import { readSession } from "@/lib/auth/session";
import { database } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: RouteContext<"/api/avatars/[userId]">) {
  const session = await readSession();
  if (!session) return new Response(null, { status: 401 });

  const { userId: rawUserId } = await context.params;
  const userId = Number(rawUserId);
  if (!Number.isSafeInteger(userId) || userId < 1) return new Response(null, { status: 400 });

  const avatar = await database()("user_avatars")
    .select("mime_type", "image_data", "size_bytes")
    .where({ user_id: userId })
    .first();

  if (!avatar) return new Response(null, { status: 404 });

  return new Response(new Uint8Array(avatar.image_data), {
    headers: {
      "Cache-Control": "private, max-age=31536000, immutable",
      "Content-Length": String(avatar.size_bytes),
      "Content-Type": String(avatar.mime_type),
      "X-Content-Type-Options": "nosniff",
    },
  });
}
