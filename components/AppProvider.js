"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { KEYS, load, remove, save } from "@/lib/storage";
import { buildSeed } from "@/lib/seed";
import { messageToApiContent, uid } from "@/lib/utils";
import { getModel } from "@/lib/assistants";

const Ctx = createContext(null);

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside <AppProvider>");
  return v;
}

const DEFAULT_SETTINGS = { theme: "light", model: "assist-5", sidebarCollapsed: false, search: false, think: false };

function applyTheme(theme) {
  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

// Reads our SSE protocol: lines of `data: {json}` separated by blank lines.
async function readEvents(res, onEvent) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const chunk = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      const line = chunk.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      try {
        onEvent(JSON.parse(line.slice(5).trim()));
      } catch {
        /* ignore malformed line */
      }
    }
  }
}

export default function AppProvider({ children }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [chats, setChats] = useState([]);
  const [library, setLibrary] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [streaming, setStreaming] = useState(null); // { chatId, messageId }
  const [serverMode, setServerMode] = useState(null);
  const [toast, setToast] = useState(null);
  const [ui, setUi] = useState({ search: false, settings: false, renameId: null, deleteId: null, drawer: false });
  const [draft, setDraft] = useState(null); // { attachments } handed from Library to the home composer

  const controllerRef = useRef(null);
  const chatsRef = useRef(chats);
  const toastTimer = useRef(null);

  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  // ---- load from localStorage (client only) ----
  useEffect(() => {
    let storedChats = load(KEYS.chats, null);
    let storedLib = load(KEYS.library, []);
    if (!Array.isArray(storedChats) || (!storedChats.length && !load(KEYS.seeded, false))) {
      const seed = buildSeed();
      storedChats = seed.chats;
      storedLib = seed.library;
      save(KEYS.seeded, true);
    }
    // Any reply that was mid-stream when the tab closed is marked as stopped.
    storedChats = storedChats.map((c) => ({
      ...c,
      messages: c.messages.map((m) => (m.streaming ? { ...m, streaming: false, stopped: true } : m)),
    }));
    const s = { ...DEFAULT_SETTINGS, ...load(KEYS.settings, {}) };
    setChats(storedChats);
    setLibrary(Array.isArray(storedLib) ? storedLib : []);
    setSettings(s);
    setReady(true);
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => setServerMode(d.mode))
      .catch(() => setServerMode("demo"));
  }, []);

  // ---- persistence (debounced) ----
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => {
      if (!save(KEYS.chats, chats)) {
        // Quota exceeded: drop stored file contents from messages and retry.
        save(
          KEYS.chats,
          chats.map((c) => ({ ...c, messages: c.messages.map((m) => ({ ...m, attachments: m.attachments?.map((a) => ({ ...a, content: "" })) })) }))
        );
      }
    }, 300);
    return () => clearTimeout(t);
  }, [chats, ready]);

  useEffect(() => {
    if (ready) save(KEYS.library, library);
  }, [library, ready]);

  useEffect(() => {
    if (!ready) return;
    save(KEYS.settings, settings);
    applyTheme(settings.theme);
    if (settings.theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const fn = () => applyTheme("system");
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, [settings, ready]);

  const showToast = useCallback((text) => {
    setToast({ text, id: Date.now() });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  const updateSettings = useCallback((patch) => setSettings((s) => ({ ...s, ...patch })), []);

  const patchChat = useCallback((chatId, fn) => {
    setChats((prev) => prev.map((c) => (c.id === chatId ? fn(c) : c)));
  }, []);

  const patchMessage = useCallback(
    (chatId, msgId, fn) => patchChat(chatId, (c) => ({ ...c, messages: c.messages.map((m) => (m.id === msgId ? fn(m) : m)) })),
    [patchChat]
  );

  // ---- streaming completion ----
  const runCompletion = useCallback(
    async (chatId, history) => {
      const chat = chatsRef.current.find((c) => c.id === chatId);
      const model = settings.model;
      const msgId = uid("m_");
      const flags = { search: settings.search, think: settings.think };
      const placeholder = { id: msgId, role: "assistant", content: "", createdAt: Date.now(), streaming: true, model, flags };
      patchChat(chatId, (c) => ({ ...c, updatedAt: Date.now(), messages: [...history, placeholder] }));

      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setStreaming({ chatId, messageId: msgId });

      let pending = "";
      let flushTimer = null;
      const flush = () => {
        flushTimer = null;
        if (!pending) return;
        const add = pending;
        pending = "";
        patchMessage(chatId, msgId, (m) => ({ ...m, content: m.content + add }));
      };

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            model,
            assistantId: chat?.assistantId || null,
            think: flags.think,
            search: flags.search,
            messages: history.filter((m) => !m.error).map((m) => ({ role: m.role, content: m.role === "user" ? messageToApiContent(m) : m.content })),
          }),
        });
        if (!res.ok || !res.body) {
          let msg = `Request failed (${res.status})`;
          try {
            msg = (await res.json()).error || msg;
          } catch {
            /* not json */
          }
          throw new Error(msg);
        }
        await readEvents(res, (evt) => {
          if (evt.type === "meta") {
            setServerMode(evt.mode);
            patchMessage(chatId, msgId, (m) => ({ ...m, mode: evt.mode }));
          } else if (evt.type === "delta") {
            pending += evt.text;
            if (!flushTimer) flushTimer = setTimeout(flush, 32);
          } else if (evt.type === "notice") {
            patchMessage(chatId, msgId, (m) => ({ ...m, notice: evt.text }));
          } else if (evt.type === "done") {
            clearTimeout(flushTimer);
            flush();
            patchMessage(chatId, msgId, (m) => ({ ...m, usage: evt.usage }));
          } else if (evt.type === "error") {
            throw new Error(evt.error);
          }
        });
        clearTimeout(flushTimer);
        flush();
        patchMessage(chatId, msgId, (m) => ({ ...m, streaming: false }));
      } catch (err) {
        clearTimeout(flushTimer);
        flush();
        if (controller.signal.aborted) {
          patchMessage(chatId, msgId, (m) => ({ ...m, streaming: false, stopped: true }));
        } else {
          patchMessage(chatId, msgId, (m) => ({ ...m, streaming: false, error: err.message || "Something went wrong" }));
        }
      } finally {
        if (controllerRef.current === controller) controllerRef.current = null;
        setStreaming((s) => (s?.messageId === msgId ? null : s));
      }
    },
    [patchChat, patchMessage, settings.model, settings.search, settings.think]
  );

  const autoTitle = useCallback(
    (chatId, text) => {
      fetch("/api/title", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) })
        .then((r) => r.json())
        .then(({ title }) => {
          if (title) patchChat(chatId, (c) => (c.title === "New chat" ? { ...c, title } : c));
        })
        .catch(() => {});
    },
    [patchChat]
  );

  const createChat = useCallback(
    ({ assistantId = null, navigate = true } = {}) => {
      const id = uid("c");
      const now = Date.now();
      const chat = { id, title: "New chat", createdAt: now, updatedAt: now, pinned: false, model: settings.model, assistantId, messages: [] };
      setChats((prev) => [chat, ...prev]);
      chatsRef.current = [chat, ...chatsRef.current];
      if (navigate) router.push(`/c/${id}`);
      return id;
    },
    [router, settings.model]
  );

  const sendMessage = useCallback(
    ({ chatId, content, attachments = [] }) => {
      const text = content.trim();
      if (!text && !attachments.length) return null;
      let id = chatId;
      let chat = id ? chatsRef.current.find((c) => c.id === id) : null;
      if (!chat) {
        id = createChat({ navigate: false });
        chat = chatsRef.current.find((c) => c.id === id);
        router.push(`/c/${id}`);
      }
      const userMsg = { id: uid("m_"), role: "user", content: text || "Summarise the attached file.", createdAt: Date.now(), attachments };
      if (attachments.length) {
        setLibrary((prev) => [...attachments.map((a) => ({ ...a, chatId: id, addedAt: Date.now() })), ...prev]);
      }
      const isFirst = !chat.messages.some((m) => m.role === "user");
      const history = [...chat.messages.filter((m) => !(m.role === "assistant" && m.error)), userMsg];
      if (isFirst && chat.title === "New chat") autoTitle(id, attachments.length ? `${text} (file: ${attachments[0].name})` : text);
      runCompletion(id, history);
      return id;
    },
    [autoTitle, createChat, router, runCompletion]
  );

  const regenerate = useCallback(
    (chatId, assistantMsgId) => {
      const chat = chatsRef.current.find((c) => c.id === chatId);
      if (!chat) return;
      const idx = chat.messages.findIndex((m) => m.id === assistantMsgId);
      if (idx < 0) return;
      runCompletion(chatId, chat.messages.slice(0, idx));
    },
    [runCompletion]
  );

  const editAndResend = useCallback(
    (chatId, userMsgId, newContent) => {
      const chat = chatsRef.current.find((c) => c.id === chatId);
      if (!chat || !newContent.trim()) return;
      const idx = chat.messages.findIndex((m) => m.id === userMsgId);
      if (idx < 0) return;
      const edited = { ...chat.messages[idx], content: newContent.trim(), editedAt: Date.now() };
      runCompletion(chatId, [...chat.messages.slice(0, idx), edited]);
    },
    [runCompletion]
  );

  const stop = useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  const renameChat = useCallback((chatId, title) => {
    const t = title.trim();
    if (t) patchChat(chatId, (c) => ({ ...c, title: t.slice(0, 120) }));
  }, [patchChat]);

  const togglePin = useCallback((chatId) => patchChat(chatId, (c) => ({ ...c, pinned: !c.pinned })), [patchChat]);

  const deleteChat = useCallback(
    (chatId) => {
      if (streaming?.chatId === chatId) controllerRef.current?.abort();
      setChats((prev) => prev.filter((c) => c.id !== chatId));
      if (window.location.pathname === `/c/${chatId}`) router.push("/");
      showToast("Chat deleted");
    },
    [router, showToast, streaming]
  );

  const setFeedback = useCallback(
    (chatId, msgId, value) => patchMessage(chatId, msgId, (m) => ({ ...m, feedback: m.feedback === value ? null : value })),
    [patchMessage]
  );

  const shareChat = useCallback(
    async (chatId) => {
      const chat = chatsRef.current.find((c) => c.id === chatId);
      if (!chat || !chat.messages.length) {
        showToast("Send a message before sharing");
        return null;
      }
      const payload = {
        title: chat.title,
        model: chat.model,
        messages: chat.messages.filter((m) => !m.error && m.content).map((m) => ({ role: m.role, content: m.content, attachments: m.attachments })),
      };
      let id;
      try {
        const res = await fetch("/api/share", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error();
        id = (await res.json()).id;
      } catch {
        id = uid("local");
      }
      const shares = load(KEYS.shares, {});
      shares[id] = { id, ...payload, messages: payload.messages.map((m) => ({ ...m, attachments: m.attachments?.map((a) => ({ name: a.name })) })), createdAt: new Date().toISOString() };
      save(KEYS.shares, shares);
      patchChat(chatId, (c) => ({ ...c, sharedId: id }));
      const url = `${window.location.origin}/share/${id}`;
      try {
        await navigator.clipboard.writeText(url);
        showToast("Share link copied to clipboard");
      } catch {
        showToast(`Share link: ${url}`);
      }
      return url;
    },
    [patchChat, showToast]
  );

  const addToLibrary = useCallback((files) => setLibrary((prev) => [...files, ...prev]), []);
  const removeFromLibrary = useCallback((fileId) => setLibrary((prev) => prev.filter((f) => f.id !== fileId)), []);

  const clearAll = useCallback(() => {
    controllerRef.current?.abort();
    setChats([]);
    setLibrary([]);
    save(KEYS.seeded, true);
    remove(KEYS.shares);
    router.push("/");
    showToast("All chats cleared");
  }, [router, showToast]);

  const resetDemo = useCallback(() => {
    controllerRef.current?.abort();
    const seed = buildSeed();
    setChats(seed.chats);
    setLibrary(seed.library);
    router.push("/");
    showToast("Demo chats restored");
  }, [router, showToast]);

  const value = useMemo(
    () => ({
      ready,
      chats,
      library,
      settings,
      streaming,
      serverMode,
      toast,
      ui,
      setUi,
      draft,
      setDraft,
      model: getModel(settings.model),
      updateSettings,
      showToast,
      createChat,
      sendMessage,
      regenerate,
      editAndResend,
      stop,
      renameChat,
      togglePin,
      deleteChat,
      setFeedback,
      shareChat,
      addToLibrary,
      removeFromLibrary,
      clearAll,
      resetDemo,
    }),
    [ready, chats, library, settings, streaming, serverMode, toast, ui, draft, updateSettings, showToast, createChat, sendMessage, regenerate, editAndResend, stop, renameChat, togglePin, deleteChat, setFeedback, shareChat, addToLibrary, removeFromLibrary, clearAll, resetDemo]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
