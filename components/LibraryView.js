"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { useApp } from "./AppProvider";
import ChatHeader from "./ChatHeader";
import Icon from "./Icons";
import { CodeBlock } from "./Markdown";
import { readTextFiles } from "./Composer";
import { Modal } from "./ui";
import { formatBytes } from "@/lib/utils";

export default function LibraryView() {
  const { library, chats, ready, removeFromLibrary, addToLibrary, setDraft, showToast } = useApp();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [preview, setPreview] = useState(null);
  const inputRef = useRef(null);

  const files = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return library.filter((f) => !needle || f.name.toLowerCase().includes(needle) || (f.content || "").toLowerCase().includes(needle));
  }, [library, q]);

  const chatTitle = (id) => chats.find((c) => c.id === id)?.title;

  const askAbout = (f) => {
    setDraft({ attachments: [{ id: f.id + "-r", name: f.name, size: f.size, type: f.type, content: f.content }], text: "" });
    router.push("/");
  };

  return (
    <>
      <ChatHeader title="Library" />
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[880px] px-4 pb-16 pt-4 md:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[15px] text-muted">Text and code files you have attached to chats. Files stay in this browser.</p>
            </div>
            <div className="flex gap-2">
              <label className="flex h-10 flex-1 items-center gap-2 rounded-full border border-line px-4 sm:w-[240px]">
                <Icon name="search" size={16} className="text-muted" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search files" aria-label="Search files" className="w-full bg-transparent text-[14px] outline-none placeholder:text-muted" />
              </label>
              <button type="button" onClick={() => inputRef.current?.click()} className="flex h-10 items-center gap-1.5 rounded-full bg-accent px-4 text-[14px] font-medium text-on-accent">
                <Icon name="plus" size={16} /> Upload
              </button>
              <input
                ref={inputRef}
                type="file"
                multiple
                className="hidden"
                onChange={async (e) => {
                  const { accepted, rejected } = await readTextFiles(e.target.files || []);
                  e.target.value = "";
                  if (rejected.length) showToast(rejected[0]);
                  if (accepted.length) {
                    addToLibrary(accepted.map((f) => ({ ...f, chatId: null, addedAt: Date.now() })));
                    showToast(`Added ${accepted.length} file${accepted.length > 1 ? "s" : ""}`);
                  }
                }}
              />
            </div>
          </div>

          {ready && !library.length ? (
            <div className="mt-16 flex flex-col items-center gap-3 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-bubble text-muted">
                <Icon name="library" size={26} />
              </span>
              <h2 className="text-[18px] font-semibold">No files yet</h2>
              <p className="max-w-[380px] text-[14px] text-muted">Attach a file with the + button in the composer, or upload one here.</p>
            </div>
          ) : null}

          {files.length ? (
            <div className="mt-6 overflow-hidden rounded-2xl border border-line">
              <table className="w-full text-[14px]">
                <thead className="bg-sidebar text-left text-[12px] font-medium text-muted">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Name</th>
                    <th className="hidden px-4 py-2.5 font-medium md:table-cell">Used in</th>
                    <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Size</th>
                    <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Added</th>
                    <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((f) => (
                    <tr key={f.id} className="border-t border-line">
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => setPreview(f)} className="flex items-center gap-3 text-left hover:underline">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bubble text-[10px] font-semibold text-muted">
                            {(f.name.split(".").pop() || "").toUpperCase().slice(0, 4)}
                          </span>
                          <span className="font-medium">{f.name}</span>
                        </button>
                      </td>
                      <td className="hidden max-w-[220px] truncate px-4 py-3 text-muted md:table-cell">
                        {f.chatId && chatTitle(f.chatId) ? <Link href={`/c/${f.chatId}`} className="hover:text-fg">{chatTitle(f.chatId)}</Link> : "Uploaded"}
                      </td>
                      <td className="hidden px-4 py-3 text-muted sm:table-cell">{formatBytes(f.size || 0)}</td>
                      <td className="hidden px-4 py-3 text-muted sm:table-cell">{new Date(f.addedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button type="button" onClick={() => askAbout(f)} className="rounded-full border border-line px-3 py-1 text-[13px] hover:bg-hover">Ask about it</button>
                          <button type="button" aria-label={`Delete ${f.name}`} onClick={() => removeFromLibrary(f.id)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-[#E02E2A]">
                            <Icon name="trash" size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : library.length ? (
            <p className="mt-10 text-center text-[14px] text-muted">No files match &ldquo;{q}&rdquo;.</p>
          ) : null}
        </div>
      </div>
      <Modal open={Boolean(preview)} onClose={() => setPreview(null)} title={preview?.name} width={760} labelledBy="preview-title">
        <div className="scroll-thin max-h-[65vh] overflow-y-auto p-4">
          {preview ? <CodeBlock lang={(preview.name.split(".").pop() || "text").toLowerCase()} text={preview.content || "(content not stored)"} /> : null}
        </div>
      </Modal>
    </>
  );
}
