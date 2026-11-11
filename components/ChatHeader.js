"use client";

import { useRouter } from "next/navigation";
import { useApp } from "./AppProvider";
import Icon from "./Icons";
import { Dropdown, IconButton, MenuItem } from "./ui";
import { MODELS } from "@/lib/assistants";
import { chatToMarkdown } from "@/lib/utils";

export default function ChatHeader({ chat, title }) {
  const { model, updateSettings, setUi, shareChat, togglePin, serverMode } = useApp();
  const router = useRouter();
  const canShare = chat && chat.messages.length > 0;

  const exportMd = () => {
    const blob = new Blob([chatToMarkdown(chat)], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${chat.title.replace(/[^\w-]+/g, "-").toLowerCase() || "chat"}.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 px-2 md:px-4">
      <div className="flex min-w-0 items-center gap-1">
        <IconButton label="Open menu" icon="menu" className="md:hidden" onClick={() => setUi((u) => ({ ...u, drawer: true }))} />
        {title ? (
          <h1 className="px-2.5 text-[18px] font-medium">{title}</h1>
        ) : (
          <Dropdown
            width={300}
            trigger={({ toggle, open }) => (
              <button
                type="button"
                onClick={toggle}
                aria-haspopup="menu"
                aria-expanded={open}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[18px] font-medium text-fg hover:bg-hover"
              >
                {model.label}
                <Icon name="chevronDown" size={16} className="text-muted" />
              </button>
            )}
          >
            <div className="px-3 pb-1 pt-2 text-[12px] font-medium text-muted">Model</div>
            {MODELS.map((m) => (
              <button
                key={m.id}
                type="button"
                role="menuitemradio"
                aria-checked={model.id === m.id}
                data-close
                onClick={() => updateSettings({ model: m.id })}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-hover"
              >
                <span className="flex-1">
                  <span className="block text-[14px] font-medium">{m.label}</span>
                  <span className="block text-[13px] text-muted">{m.description}</span>
                </span>
                {model.id === m.id ? <Icon name="check" size={18} /> : null}
              </button>
            ))}
            <div className="mx-3 mt-1 border-t border-line pb-1 pt-2 text-[12px] text-muted">
              {serverMode === "live" ? "Live responses via Anthropic API" : "Offline demo mode: no API key set"}
            </div>
          </Dropdown>
        )}
        {serverMode === "demo" && !title ? (
          <span className="hidden rounded-full bg-bubble px-2 py-0.5 text-[12px] font-medium text-muted sm:inline" title="No ANTHROPIC_API_KEY on the server: replies come from the built-in demo responder">
            Offline demo
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        {canShare ? (
          <>
            <button
              type="button"
              onClick={() => shareChat(chat.id)}
              className="flex h-9 items-center gap-1.5 rounded-[18px] border border-line bg-bg px-[14px] text-[14px] text-fg hover:bg-hover"
            >
              <Icon name="share" size={16} className="sm:hidden" />
              <span className="max-sm:sr-only">Share</span>
            </button>
            <Dropdown
              align="right"
              width={210}
              trigger={({ toggle }) => (
                <button type="button" aria-label="More options" onClick={toggle} className="flex h-9 w-9 items-center justify-center rounded-lg text-fg hover:bg-hover">
                  <Icon name="dots" size={18} />
                </button>
              )}
            >
              <MenuItem icon="pin" onClick={() => togglePin(chat.id)}>{chat.pinned ? "Unpin chat" : "Pin chat"}</MenuItem>
              <MenuItem icon="pencil" onClick={() => setUi((u) => ({ ...u, renameId: chat.id }))}>Rename</MenuItem>
              <MenuItem icon="download" onClick={exportMd}>Export as Markdown</MenuItem>
              {chat.sharedId ? (
                <MenuItem icon="external" onClick={() => window.open(`/share/${chat.sharedId}`, "_blank", "noopener")}>Open shared link</MenuItem>
              ) : null}
              <div className="my-1 border-t border-line" />
              <MenuItem icon="trash" danger onClick={() => setUi((u) => ({ ...u, deleteId: chat.id }))}>Delete</MenuItem>
            </Dropdown>
          </>
        ) : null}
        <IconButton label="New chat" icon="newchat" className="md:hidden" onClick={() => router.push("/")} />
      </div>
    </header>
  );
}
