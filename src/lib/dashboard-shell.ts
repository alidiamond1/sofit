import "server-only";

import { database } from "@/lib/db";
import type { ThemePreference } from "@/components/dashboard/theme-sync";

function notificationLabel(value: unknown) {
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "Recently" : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

export async function loadDashboardShell(userId: number) {
  const [user, saved, rows, unreadRow] = await Promise.all([
    database()("users").select("name", "email", "avatar_path").where({ id: userId }).first(),
    database()("user_settings").select("theme").where({ user_id: userId }).first(),
    database()("notifications")
      .select("notifications.id", "notifications.title", "notifications.message", "notifications.read_at", "notifications.created_at", "sender.name as sender_name")
      .leftJoin("users as sender", "sender.id", "notifications.sender_id")
      .where({ "notifications.user_id": userId })
      .orderBy("notifications.created_at", "desc")
      .limit(6),
    database()("notifications").where({ user_id: userId }).whereNull("read_at").count({ total: "*" }).first(),
  ]);
  const theme: ThemePreference = saved?.theme === "light" || saved?.theme === "dark" ? saved.theme : "system";
  return {
    user: { name: String(user.name), email: String(user.email), avatarPath: user.avatar_path ? String(user.avatar_path) : null },
    theme,
    unreadCount: Number(unreadRow?.total || 0),
    notifications: rows.map((item) => ({
      id: Number(item.id),
      title: String(item.title),
      message: String(item.message),
      createdLabel: notificationLabel(item.created_at),
      isRead: Boolean(item.read_at),
      senderName: item.sender_name ? String(item.sender_name) : "SoFit",
    })),
  };
}
