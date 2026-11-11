"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useApp } from "./AppProvider";
import Icon from "./Icons";
import { Dropdown, IconButton, MenuItem } from "./ui";
import { GROUP_ORDER, groupLabel } from "@/lib/utils";

function NavLink({ href, icon, children, onNavigate, active }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex h-[38px] items-center gap-[10px] rounded-lg px-[10px] text-[14px] text-fg no-underline hover:bg-hover ${active ? "bg-active" : ""}`}
    >
      <Icon name={icon} size={18} />
      {children}
    </Link>
  );
}

function ChatRow({ chat, active, onNavigate }) {
  const { renameChat, togglePin, setUi, shareChat, streaming } = useApp();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(chat.title);
  const isStreaming = streaming?.chatId === chat.id;

  if (editing) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          renameChat(chat.id, value);
          setEditing(false);
        }}
      >
        <input
          autoFocus
          aria-label="Chat title"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            renameChat(chat.id, value);
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setValue(chat.title);
              setEditing(false);
            }
          }}
          className="w-full rounded-lg border border-line bg-bg px-[10px] py-[7px] text-[14px] outline-none focus:border-fg"
        />
      </form>
    );
  }

  return (
    <div className={`group relative flex items-center rounded-lg hover:bg-hover ${active ? "bg-active" : ""}`}>
      <Link
        href={`/c/${chat.id}`}
        onClick={onNavigate}
        title={chat.title}
        className="block min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap px-[10px] py-2 text-[14px] text-fg no-underline"
      >
        {chat.title}
      </Link>
      {isStreaming ? <span className="mr-2 h-2 w-2 shrink-0 animate-pulse rounded-full bg-fg" aria-label="Generating" /> : null}
      <Dropdown
        align="right"
        width={190}
        className={`mr-1 ${active ? "" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100 max-md:opacity-100"}`}
        trigger={({ toggle, open }) => (
          <button
            type="button"
            aria-label={`Options for ${chat.title}`}
            onClick={toggle}
            className={`flex h-7 w-7 items-center justify-center rounded-md text-muted hover:text-fg ${open ? "text-fg" : ""}`}
          >
            <Icon name="dots" size={16} />
          </button>
        )}
      >
        <MenuItem icon="share" onClick={() => shareChat(chat.id)}>Share</MenuItem>
        <MenuItem icon="pencil" onClick={() => { setValue(chat.title); setEditing(true); }}>Rename</MenuItem>
        <MenuItem icon="pin" onClick={() => togglePin(chat.id)}>{chat.pinned ? "Unpin" : "Pin chat"}</MenuItem>
        <MenuItem icon="trash" danger onClick={() => setUi((u) => ({ ...u, deleteId: chat.id }))}>Delete</MenuItem>
      </Dropdown>
    </div>
  );
}

