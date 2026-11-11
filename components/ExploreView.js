"use client";

import { useEffect, useMemo, useState } from "react";
import { useApp } from "./AppProvider";
import ChatHeader from "./ChatHeader";
import Icon from "./Icons";
import channel from "@/data/channel-videos.json";

const VIDEO_IDS = ["Eqa9D9eDP-A", "H89yN2whrOM", "J6rIkOYYt_4", "Wgh-ARwFIVI"];

function VideoCard({ video }) {
  const [playing, setPlaying] = useState(false);
  const title = video.title.split(" | ")[0];
  return (
    <div className="flex flex-col gap-2">
      <div className="relative aspect-video overflow-hidden rounded-xl bg-bubble">
        {playing ? (
          <iframe
            className="absolute inset-0 h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&mute=1&playsinline=1&rel=0`}
            title={title}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button type="button" onClick={() => setPlaying(true)} aria-label={`Play ${title}`} className="group absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`} alt="" className="h-full w-full object-cover" loading="lazy" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/70 text-white transition-transform group-hover:scale-110">
                <Icon name="play" size={18} />
              </span>
            </span>
            {video.duration ? <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-medium text-white">{video.duration}</span> : null}
          </button>
        )}
      </div>
      <div className="text-[14px] font-medium leading-5">{title}</div>
      <a href={video.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[13px] text-muted no-underline hover:text-fg">
        Watch on YouTube <Icon name="external" size={13} />
      </a>
    </div>
  );
}

export default function ExploreView() {
  const { createChat } = useApp();
  const [assistants, setAssistants] = useState([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");

  useEffect(() => {
    fetch("/api/assistants")
      .then((r) => r.json())
      .then((d) => setAssistants(d.assistants || []))
      .catch(() => setAssistants([]));
  }, []);

  const cats = ["All", ...Array.from(new Set(assistants.map((a) => a.category)))];
  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return assistants.filter((a) => (cat === "All" || a.category === cat) && (!n || `${a.name} ${a.description}`.toLowerCase().includes(n)));
  }, [assistants, q, cat]);

  const videos = VIDEO_IDS.map((id) => channel.videos.find((v) => v.id === id)).filter(Boolean);

  return (
    <>
      <ChatHeader title="Explore assistants" />
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[920px] px-4 pb-16 pt-2 md:px-6">
          <div className="py-6 text-center">
            <h1 className="text-[32px] font-semibold tracking-[-0.02em]">Assistants</h1>
            <p className="mx-auto mt-2 max-w-[520px] text-[15px] text-muted">
              Preset assistants with their own instructions. Pick one to start a focused chat.
            </p>
            <label className="mx-auto mt-6 flex h-11 max-w-[560px] items-center gap-2 rounded-full border border-line bg-bg px-4">
              <Icon name="search" size={18} className="text-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search assistants" aria-label="Search assistants" className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted" />
            </label>
          </div>
          <div className="scroll-thin flex gap-1 overflow-x-auto border-b border-line pb-px">
            {cats.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCat(c)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-[14px] ${cat === c ? "bg-accent text-on-accent" : "text-muted hover:bg-hover hover:text-fg"}`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {shown.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => createChat({ assistantId: a.id })}
                className="group flex items-start gap-4 rounded-2xl border border-line p-4 text-left hover:bg-hover"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full" style={{ background: a.tint, color: a.ink }}>
                  <Icon name={a.icon} size={22} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-[15px] font-semibold">{a.name}</span>
                    <span className="text-[12px] text-muted">{a.category}</span>
                  </span>
                  <span className="mt-1 block text-[14px] leading-5 text-muted">{a.description}</span>
                  <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium">
                    Start chat <Icon name="chevronRight" size={14} />
                  </span>
                </span>
              </button>
            ))}
          </div>
          {assistants.length && !shown.length ? <p className="py-10 text-center text-[14px] text-muted">No assistants match your search.</p> : null}

          {videos.length ? (
            <section className="mt-12">
              <h2 className="text-[18px] font-semibold">Learn: building with AI agents</h2>
              <p className="mt-1 text-[14px] text-muted">From The Bhairav Show by Suhas Bhairav (@suhasbhairav).</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {videos.map((v) => <VideoCard key={v.id} video={v} />)}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </>
  );
}
