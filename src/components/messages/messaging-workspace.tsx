"use client";

import {
  ArrowLeft,
  Check,
  CheckCheck,
  Inbox,
  MessageCircleMore,
  Search,
  SendHorizontal,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
} from "react";
import {
  markConversationReadAction,
  sendMessageAction,
} from "@/app/actions/messages";
import type { UserRole } from "@/lib/db";
import type { ChatMessage, MessageThread } from "@/lib/messages";
import { Avatar } from "@/components/dashboard/primitives";

const dayFormat = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "Africa/Nairobi",
});
const timeFormat = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Africa/Nairobi",
});
const shortDateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "Africa/Nairobi",
});
const dayKeyFormat = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Africa/Nairobi",
});

function dayKey(value: string) {
  return dayKeyFormat.format(new Date(value));
}

function relativeMessageTime(value: string | null) {
  if (!value) return "New chat";
  const date = new Date(value);
  const now = new Date();
  const sameDay = dayKey(date.toISOString()) === dayKey(now.toISOString());
  return sameDay ? timeFormat.format(date) : shortDateFormat.format(date);
}

function ConversationMessages({
  messages,
  currentUserId,
}: {
  messages: ChatMessage[];
  currentUserId: number;
}) {
  if (!messages.length) {
    return (
      <div className="message-empty-state">
        <span><MessageCircleMore size={24} /></span>
        <strong>Start the conversation</strong>
        <p>Ask a question, share an update, or discuss the client&apos;s current coaching needs.</p>
      </div>
    );
  }

  return messages.map((message, index) => {
    const currentDay = dayKey(message.createdAt);
    const showDay = index === 0 || currentDay !== dayKey(messages[index - 1].createdAt);
    const outgoing = message.senderId === currentUserId;
    return (
      <div className="message-sequence" key={message.id}>
        {showDay ? <div className="message-day-divider"><span>{dayFormat.format(new Date(message.createdAt))}</span></div> : null}
        <div className={outgoing ? "message-bubble-row is-outgoing" : "message-bubble-row is-incoming"}>
          <div className="message-bubble">
            <p>{message.body}</p>
            <footer>
              <time dateTime={message.createdAt}>{timeFormat.format(new Date(message.createdAt))}</time>
              {outgoing ? (
                <span aria-label={message.readAt ? "Read" : "Sent"} title={message.readAt ? "Read" : "Sent"}>
                  {message.readAt ? <CheckCheck size={13} /> : <Check size={13} />}
                </span>
              ) : null}
            </footer>
          </div>
        </div>
      </div>
    );
  });
}

