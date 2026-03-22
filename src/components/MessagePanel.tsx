"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { useLanguage } from "@/translations/LanguageContext";

interface MessageItem {
  _id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  content: string;
  originalContent?: string;
  isTranslated?: boolean;
  createdAt: string;
}

interface RecipientOption {
  id: string;
  name: string;
}

interface MessagesPayload {
  messages?: MessageItem[];
  message?: MessageItem;
  recipients?: RecipientOption[];
  isCoordinator?: boolean;
  error?: string;
}

export default function MessagePanel({
  planId,
  currentUserId,
}: {
  planId: string;
  currentUserId: string;
}) {
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [recipients, setRecipients] = useState<RecipientOption[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState("");
  const [draft, setDraft] = useState("");
  const [translateToEnglish, setTranslateToEnglish] = useState(false);
  const [isCoordinator, setIsCoordinator] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOriginalById, setShowOriginalById] = useState<Record<string, boolean>>({});

  const hasRecipients = recipients.length > 0;

  const loadMessages = async (showLoader = false, silent = false) => {
    if (showLoader) {
      setLoading(true);
    }

    try {
      const response = await fetch(`/api/plan/${planId}/messages`, { cache: "no-store" });
      const payload = (await response.json()) as MessagesPayload;

      if (!response.ok) {
        throw new Error(payload.error || "Failed to load messages.");
      }

      setMessages(payload.messages || []);
      setRecipients(payload.recipients || []);
      setIsCoordinator(Boolean(payload.isCoordinator));
      setSelectedRecipientId((current) => current || payload.recipients?.[0]?.id || "");
      setError(null);
    } catch (nextError: unknown) {
      if (!silent) {
        setError(nextError instanceof Error ? nextError.message : "Failed to load messages.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMessages(true);

    const intervalId = window.setInterval(() => {
      void loadMessages(false, true);
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [planId]);

  const recipientLabel = useMemo(() => {
    if (!selectedRecipientId) {
      return "";
    }

    return recipients.find((recipient) => recipient.id === selectedRecipientId)?.name || "";
  }, [recipients, selectedRecipientId]);

  const handleSend = async () => {
    const content = draft.trim();
    if (!content || !hasRecipients) {
      return;
    }

    const recipientId = isCoordinator ? selectedRecipientId : recipients[0]?.id || "";
    const shouldTranslate = translateToEnglish;
    const tempId = `temp-${Date.now()}`;

    setSending(true);
    setError(null);

    if (!shouldTranslate) {
      const optimistic: MessageItem = {
        _id: tempId,
        senderId: currentUserId,
        senderName: "",
        receiverId: recipientId,
        receiverName: recipients.find((r) => r.id === recipientId)?.name || "",
        content,
        createdAt: new Date().toISOString(),
      };

      setMessages((current) => [...current, optimistic]);
      setDraft("");
    }

    try {
      const response = await fetch(`/api/plan/${planId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          recipientId: isCoordinator ? selectedRecipientId : undefined,
          translateToEnglish: shouldTranslate,
          localizedContent: shouldTranslate && language !== "en" ? content : undefined,
          sourceLanguage: shouldTranslate ? language : undefined,
          viewerLanguage: language,
        }),
      });
      const payload = (await response.json()) as MessagesPayload;

      if (!response.ok || !payload.message) {
        if (!shouldTranslate) {
          setMessages((current) => current.filter((m) => m._id !== tempId));
          setDraft(content);
        }
        throw new Error(payload.error || "Failed to send message.");
      }

      if (shouldTranslate) {
        setMessages((current) => [...current, payload.message as MessageItem]);
        setDraft("");
      } else {
        setMessages((current) => current.map((m) => (m._id === tempId ? (payload.message as MessageItem) : m)));
      }

      setTranslateToEnglish(false);
    } catch (nextError: unknown) {
      setError(nextError instanceof Error ? nextError.message : "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section id="care-team-messages" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <MessageSquare size={18} className="text-blue-600" />
            {t("careTeamMessages")}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {hasRecipients ? t("messagePanelSubtitle") : t("messagesUnavailable")}
          </p>
        </div>
        <button
          onClick={() => void loadMessages(true)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          type="button"
        >
          {t("refreshMessages")}
        </button>
      </div>

      <div className="min-h-52 rounded-xl border border-slate-200 bg-slate-50 p-4">
        {error && (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
        {loading ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-500">
            <Loader2 size={16} className="mr-2 animate-spin" />
            {t("loading")}
          </div>
        ) : messages.length === 0 && !error ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-500">
            {hasRecipients ? t("noMessagesYet") : t("messagesUnavailable")}
          </div>
        ) : (
          <div className="flex max-h-96 flex-col gap-3 overflow-y-auto pr-1">
            {messages.map((message) => {
              const isOwnMessage = message.senderId === currentUserId;
              const showOriginal = Boolean(showOriginalById[message._id]);
              const displayedContent = showOriginal && message.originalContent ? message.originalContent : message.content;

              return (
                <div
                  key={message._id}
                  className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                    isOwnMessage
                      ? "self-end bg-blue-600 text-white"
                      : "self-start border border-slate-200 bg-white text-slate-800"
                  }`}
                >
                  <div className={`mb-1 text-xs font-medium ${isOwnMessage ? "text-blue-100" : "text-slate-500"}`}>
                    {isOwnMessage ? t("you") : message.senderName}
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-6">{displayedContent}</p>
                  {message.isTranslated && message.originalContent && (
                    <button
                      type="button"
                      onClick={() =>
                        setShowOriginalById((current) => ({
                          ...current,
                          [message._id]: !current[message._id],
                        }))
                      }
                      className={`mt-2 text-xs font-medium underline underline-offset-2 ${
                        isOwnMessage ? "text-blue-100" : "text-slate-500"
                      }`}
                    >
                      {showOriginal ? t("showTranslation") : t("showOriginal")}
                    </button>
                  )}
                  <div className={`mt-2 text-[11px] ${isOwnMessage ? "text-blue-100" : "text-slate-400"}`}>
                    {new Intl.DateTimeFormat(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    }).format(new Date(message.createdAt))}
                    {message.isTranslated ? ` · ${t("translatedForYou")}` : ""}
                    {isCoordinator && !isOwnMessage && message.receiverId === currentUserId ? ` · ${t("from")}: ${message.senderName}` : ""}
                    {isCoordinator && isOwnMessage && message.receiverName ? ` · ${t("to")}: ${message.receiverName}` : ""}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {isCoordinator && recipients.length > 0 && (
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            <span className="font-medium">{t("chooseRecipient")}</span>
            <select
              value={selectedRecipientId}
              onChange={(event) => setSelectedRecipientId(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
            >
              {recipients.map((recipient) => (
                <option key={recipient.id} value={recipient.id}>
                  {recipient.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {!isCoordinator && recipientLabel && (
          <p className="text-sm text-slate-500">
            {t("messagingWith")}: {recipientLabel}
          </p>
        )}

        <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={translateToEnglish}
            onChange={(event) => setTranslateToEnglish(event.target.checked)}
            disabled={sending || !hasRecipients}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span>
            <span className="font-medium">{t("translateToEnglish")}</span>
            {translateToEnglish && <span className="mt-1 block text-xs text-slate-500">{t("translateToEnglishHint")}</span>}
          </span>
        </label>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={hasRecipients ? t("messagePlaceholder") : t("messagesUnavailable")}
            rows={4}
            disabled={!hasRecipients || sending}
            className="min-h-28 flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100"
          />
          <button
            onClick={handleSend}
            type="button"
            disabled={sending || !draft.trim() || !hasRecipients || (isCoordinator && !selectedRecipientId)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {sending ? t("sendingMessage") : t("sendMessage")}
          </button>
        </div>
      </div>
    </section>
  );
}