"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AssistantMessage, UserMessage } from "./Message";
import { KEYS, load, save } from "@/lib/storage";
import { uid } from "@/lib/utils";
import { getModel } from "@/lib/assistants";

export default function ShareView() {
  const { id } = useParams();
  const router = useRouter();
  const [state, setState] = useState({ status: "loading", data: null, source: null });

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/share/${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => !cancelled && setState({ status: "ok", data, source: "server" }))
      .catch(() => {
        // Server store is in-memory; fall back to the copy saved in this browser.
        const local = load(KEYS.shares, {})[id];
        if (!cancelled) setState(local ? { status: "ok", data: local, source: "local" } : { status: "missing", data: null });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const continueChat = () => {
    const d = state.data;
    const now = Date.now();
    const chatId = uid("c");
    const chat = {
      id: chatId,
      title: d.title,
      createdAt: now,
      updatedAt: now,
      pinned: false,
      model: d.model || "assist-5",
      messages: d.messages.map((m) => ({ id: uid("m_"), role: m.role, content: m.content, createdAt: now, attachments: (m.attachments || []).map((a) => ({ ...a, content: "" })) })),
    };
    const chats = load(KEYS.chats, null);
    save(KEYS.chats, [chat, ...(Array.isArray(chats) ? chats : [])]);
    save(KEYS.seeded, true);
    router.push(`/c/${chatId}`);
  };

  return (
    <div className="min-h-dvh bg-bg font-sans text-fg">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-line bg-bg/95 px-4 backdrop-blur md:px-6">
        <Link href="/" className="flex items-center gap-2 text-[18px] font-semibold no-underline">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0D0D0D] text-[13px] font-semibold text-white dark:bg-[#ECECEC] dark:text-[#0D0D0D]">A</span>
          Assist
        </Link>
        <Link href="/" className="rounded-[18px] border border-line px-[14px] py-2 text-[14px] no-underline hover:bg-hover">
          Try Assist
        </Link>
      </header>

      {state.status === "loading" ? <p className="py-20 text-center text-[14px] text-muted">Loading shared chat...</p> : null}
      {state.status === "missing" ? (
        <div className="mx-auto max-w-[520px] px-6 py-24 text-center">
          <h1 className="text-[22px] font-semibold">This shared link is not available</h1>
          <p className="mt-2 text-[15px] text-muted">
            Shared chats in this demo live in server memory and in the sharer&apos;s browser. The server may have restarted since the link was created.
          </p>
          <Link href="/" className="mt-6 inline-block rounded-full bg-accent px-5 py-2 text-[14px] font-medium text-on-accent no-underline hover:text-on-accent">
            Start a new chat
          </Link>
        </div>
      ) : null}
      {state.status === "ok" ? (
        <main className="mx-auto w-full max-w-[768px] px-4 pb-40 pt-8 md:px-6">
          <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.01em]">{state.data.title}</h1>
          <p className="mt-2 text-[14px] text-muted">
            Shared conversation · {getModel(state.data.model).label} ·{" "}
            {new Date(state.data.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
            {state.source === "local" ? " · loaded from this browser" : ""}
          </p>
          <p className="mt-4 rounded-xl bg-sidebar px-4 py-3 text-[13px] text-muted">
            This is a read-only copy of a conversation shared from Assist. Attachments are listed by name only.
          </p>
          <div className="mt-8 flex flex-col gap-7">
            {state.data.messages.map((m, i) =>
              m.role === "user" ? (
                <UserMessage key={i} message={{ ...m, attachments: m.attachments?.map((a) => ({ ...a, size: 0 })) }} readOnly />
              ) : (
                <AssistantMessage key={i} message={m} readOnly />
              )
            )}
          </div>
        </main>
      ) : null}

      {state.status === "ok" ? (
        <div className="fixed inset-x-0 bottom-0 border-t border-line bg-bg/95 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-[768px] flex-col items-center justify-between gap-3 px-6 sm:flex-row">
            <p className="text-[14px] text-muted">Want to keep going? Copy this chat into your own history.</p>
            <button type="button" onClick={continueChat} className="rounded-full bg-accent px-5 py-2 text-[14px] font-medium text-on-accent">
              Continue this conversation
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
