"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "./AppProvider";
import Icon from "./Icons";
import { Modal } from "./ui";
import { snippetAround } from "@/lib/utils";

export function SearchDialog() {
  const { ui, setUi, chats } = useApp();
  const router = useRouter();
  const open = ui.search;
  const close = () => setUi((u) => ({ ...u, search: false, searchQuery: "" }));
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (open) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect -- seed query when dialog opens */
      setQ(ui.searchQuery || "");
      setActive(0);
    }
  }, [open, ui.searchQuery]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const sorted = [...chats].sort((a, b) => b.updatedAt - a.updatedAt);
    if (!needle) return sorted.slice(0, 12).map((c) => ({ chat: c, snippet: null }));
    const out = [];
    for (const c of sorted) {
      const inTitle = c.title.toLowerCase().includes(needle);
      const msg = c.messages.find((m) => m.content.toLowerCase().includes(needle));
      if (inTitle || msg) out.push({ chat: c, snippet: msg ? snippetAround(msg.content, q.trim()) : null });
    }
    return out;
  }, [chats, q]);

  const go = (chatId) => {
    close();
    router.push(chatId ? `/c/${chatId}` : "/");
  };

  const highlight = (text) => {
    const needle = q.trim();
    if (!needle) return text;
    const i = text.toLowerCase().indexOf(needle.toLowerCase());
    if (i < 0) return text;
    return (
      <>
        {text.slice(0, i)}
        <mark className="rounded bg-[#FFF3B0] px-0.5 text-[#0D0D0D]">{text.slice(i, i + needle.length)}</mark>
        {text.slice(i + needle.length)}
      </>
    );
  };

  return (
    <Modal open={open} onClose={close} width={640} labelledBy="search-title">
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <Icon name="search" size={18} className="text-muted" />
        <input
          id="search-title"
          autoFocus
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, results.length));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              go(active === 0 ? null : results[active - 1]?.chat.id);
            }
          }}
          placeholder="Search chats..."
          aria-label="Search chats"
          className="flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted"
        />
        <button type="button" aria-label="Close search" onClick={close} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-hover">
          <Icon name="x" size={18} />
        </button>
      </div>
      <div className="scroll-thin max-h-[52vh] overflow-y-auto p-2">
        <button
          type="button"
          onClick={() => go(null)}
          onMouseEnter={() => setActive(0)}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] ${active === 0 ? "bg-hover" : ""}`}
        >
          <Icon name="newchat" size={18} />
          New chat
        </button>
        {q.trim() ? (
          <div className="px-3 pb-1 pt-3 text-[12px] font-medium text-muted">
            {results.length} result{results.length === 1 ? "" : "s"}
          </div>
        ) : (
          <div className="px-3 pb-1 pt-3 text-[12px] font-medium text-muted">Recent</div>
        )}
        {results.map(({ chat, snippet }, i) => (
          <button
            key={chat.id}
            type="button"
            onClick={() => go(chat.id)}
            onMouseEnter={() => setActive(i + 1)}
            className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left ${active === i + 1 ? "bg-hover" : ""}`}
          >
            <Icon name="file" size={18} className="mt-0.5 shrink-0 text-muted" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-medium">{highlight(chat.title)}</span>
              {snippet ? <span className="mt-0.5 block truncate text-[13px] text-muted">{highlight(snippet)}</span> : null}
            </span>
            <span className="shrink-0 pt-0.5 text-[12px] text-muted">
              {new Date(chat.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
          </button>
        ))}
        {q.trim() && !results.length ? <p className="px-3 py-6 text-center text-[14px] text-muted">No chats match &ldquo;{q}&rdquo;</p> : null}
      </div>
    </Modal>
  );
}

