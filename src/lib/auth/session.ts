import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify, SignJWT } from "jose";
import type { UserRole } from "@/lib/db";

const COOKIE_NAME = "sofit_session";
const SESSION_LENGTH = 60 * 60 * 24 * 7;

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  approvalStatus: "pending" | "approved" | "rejected";
};

function sessionKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be configured in production.");
  }
  return new TextEncoder().encode(secret || "sofit-local-development-secret-change-me");
}

export async function createSession(user: SessionUser) {
  const expiresAt = new Date(Date.now() + SESSION_LENGTH * 1000);
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(sessionKey());

  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function readSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionKey(), { algorithms: ["HS256"] });
    return {
      id: Number(payload.id),
      name: String(payload.name),
      email: String(payload.email),
      role: payload.role as UserRole,
      approvalStatus: String(payload.approvalStatus || "approved") as SessionUser["approvalStatus"],
    };
  } catch {
    return null;
  }
}

export async function requireRole(role: UserRole) {
  const session = await readSession();
  if (!session) redirect("/");
  if (session.role !== role) redirect(session.role === "coach" ? "/coach" : "/client");
  if (session.role === "client" && session.approvalStatus !== "approved") {
    redirect("/application-pending");
  }
  return session;
}

export async function destroySession() {
  (await cookies()).delete(COOKIE_NAME);
}
