import "server-only";

import { redirect } from "next/navigation";
import { database } from "@/lib/db";
import type { ThemePreference } from "@/components/dashboard/theme-sync";

function notificationLabel(value: unknown) {
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "Recently" : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

export async function loadDashboardShell(userId: number) {
  const [user, saved, notificationRows, unreadNotificationRow, messageRows, unreadMessageRow] = await Promise.all([
    database()("users").select("name", "email", "avatar_path", "role").where({ id: userId }).first(),
    database()("user_settings").select("theme").where({ user_id: userId }).first(),
    database()("notifications")
      .select("notifications.id", "notifications.title", "notifications.message", "notifications.read_at", "notifications.created_at", "sender.name as sender_name")
      .leftJoin("users as sender", "sender.id", "notifications.sender_id")
      .where({ "notifications.user_id": userId })
      .orderBy("notifications.created_at", "desc")
      .limit(6),
    database()("notifications").where({ user_id: userId }).whereNull("read_at").count({ total: "*" }).first(),
    database()("messages")
      .select("messages.id", "messages.body", "messages.read_at", "messages.created_at", "sender.id as sender_id", "sender.name as sender_name")
      .join("users as sender", "sender.id", "messages.sender_id")
      .where({ "messages.recipient_id": userId })
      .orderBy("messages.created_at", "desc")
      .limit(6),
    database()("messages").where({ recipient_id: userId }).whereNull("read_at").count({ total: "*" }).first(),
  ]);
  // A session cookie outlives its user row for up to a week (deleted account,
  // restored database). Reading `.role` off undefined would crash the layout
  // with no way back, so hand them a clean slate instead.
  if (!user) redirect("/api/reset");

  const theme: ThemePreference = saved?.theme === "light" || saved?.theme === "dark" ? saved.theme : "system";
  const role = String(user.role || "client");
  const notifications = [
    ...notificationRows.map((item) => ({
      id: Number(item.id),
      kind: "notification" as const,
      title: String(item.title),
      message: String(item.message),
      createdLabel: notificationLabel(item.created_at),
      createdTimestamp: new Date(String(item.created_at)).getTime(),
      isRead: Boolean(item.read_at),
      senderName: item.sender_name ? String(item.sender_name) : "SoFit",
      href: `/${role}/settings#notifications`,
    })),
    ...messageRows.map((item) => ({
      id: Number(item.id),
      kind: "message" as const,
      title: `New message from ${String(item.sender_name)}`,
      message: String(item.body),
      createdLabel: notificationLabel(item.created_at),
      createdTimestamp: new Date(String(item.created_at)).getTime(),
      isRead: Boolean(item.read_at),
      senderName: String(item.sender_name),
      href: role === "coach" ? `/coach/messages?client=${Number(item.sender_id)}` : "/client/messages",
    })),
  ]
    .sort((a, b) => b.createdTimestamp - a.createdTimestamp)
    .slice(0, 6);
  const unreadMessageCount = Number(unreadMessageRow?.total || 0);
  return {
    user: { name: String(user.name), email: String(user.email), avatarPath: user.avatar_path ? String(user.avatar_path) : null },
    theme,
    unreadCount: Number(unreadNotificationRow?.total || 0) + unreadMessageCount,
    unreadMessageCount,
    notifications,
  };
}
