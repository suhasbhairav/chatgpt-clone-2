"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useApp } from "./AppProvider";
import ChatHeader from "./ChatHeader";
import Composer from "./Composer";
import Icon from "./Icons";
import { AssistantMessage, UserMessage } from "./Message";
import { getAssistant } from "@/lib/assistants";

export function AssistantIntro({ assistant, onPick }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: assistant.tint, color: assistant.ink }}>
        <Icon name={assistant.icon} size={28} />
      </span>
      <div>
        <h1 className="text-[24px] font-semibold">{assistant.name}</h1>
        <p className="mx-auto mt-1 max-w-[440px] text-[15px] text-muted">{assistant.description}</p>
      </div>
      <div className="mt-2 grid w-full max-w-[640px] gap-2 sm:grid-cols-3">
        {assistant.starters.map((s) => (
          <button key={s} type="button" onClick={() => onPick(s)} className="rounded-2xl border border-line p-3 text-left text-[14px] hover:bg-hover">
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ChatView({ id }) {
  const { chats, ready, streaming, sendMessage, regenerate, editAndResend, setFeedback } = useApp();
  const chat = chats.find((c) => c.id === id);
  const scrollRef = useRef(null);
  const stickRef = useRef(true);
  const [showJump, setShowJump] = useState(false);
  const lastContent = chat?.messages[chat.messages.length - 1]?.content.length ?? 0;
  const count = chat?.messages.length ?? 0;

  useEffect(() => {
    stickRef.current = true;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [id, ready]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [lastContent, count]);

  useEffect(() => {
    if (chat) document.title = `${chat.title} · Assist`;
    return () => {
      document.title = "Assist";
    };
  }, [chat]);

  if (!ready) return <ChatHeader />;

  if (!chat) {
    return (
      <>
        <ChatHeader />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <h1 className="text-[22px] font-semibold">Chat not found</h1>
          <p className="max-w-[420px] text-[15px] text-muted">
            Chats are stored in this browser. This one may have been deleted, or it was created on another device.
          </p>
          <Link href="/" className="mt-2 rounded-full bg-accent px-5 py-2 text-[14px] font-medium text-on-accent no-underline hover:text-on-accent">
            Start a new chat
          </Link>
        </div>
      </>
    );
  }

  const assistant = chat.assistantId ? getAssistant(chat.assistantId) : null;
  const busyHere = streaming?.chatId === chat.id;
  const lastAssistantIdx = chat.messages.map((m) => m.role).lastIndexOf("assistant");

  return (
    <>
      <ChatHeader chat={chat} />
      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          stickRef.current = near;
          setShowJump(!near);
        }}
        className="scroll-thin relative flex min-h-0 flex-1 flex-col overflow-y-auto"
      >
        {chat.messages.length === 0 && assistant ? (
          <AssistantIntro assistant={assistant} onPick={(s) => sendMessage({ chatId: chat.id, content: s })} />
        ) : chat.messages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-[24px] font-medium">What can I help with?</div>
        ) : (
          <div className="mx-auto flex w-full max-w-[768px] flex-col gap-7 px-4 pb-8 pt-6 md:px-6">
            {assistant ? (
              <div className="flex items-center gap-2 self-center rounded-full border border-line px-3 py-1 text-[13px] text-muted">
                <span className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: assistant.tint, color: assistant.ink }}>
                  <Icon name={assistant.icon} size={12} />
                </span>
                {assistant.name}
              </div>
            ) : null}
            {chat.messages.map((m, i) =>
              m.role === "user" ? (
                <UserMessage key={m.id} message={m} disabled={busyHere} onEdit={(v) => editAndResend(chat.id, m.id, v)} />
              ) : (
                <AssistantMessage
                  key={m.id}
                  message={m}
                  isLast={i === lastAssistantIdx && !busyHere}
                  onFeedback={(v) => setFeedback(chat.id, m.id, v)}
                  onRegenerate={busyHere ? null : () => regenerate(chat.id, m.id)}
                />
              )
            )}
          </div>
        )}
      </div>
      <div className="relative">
        {showJump ? (
          <button
            type="button"
            aria-label="Scroll to bottom"
            onClick={() => {
              const el = scrollRef.current;
              el?.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
            }}
            className="absolute -top-12 left-1/2 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-line bg-bg shadow-md hover:bg-hover"
          >
            <Icon name="chevronDown" size={18} />
          </button>
        ) : null}
        <Composer chatId={chat.id} autoFocus placeholder={assistant ? `Message ${assistant.name}` : "Ask anything"} />
      </div>
    </>
  );
}