export default function Sidebar({ mobile = false, onClose }) {
  const { chats, ready, updateSettings, setUi } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const nav = mobile ? onClose : undefined;

  const groups = useMemo(() => {
    const sorted = [...chats].sort((a, b) => b.updatedAt - a.updatedAt);
    const pinned = sorted.filter((c) => c.pinned);
    const map = new Map();
    for (const c of sorted.filter((x) => !x.pinned)) {
      const g = groupLabel(c.updatedAt);
      if (!map.has(g)) map.set(g, []);
      map.get(g).push(c);
    }
    return { pinned, dated: GROUP_ORDER.filter((g) => map.has(g)).map((g) => [g, map.get(g)]) };
  }, [chats]);

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col gap-1 bg-sidebar px-3 py-2 text-fg">
      <div className="flex h-[52px] shrink-0 items-center justify-between">
        <IconButton
          label="Close sidebar"
          icon={mobile ? "x" : "sidebar"}
          onClick={() => (mobile ? onClose() : updateSettings({ sidebarCollapsed: true }))}
        />
        <IconButton label="Search chats" icon="search" onClick={() => { nav?.(); setUi((u) => ({ ...u, search: true })); }} aria-keyshortcuts="Meta+K" />
      </div>

      <button
        type="button"
        onClick={() => {
          nav?.();
          router.push("/");
        }}
        className={`flex h-[38px] items-center gap-[10px] rounded-lg px-[10px] text-left text-[14px] text-fg hover:bg-hover ${pathname === "/" ? "bg-active" : ""}`}
      >
        <Icon name="newchat" size={18} />
        New chat
      </button>
      <NavLink href="/library" icon="library" onNavigate={nav} active={pathname === "/library"}>Library</NavLink>
      <NavLink href="/explore" icon="grid" onNavigate={nav} active={pathname === "/explore"}>Explore assistants</NavLink>

      <div className="scroll-thin -mx-1 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-1">
        {groups.pinned.length ? (
          <>
            <div className="px-[10px] pb-[6px] pt-5 text-[12px] font-medium text-muted">Pinned</div>
            {groups.pinned.map((c) => <ChatRow key={c.id} chat={c} active={pathname === `/c/${c.id}`} onNavigate={nav} />)}
          </>
        ) : null}
        <div className="px-[10px] pb-[6px] pt-5 text-[12px] font-medium text-muted">Chats</div>
        {ready && !chats.length ? <p className="px-[10px] py-2 text-[13px] text-muted">No chats yet. Start one above.</p> : null}
        {groups.dated.map(([label, list], gi) => (
          <div key={label} className="flex flex-col gap-1">
            {groups.dated.length > 1 || gi > 0 ? (
              <div className={`px-[10px] pb-0.5 text-[11px] font-medium uppercase tracking-wide text-muted/80 ${gi === 0 ? "pt-0" : "pt-3"}`}>{label}</div>
            ) : null}
            {list.map((c) => <ChatRow key={c.id} chat={c} active={pathname === `/c/${c.id}`} onNavigate={nav} />)}
          </div>
        ))}
      </div>

      <Dropdown
        direction="up"
        width={236}
        trigger={({ toggle }) => (
          <button
            type="button"
            onClick={toggle}
            aria-label="Account menu"
            className="flex w-full items-center gap-[10px] border-t border-line p-[10px] text-left hover:bg-hover"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0D0D0D] text-[13px] font-semibold text-white dark:bg-[#ECECEC] dark:text-[#0D0D0D]">AK</span>
            <span className="flex flex-col">
              <span className="text-[14px] font-medium">Arjun K.</span>
              <span className="text-[12px] text-muted">Plus</span>
            </span>
          </button>
        )}
      >
        <div className="px-3 pb-2 pt-1.5 text-[13px] text-muted">arjun@assist.example</div>
        <MenuItem icon="settings" onClick={() => { nav?.(); setUi((u) => ({ ...u, settings: true })); }}>Settings</MenuItem>
        <MenuItem icon="library" onClick={() => { nav?.(); router.push("/library"); }}>Library</MenuItem>
        <MenuItem icon="help" onClick={() => { nav?.(); setUi((u) => ({ ...u, settings: true, settingsTab: "shortcuts" })); }}>Keyboard shortcuts</MenuItem>
        <div className="my-1 border-t border-line" />
        <MenuItem icon="logout" onClick={() => { nav?.(); setUi((u) => ({ ...u, settings: true, settingsTab: "data" })); }}>Reset or clear data</MenuItem>
      </Dropdown>
    </aside>
  );
}

export function SidebarRail() {
  const { updateSettings, setUi } = useApp();
  const router = useRouter();
  return (
    <aside className="flex h-full w-[60px] shrink-0 flex-col items-center gap-1 border-r border-line bg-bg py-2">
      <div className="flex h-[52px] items-center">
        <IconButton label="Open sidebar" icon="sidebar" onClick={() => updateSettings({ sidebarCollapsed: false })} />
      </div>
      <IconButton label="New chat" icon="newchat" onClick={() => router.push("/")} />
      <IconButton label="Search chats" icon="search" onClick={() => setUi((u) => ({ ...u, search: true }))} />
      <IconButton label="Library" icon="library" onClick={() => router.push("/library")} />
      <IconButton label="Explore assistants" icon="grid" onClick={() => router.push("/explore")} />
      <div className="flex-1" />
      <button type="button" aria-label="Settings" onClick={() => setUi((u) => ({ ...u, settings: true }))} className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#0D0D0D] text-[13px] font-semibold text-white dark:bg-[#ECECEC] dark:text-[#0D0D0D]">
        AK
      </button>
    </aside>
  );
}