export function SettingsModal() {
  const { ui, setUi, settings, updateSettings, clearAll, resetDemo, chats, library, serverMode } = useApp();
  const close = () => setUi((u) => ({ ...u, settings: false, settingsTab: undefined }));
  const tab = ui.settingsTab || "general";
  const setTab = (t) => setUi((u) => ({ ...u, settingsTab: t }));
  const [confirm, setConfirm] = useState(false);
  const tabs = [
    ["general", "General", "settings"],
    ["data", "Data controls", "library"],
    ["shortcuts", "Shortcuts", "help"],
  ];
  return (
    <Modal open={ui.settings} onClose={close} title="Settings" width={680} labelledBy="settings-title">
      <div className="flex min-h-[340px] flex-col md:flex-row">
        <nav className="flex gap-1 border-line p-2 md:w-[190px] md:flex-col md:border-r">
          {tabs.map(([id, label, icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[14px] hover:bg-hover ${tab === id ? "bg-active font-medium" : ""}`}
            >
              <Icon name={icon} size={16} />
              {label}
            </button>
          ))}
        </nav>
        <div className="flex-1 p-5 text-[14px]">
          {tab === "general" ? (
            <div className="flex flex-col divide-y divide-line">
              <div className="flex items-center justify-between gap-4 pb-4">
                <div>
                  <div className="font-medium">Theme</div>
                  <div className="text-[13px] text-muted">Applies to this browser.</div>
                </div>
                <div className="flex rounded-full border border-line p-0.5" role="radiogroup" aria-label="Theme">
                  {[
                    ["light", "Light", "sun"],
                    ["dark", "Dark", "moon"],
                    ["system", "System", "monitor"],
                  ].map(([v, l, ic]) => (
                    <button
                      key={v}
                      type="button"
                      role="radio"
                      aria-checked={settings.theme === v}
                      onClick={() => updateSettings({ theme: v })}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] ${settings.theme === v ? "bg-accent text-on-accent" : "text-muted hover:text-fg"}`}
                    >
                      <Icon name={ic} size={14} />
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 py-4">
                <div>
                  <div className="font-medium">Default model</div>
                  <div className="text-[13px] text-muted">Used for new messages.</div>
                </div>
                <select
                  value={settings.model}
                  onChange={(e) => updateSettings({ model: e.target.value })}
                  className="rounded-lg border border-line bg-bg px-3 py-1.5 text-[14px]"
                  aria-label="Default model"
                >
                  <option value="assist-5">Assist 5</option>
                  <option value="assist-5-mini">Assist 5 mini</option>
                </select>
              </div>
              <div className="flex items-center justify-between gap-4 pt-4">
                <div>
                  <div className="font-medium">Response source</div>
                  <div className="text-[13px] text-muted">
                    {serverMode === "live"
                      ? "Live: answers stream from the Anthropic Messages API."
                      : "Offline demo: set ANTHROPIC_API_KEY on the server for real answers."}
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${serverMode === "live" ? "bg-[#E7F6EE] text-[#047857]" : "bg-bubble text-muted"}`}>
                  {serverMode === "live" ? "Live" : "Demo"}
                </span>
              </div>
            </div>
          ) : null}
          {tab === "data" ? (
            <div className="flex flex-col gap-4">
              <p className="text-muted">
                {chats.length} chats and {library.length} files are stored in this browser&apos;s localStorage. Nothing is stored on a server except links you share.
              </p>
              <div className="flex items-center justify-between gap-4 rounded-xl border border-line p-4">
                <div>
                  <div className="font-medium">Restore demo chats</div>
                  <div className="text-[13px] text-muted">Replaces your chats with the eight sample conversations.</div>
                </div>
                <button type="button" onClick={() => { resetDemo(); close(); }} className="rounded-full border border-line px-4 py-1.5 hover:bg-hover">
                  Restore
                </button>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-xl border border-[#F3C4C3] p-4">
                <div>
                  <div className="font-medium">Clear all chats</div>
                  <div className="text-[13px] text-muted">Deletes every chat and library file on this device.</div>
                </div>
                {confirm ? (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setConfirm(false)} className="rounded-full border border-line px-3 py-1.5 hover:bg-hover">Cancel</button>
                    <button type="button" onClick={() => { clearAll(); setConfirm(false); close(); }} className="rounded-full bg-[#E02E2A] px-3 py-1.5 font-medium text-white">
                      Delete all
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirm(true)} className="rounded-full border border-[#F3C4C3] px-4 py-1.5 text-[#E02E2A] hover:bg-[#FDECEC] dark:hover:bg-[#3a2424]">
                    Clear
                  </button>
                )}
              </div>
            </div>
          ) : null}
          {tab === "shortcuts" ? (
            <ul className="flex flex-col divide-y divide-line">
              {[
                ["Search chats", "Ctrl / Cmd + K"],
                ["New chat", "Ctrl / Cmd + Shift + O"],
                ["Toggle sidebar", "Ctrl / Cmd + Shift + S"],
                ["Send message", "Enter"],
                ["New line", "Shift + Enter"],
                ["Stop generating", "Esc (while streaming)"],
              ].map(([a, k]) => (
                <li key={a} className="flex items-center justify-between py-2.5">
                  <span>{a}</span>
                  <kbd className="rounded-md border border-line bg-bubble px-2 py-0.5 font-mono text-[12px] text-muted">{k}</kbd>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}

export function RenameDialog() {
  const { ui, setUi, chats, renameChat } = useApp();
  const chat = chats.find((c) => c.id === ui.renameId);
  const [value, setValue] = useState("");
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- sync field with selected chat */
    if (chat) setValue(chat.title);
  }, [chat]);
  const close = () => setUi((u) => ({ ...u, renameId: null }));
  return (
    <Modal open={Boolean(chat)} onClose={close} title="Rename chat" width={440} labelledBy="rename-title">
      <form
        className="flex flex-col gap-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          renameChat(chat.id, value);
          close();
        }}
      >
        <input autoFocus value={value} onChange={(e) => setValue(e.target.value)} aria-label="Chat title" className="rounded-xl border border-line bg-bg px-3 py-2.5 text-[15px] outline-none focus:border-fg" />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={close} className="rounded-full border border-line px-4 py-2 text-[14px] hover:bg-hover">Cancel</button>
          <button type="submit" className="rounded-full bg-accent px-4 py-2 text-[14px] font-medium text-on-accent">Save</button>
        </div>
      </form>
    </Modal>
  );
}

export function DeleteDialog() {
  const { ui, setUi, chats, deleteChat } = useApp();
  const chat = chats.find((c) => c.id === ui.deleteId);
  const close = () => setUi((u) => ({ ...u, deleteId: null }));
  return (
    <Modal open={Boolean(chat)} onClose={close} title="Delete chat?" width={440} labelledBy="delete-title">
      <div className="flex flex-col gap-5 p-5 text-[14px]">
        <p>
          This will delete <strong className="font-semibold">{chat?.title}</strong> from this device. Shared links stay available until the server restarts.
        </p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={close} className="rounded-full border border-line px-4 py-2 hover:bg-hover">Cancel</button>
          <button
            type="button"
            autoFocus
            onClick={() => {
              deleteChat(chat.id);
              close();
            }}
            className="rounded-full bg-[#E02E2A] px-4 py-2 font-medium text-white"
          >
            Delete
          </button>
        </div>
      </div>
    </Modal>
  );
}
