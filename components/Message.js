"use client";

import { useEffect, useRef, useState } from "react";
import Markdown from "./Markdown";
import Icon from "./Icons";
import { FileChip } from "./Composer";
import { getModel } from "@/lib/assistants";

function ActionButton({ label, icon, onClick, active = false }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active || undefined}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-lg hover:bg-hover ${active ? "text-fg" : "text-muted"}`}
    >
      <Icon name={icon} size={16} strokeWidth={active ? 2.4 : 2} />
    </button>
  );
}

function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* blocked */
    }
  };
  return [copied, copy];
}

export function UserMessage({ message, onEdit, readOnly = false, disabled = false }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(message.content);
  const [copied, copy] = useCopy();
  const taRef = useRef(null);

  useEffect(() => {
    if (editing && taRef.current) {
      const ta = taRef.current;
      ta.focus();
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 320) + "px";
    }
  }, [editing, value]);

  if (editing) {
    return (
      <div className="w-full rounded-[18px] bg-bubble p-3">
        <textarea
          ref={taRef}
          value={value}
          aria-label="Edit message"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onEdit(value);
              setEditing(false);
            } else if (e.key === "Escape") setEditing(false);
          }}
          className="w-full resize-none bg-transparent px-1 text-[16px] leading-6 outline-none"
        />
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={() => { setValue(message.content); setEditing(false); }} className="rounded-full border border-line bg-bg px-4 py-1.5 text-[14px] hover:bg-hover">
            Cancel
          </button>
          <button type="button" onClick={() => { onEdit(value); setEditing(false); }} className="rounded-full bg-accent px-4 py-1.5 text-[14px] font-medium text-on-accent">
            Send
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative flex flex-col items-end gap-2">
      {message.attachments?.length ? (
        <div className="flex max-w-[70%] flex-wrap justify-end gap-2">
          {message.attachments.map((a, i) => <FileChip key={a.id || i} file={{ size: a.content?.length || a.size || 0, ...a }} />)}
        </div>
      ) : null}
      <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-[18px] bg-bubble px-4 py-[10px] text-[16px] leading-6 md:max-w-[70%]">
        {message.content}
      </div>
      {!readOnly ? (
        <div className="absolute -bottom-[34px] right-0 flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100">
          <ActionButton label={copied ? "Copied" : "Copy"} icon={copied ? "check" : "copy"} onClick={() => copy(message.content)} />
          {!disabled ? <ActionButton label="Edit message" icon="pencil" onClick={() => setEditing(true)} /> : null}
        </div>
      ) : null}
    </div>
  );
}

export function AssistantMessage({ message, isLast, onFeedback, onRegenerate, readOnly = false }) {
  const [copied, copy] = useCopy();
  const modelLabel = getModel(message.model).label;
  const tokens = message.usage ? (message.usage.input_tokens || 0) + (message.usage.output_tokens || 0) : null;

  return (
    <div className="flex flex-col gap-[14px]">
      {message.notice ? <p className="text-[13px] text-muted">{message.notice}</p> : null}
      {message.content || message.streaming ? (
        <Markdown text={message.content} streaming={message.streaming} />
      ) : null}
      {message.error ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[#F3C4C3] bg-[#FDF3F3] px-4 py-3 text-[14px] text-[#B42318] dark:border-[#5c2b2b] dark:bg-[#2c1c1c] dark:text-[#FDA29B]">
          <span>{message.error}</span>
          {onRegenerate ? (
            <button type="button" onClick={onRegenerate} className="shrink-0 rounded-full border border-current px-3 py-1 text-[13px] font-medium">
              Retry
            </button>
          ) : null}
        </div>
      ) : null}
      {message.stopped ? <p className="text-[13px] text-muted">Stopped generating.</p> : null}
      {!message.streaming && !readOnly ? (
        <div className="flex flex-wrap items-center gap-1 text-muted">
          <ActionButton label={copied ? "Copied" : "Copy"} icon={copied ? "check" : "copy"} onClick={() => copy(message.content)} />
          <ActionButton label="Good response" icon="thumbUp" active={message.feedback === "up"} onClick={() => onFeedback("up")} />
          <ActionButton label="Bad response" icon="thumbDown" active={message.feedback === "down"} onClick={() => onFeedback("down")} />
          {isLast ? <ActionButton label="Regenerate" icon="regenerate" onClick={onRegenerate} /> : null}
          <span className="ml-2 flex items-center gap-2 text-[12px]">
            {message.mode === "demo" ? (
              <span className="rounded-full bg-bubble px-2 py-0.5 font-medium" title="Generated by the offline demo responder (no API key configured)">
                Offline demo
              </span>
            ) : null}
            <span>{modelLabel}</span>
            {tokens ? <span title="Tokens used (input + output)">· {tokens.toLocaleString()} tokens</span> : null}
            {message.flags?.think ? <span>· Think</span> : null}
            {message.flags?.search ? <span>· Search</span> : null}
          </span>
          {message.feedback ? <span className="ml-2 text-[12px]">Thanks for the feedback</span> : null}
        </div>
      ) : null}
    </div>
  );
}
