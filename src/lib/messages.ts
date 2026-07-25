import "server-only";

import { database } from "@/lib/db";

export type ChatMessage = {
  id: number;
  senderId: number;
  recipientId: number;
  body: string;
  createdAt: string;
  readAt: string | null;
};

export type MessageThread = {
  participantId: number;
  participantName: string;
  participantEmail: string;
  participantAvatarPath: string | null;
  contextLabel: string;
  statusLabel: string;
  messages: ChatMessage[];
  unreadCount: number;
  lastMessage: string | null;
  lastMessageAt: string | null;
};

function isoDate(value: unknown) {
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
}

function mapMessage(row: Record<string, unknown>): ChatMessage {
  return {
    id: Number(row.id),
    senderId: Number(row.sender_id),
    recipientId: Number(row.recipient_id),
    body: String(row.body),
    createdAt: isoDate(row.created_at),
    readAt: row.read_at ? isoDate(row.read_at) : null,
  };
}

function buildThread(
  participant: Record<string, unknown>,
  messages: ChatMessage[],
  currentUserId: number,
): MessageThread {
  const last = messages.at(-1);
  return {
    participantId: Number(participant.id),
    participantName: String(participant.name),
    participantEmail: String(participant.email),
    participantAvatarPath: participant.avatar_path ? String(participant.avatar_path) : null,
    contextLabel: String(participant.context_label || "SoFit coaching"),
    statusLabel: String(participant.status_label || "Active"),
    messages,
    unreadCount: messages.filter(
      (message) => message.recipientId === currentUserId && !message.readAt,
    ).length,
    lastMessage: last?.body || null,
    lastMessageAt: last?.createdAt || null,
  };
}

export async function loadCoachMessageThreads(coachId: number) {
  const db = database();
  const clients = (await db("users")
    .select(
      "users.id",
      "users.name",
      "users.email",
      "users.avatar_path",
      "clients.status as status_label",
      db.raw("COALESCE(packages.name, services.name, 'Coaching client') as context_label"),
    )
    .innerJoin("clients", "clients.user_id", "users.id")
    .leftJoin("services", "services.id", "clients.service_id")
    .leftJoin("packages", "packages.id", "clients.package_id")
    .where({
      "users.role": "client",
      "users.is_active": true,
      "users.approval_status": "approved",
    })
    .whereNot("clients.status", "churned")
    .orderBy("users.name")) as Array<Record<string, unknown>>;

  const clientIds = clients.map((client) => Number(client.id));
  const rows = clientIds.length
    ? ((await db("messages")
        .select("id", "sender_id", "recipient_id", "body", "read_at", "created_at")
        .where(function conversationScope() {
          this.where(function sentByCoach() {
            this.where("sender_id", coachId).whereIn("recipient_id", clientIds);
          }).orWhere(function sentToCoach() {
            this.where("recipient_id", coachId).whereIn("sender_id", clientIds);
          });
        })
        .orderBy("created_at", "desc")
        .limit(2000)) as Array<Record<string, unknown>>).reverse()
    : [];

  const mapped = rows.map(mapMessage);
  return clients
    .map((client) => {
      const clientId = Number(client.id);
      return buildThread(
        client,
        mapped.filter(
          (message) => message.senderId === clientId || message.recipientId === clientId,
        ),
        coachId,
      );
    })
    .sort((a, b) => {
      if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
      if (a.lastMessageAt && b.lastMessageAt) return b.lastMessageAt.localeCompare(a.lastMessageAt);
      if (a.lastMessageAt) return -1;
      if (b.lastMessageAt) return 1;
      return a.participantName.localeCompare(b.participantName);
    });
}

export async function loadClientMessageThreads(clientUserId: number) {
  const db = database();
  const coach = (await db("users")
    .select("id", "name", "email", "avatar_path")
    .where({ role: "coach", is_active: true })
    .orderBy("id")
    .first()) as Record<string, unknown> | undefined;

  if (!coach) return [];
  coach.context_label = "Your SoFit coach";
  coach.status_label = "Coach";
  const coachId = Number(coach.id);
  const rows = (await db("messages")
    .select("id", "sender_id", "recipient_id", "body", "read_at", "created_at")
    .where(function conversationScope() {
      this.where({ sender_id: clientUserId, recipient_id: coachId }).orWhere({
        sender_id: coachId,
        recipient_id: clientUserId,
      });
    })
    .orderBy("created_at", "asc")) as Array<Record<string, unknown>>;

  return [buildThread(coach, rows.map(mapMessage), clientUserId)];
}
