"use client";

import { useEffect } from "react";
import { useApp } from "./AppProvider";
import ChatHeader from "./ChatHeader";
import Composer from "./Composer";
import Icon from "./Icons";

const SUGGESTIONS = [
  { icon: "map", text: "Plan a 3-day trip to Kyoto in spring on a mid-range budget." },
  { icon: "code", text: "Why does my Python import fail with ModuleNotFoundError?" },
  { icon: "table", text: "SQL join vs subquery: when should I use each?" },
  { icon: "server", text: "Should I self-host an open model with vLLM or use a hosted API?" },
];

export default function HomeView() {
  const { sendMessage } = useApp();
  useEffect(() => {
    document.title = "Assist";
  }, []);
  return (
    <>
      <ChatHeader />
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto pb-[6vh]">
        <h1 className="mb-6 px-6 text-center text-[28px] font-medium tracking-[-0.01em]">What can I help with?</h1>
        <div className="w-full">
          <Composer autoFocus />
        </div>
        <div className="mx-auto mt-1 flex w-full max-w-[768px] flex-wrap justify-center gap-2 px-6">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.text}
              type="button"
              onClick={() => sendMessage({ content: s.text })}
              className="flex items-center gap-2 rounded-full border border-line px-3.5 py-2 text-[13px] text-muted hover:bg-hover hover:text-fg"
            >
              <Icon name={s.icon} size={15} />
              <span className="max-w-[260px] truncate">{s.text}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
