"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "./Icons";

// Click-outside / Escape aware dropdown.
export function Dropdown({ trigger, children, align = "left", className = "", width = 220, direction = "down" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div ref={ref} className={`relative ${className}`}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open ? (
        <div
          role="menu"
          style={{ width }}
          className={`assist-fade absolute z-40 rounded-2xl border border-line bg-bg p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] ${
            align === "right" ? "right-0" : "left-0"
          } ${direction === "up" ? "bottom-full mb-2" : "top-full mt-1"}`}
          onClick={(e) => {
            if (e.target.closest("[data-close]")) setOpen(false);
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function MenuItem({ icon, children, onClick, danger = false, right = null, disabled = false }) {
  return (
    <button
      type="button"
      role="menuitem"
      data-close
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[14px] hover:bg-hover disabled:opacity-40 ${danger ? "text-[#E02E2A]" : "text-fg"}`}
    >
      {icon ? <Icon name={icon} size={16} /> : null}
      <span className="flex-1">{children}</span>
      {right}
    </button>
  );
}

export function Modal({ open, onClose, title, children, width = 520, labelledBy }) {
  const boxRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[var(--overlay)] px-4 pt-[12vh]" onMouseDown={onClose}>
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        style={{ maxWidth: width }}
        className="assist-fade w-full overflow-hidden rounded-2xl border border-line bg-bg text-fg shadow-[0_16px_50px_rgba(0,0,0,0.2)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {title ? (
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 id={labelledBy} className="text-[17px] font-semibold">{title}</h2>
            <button type="button" aria-label="Close" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-hover">
              <Icon name="x" size={18} />
            </button>
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}

export function IconButton({ label, icon, onClick, size = 40, iconSize = 20, className = "", active = false, ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      style={{ width: size, height: size }}
      className={`flex shrink-0 items-center justify-center rounded-lg text-muted hover:bg-hover ${active ? "bg-hover text-fg" : ""} ${className}`}
      {...rest}
    >
      <Icon name={icon} size={iconSize} />
    </button>
  );
}