export function MessagingWorkspace({
  role,
  currentUserId,
  threads,
  initialParticipantId,
}: {
  role: UserRole;
  currentUserId: number;
  threads: MessageThread[];
  initialParticipantId?: number | null;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const initialId = threads.some((thread) => thread.participantId === initialParticipantId)
    ? initialParticipantId!
    : threads[0]?.participantId ?? null;
  const [selectedId, setSelectedId] = useState<number | null>(initialId);
  const [chatOpen, setChatOpen] = useState(role === "client" || Boolean(initialParticipantId));
  const [messageState, messageAction, messagePending] = useActionState(
    sendMessageAction.bind(null, role),
    {},
  );
  const [, startReadTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const lastMarkedRef = useRef<string>("");

  const filteredThreads = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return threads;
    return threads.filter((thread) =>
      [thread.participantName, thread.participantEmail, thread.contextLabel]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [query, threads]);

  const selectedThread =
    threads.find((thread) => thread.participantId === selectedId) || threads[0] || null;
  const latestUnread = selectedThread?.messages.findLast(
    (message) => message.recipientId === currentUserId && !message.readAt,
  );

  useEffect(() => {
    if (!selectedThread || !latestUnread) return;
    const markKey = `${selectedThread.participantId}:${latestUnread.id}`;
    if (lastMarkedRef.current === markKey) return;
    lastMarkedRef.current = markKey;
    startReadTransition(async () => {
      await markConversationReadAction(role, selectedThread.participantId);
      router.refresh();
    });
  }, [latestUnread, role, router, selectedThread]);

  useEffect(() => {
    historyRef.current?.scrollTo({ top: historyRef.current.scrollHeight, behavior: "smooth" });
  }, [selectedThread?.messages.length, selectedThread?.participantId]);

  useEffect(() => {
    if (!messageState.sentAt) return;
    formRef.current?.reset();
    router.refresh();
  }, [messageState.sentAt, router]);

  function openThread(participantId: number) {
    setSelectedId(participantId);
    setChatOpen(true);
  }

  function submitWithEnter(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (!messagePending && event.currentTarget.value.trim()) formRef.current?.requestSubmit();
  }

  const totalUnread = threads.reduce((total, thread) => total + thread.unreadCount, 0);
  return (
    <section className={chatOpen ? "messaging-workspace is-chat-open" : "messaging-workspace"}>
      <aside className="messaging-directory" aria-label={role === "coach" ? "Client conversations" : "Coach conversation"}>
        <header className="messaging-directory-head">
          <div>
            <span className="eyebrow">Inbox</span>
            <strong>{role === "coach" ? "Client conversations" : "Your coach"}</strong>
            <small>{totalUnread ? `${totalUnread} unread message${totalUnread === 1 ? "" : "s"}` : "All messages are read"}</small>
          </div>
          <span className="message-inbox-icon"><Inbox size={19} /></span>
        </header>

        {role === "coach" && threads.length > 1 ? (
          <label className="message-thread-search">
            <Search size={16} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search clients"
              aria-label="Search client conversations"
            />
          </label>
        ) : null}

        <div className="message-thread-list">
          {filteredThreads.map((thread, index) => {
            const active = selectedThread?.participantId === thread.participantId;
            const unread = active ? 0 : thread.unreadCount;
            return (
              <button
                type="button"
                className={active ? "message-thread-row is-active" : "message-thread-row"}
                onClick={() => openThread(thread.participantId)}
                key={thread.participantId}
                aria-current={active ? "true" : undefined}
              >
                <Avatar name={thread.participantName} src={thread.participantAvatarPath} tone={index + 1} />
                <span className="message-thread-copy">
                  <span className="message-thread-title"><strong>{thread.participantName}</strong><time>{relativeMessageTime(thread.lastMessageAt)}</time></span>
                  <span className="message-thread-context">{thread.contextLabel}</span>
                  <span className={unread ? "message-thread-preview has-unread" : "message-thread-preview"}>
                    {thread.lastMessage || "No messages yet — open the chat to begin."}
                  </span>
                </span>
                {unread ? <b className="message-unread-count" aria-label={`${unread} unread messages`}>{unread > 9 ? "9+" : unread}</b> : null}
              </button>
            );
          })}
          {!filteredThreads.length ? (
            <div className="message-directory-empty"><Search size={18} /><strong>No conversations found</strong><span>Try a different client name or email.</span></div>
          ) : null}
        </div>
        <footer className="message-directory-foot"><ShieldCheck size={15} /><span>Private coach-client conversations</span></footer>
      </aside>

      <section className="messaging-panel" aria-label="Selected conversation">
        {selectedThread ? (
          <>
            <header className="messaging-panel-head">
              <button className="message-back-button" type="button" onClick={() => setChatOpen(false)} aria-label="Back to conversations"><ArrowLeft size={19} /></button>
              <Avatar name={selectedThread.participantName} src={selectedThread.participantAvatarPath} className="message-header-avatar" />
              <div>
                <strong>{selectedThread.participantName}</strong>
                <span>{selectedThread.contextLabel} <i /> {selectedThread.statusLabel}</span>
              </div>
              <span className="message-privacy-label"><ShieldCheck size={14} /> Private</span>
            </header>

            <div className="message-history-panel" ref={historyRef} aria-live="polite">
              <ConversationMessages messages={selectedThread.messages} currentUserId={currentUserId} />
            </div>

            <form className="message-composer" action={messageAction} ref={formRef}>
              <input type="hidden" name="recipient_id" value={selectedThread.participantId} />
              <div className="message-composer-field">
                <textarea
                  name="body"
                  rows={1}
                  maxLength={5000}
                  placeholder={role === "coach" ? `Message ${selectedThread.participantName}` : "Message your coach"}
                  aria-label="Message"
                  onKeyDown={submitWithEnter}
                  required
                  disabled={messagePending}
                />
                <span>Enter to send · Shift + Enter for a new line</span>
              </div>
              <button type="submit" disabled={messagePending} aria-label="Send message">
                <SendHorizontal size={18} />
                <span>{messagePending ? "Sending" : "Send"}</span>
              </button>
              {messageState.error ? <p className="message-form-status is-error" role="alert">{messageState.error}</p> : null}
              {messageState.success ? <p className="message-form-status is-success" aria-live="polite">{messageState.success}</p> : null}
            </form>
          </>
        ) : (
          <div className="message-no-conversation">
            <span><Inbox size={25} /></span>
            <strong>No clients are ready to message</strong>
            <p>Approved coaching clients will appear here automatically.</p>
          </div>
        )}
      </section>
    </section>
  );
}
