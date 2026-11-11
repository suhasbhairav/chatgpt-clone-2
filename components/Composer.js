"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "./AppProvider";
import Icon from "./Icons";
import { formatBytes, uid } from "@/lib/utils";

const MAX_FILE = 200 * 1024; // 200 KB of text per file
const MAX_FILES = 5;
const ACCEPT =
  ".txt,.md,.markdown,.csv,.tsv,.json,.js,.jsx,.mjs,.ts,.tsx,.py,.rb,.go,.rs,.java,.kt,.swift,.c,.h,.cpp,.cs,.php,.sql,.yaml,.yml,.toml,.ini,.xml,.html,.css,.scss,.sh,.log,.env.example,text/*";

export async function readTextFiles(fileList) {
  const accepted = [];
  const rejected = [];
  for (const f of Array.from(fileList)) {
    if (f.size > MAX_FILE) {
      rejected.push(`${f.name} is larger than 200 KB`);
      continue;
    }
    const content = await f.text();
    if (content.includes("\u0000")) {
      rejected.push(`${f.name} looks like a binary file`);
      continue;
    }
    accepted.push({ id: uid("f_"), name: f.name, size: f.size, type: f.type || "text/plain", content });
  }
  return { accepted, rejected };
}

export function FileChip({ file, onRemove }) {
  const ext = (file.name.split(".").pop() || "").toUpperCase().slice(0, 4);
  return (
    <div className="flex max-w-[240px] items-center gap-2.5 rounded-xl border border-line bg-bg py-1.5 pl-1.5 pr-2">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0D0D0D] text-[10px] font-semibold text-white dark:bg-[#ECECEC] dark:text-[#0D0D0D]">
        {ext || <Icon name="file" size={16} />}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-medium">{file.name}</span>
        <span className="block text-[12px] text-muted">{formatBytes(file.size)}</span>
      </span>
      {onRemove ? (
        <button type="button" aria-label={`Remove ${file.name}`} onClick={onRemove} className="ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-fg">
          <Icon name="x" size={14} />
        </button>
      ) : null}
    </div>
  );
}

function Toggle({ on, onClick, icon, children }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`flex h-9 items-center gap-1.5 rounded-[18px] border px-[14px] text-[14px] transition-colors ${
        on ? "border-[#B9D5F7] bg-[#EAF3FE] text-[#0B63CE] dark:border-[#2B4A6F] dark:bg-[#1C2B3D] dark:text-[#8CC2FF]" : "border-line bg-bg text-fg hover:bg-hover"
      }`}
    >
      {on ? <Icon name={icon} size={15} /> : null}
      {children}
    </button>
  );
}

export default function Composer({ chatId = null, placeholder = "Ask anything", autoFocus = false, prefill = "" }) {
  const { sendMessage, streaming, stop, settings, updateSettings, showToast, draft, setDraft, ready } = useApp();
  const [text, setText] = useState(prefill);
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const taRef = useRef(null);
  const fileRef = useRef(null);
  const busy = Boolean(streaming && (!chatId || streaming.chatId === chatId));

  // Accept attachments handed over from the Library page.
  useEffect(() => {
    if (draft?.attachments?.length && !chatId) {
      /* eslint-disable react-hooks/set-state-in-effect -- consume a one-off handoff */
      setFiles((f) => [...f, ...draft.attachments].slice(0, MAX_FILES));
      if (draft.text) setText(draft.text);
      /* eslint-enable react-hooks/set-state-in-effect */
      setDraft(null);
    }
  }, [draft, chatId, setDraft]);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 220) + "px";
  }, [text]);

  useEffect(() => {
    if (autoFocus && ready) taRef.current?.focus();
  }, [autoFocus, ready, chatId]);

  const addFiles = async (list) => {
    const { accepted, rejected } = await readTextFiles(list);
    if (rejected.length) showToast(rejected[0]);
    setFiles((prev) => {
      const next = [...prev, ...accepted];
      if (next.length > MAX_FILES) showToast(`Up to ${MAX_FILES} files per message`);
      return next.slice(0, MAX_FILES);
    });
  };

  const submit = () => {
    if (busy) return;
    if (!text.trim() && !files.length) return;
    sendMessage({ chatId, content: text, attachments: files });
    setText("");
    setFiles([]);
  };

  const canSend = text.trim() || files.length;

  return (
    <div className="mx-auto w-full max-w-[768px] px-3 pb-3 pt-4 md:px-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
        }}
        className={`flex flex-col gap-[10px] rounded-[28px] border bg-bg py-3 pl-5 pr-3 shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:bg-[#303030] ${
          dragging ? "border-dashed border-fg" : "border-line"
        }`}
      >
        {files.length ? (
          <div className="flex flex-wrap gap-2 pr-2">
            {files.map((f) => (
              <FileChip key={f.id} file={f} onRemove={() => setFiles((p) => p.filter((x) => x.id !== f.id))} />
            ))}
          </div>
        ) : null}
        <label htmlFor={chatId ? `composer-${chatId}` : "composer"} className="sr-only">
          Message
        </label>
        <textarea
          id={chatId ? `composer-${chatId}` : "composer"}
          ref={taRef}
          rows={1}
          value={text}
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
          onPaste={(e) => {
            if (e.clipboardData.files?.length) {
              e.preventDefault();
              addFiles(e.clipboardData.files);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          className="scroll-thin max-h-[220px] resize-none border-0 bg-transparent py-1.5 text-[16px] leading-6 text-fg outline-none placeholder:text-muted"
        />
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            <button
              type="button"
              aria-label="Add files"
              title="Attach text or code files"
              onClick={() => fileRef.current?.click()}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-bg text-fg hover:bg-hover"
            >
              <Icon name="plus" size={18} />
            </button>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <Toggle on={settings.search} icon="globe" onClick={() => updateSettings({ search: !settings.search })}>
              Search
            </Toggle>
            <Toggle on={settings.think} icon="bulb" onClick={() => updateSettings({ think: !settings.think })}>
              Think
            </Toggle>
          </div>
          {busy ? (
            <button
              type="button"
              aria-label="Stop generating"
              title="Stop generating"
              onClick={stop}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-on-accent"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="5" y="5" width="14" height="14" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              aria-label="Send message"
              onClick={() => (canSend ? submit() : taRef.current?.focus())}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-on-accent hover:opacity-80"
            >
              <Icon name="arrowUp" size={18} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
      <p className="mt-[10px] text-center text-[12px] text-muted">Assist can make mistakes. Check important info.</p>
    </div>
  );
}
