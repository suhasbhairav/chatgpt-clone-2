"use client";

// A small, dependency-free GitHub-flavoured markdown renderer that outputs
// React elements (never raw HTML), so model output cannot inject markup.
// Supports headings, paragraphs, bold/italic/strike, inline code, links,
// ordered/unordered/nested lists, task lists, blockquotes, tables, hr and fenced
// code blocks (including an unclosed fence while a reply is still streaming).

import { Fragment, useState } from "react";
import Icon from "./Icons";

const LIST_RE = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const TABLE_SEP_RE = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
const FENCE_RE = /^\s*(```|~~~)\s*([\w#+.-]*)/;

function splitRow(line) {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, "|"));
}

function isBlockStart(line, next) {
  return (
    FENCE_RE.test(line) ||
    /^#{1,6}\s/.test(line) ||
    /^>\s?/.test(line) ||
    LIST_RE.test(line) ||
    /^\s*([-*_])(\s*\1){2,}\s*$/.test(line) ||
    (line.includes("|") && next !== undefined && TABLE_SEP_RE.test(next))
  );
}

export function parseBlocks(src) {
  const lines = String(src || "").replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const fence = line.match(FENCE_RE);
    if (fence) {
      const marker = fence[1];
      const body = [];
      i++;
      let closed = false;
      while (i < lines.length) {
        if (lines[i].trim().startsWith(marker)) {
          closed = true;
          i++;
          break;
        }
        body.push(lines[i]);
        i++;
      }
      blocks.push({ type: "code", lang: fence[2] || "", text: body.join("\n"), closed });
      continue;
    }
    const h = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
    if (h) {
      blocks.push({ type: "heading", level: h[1].length, text: h[2] });
      i++;
      continue;
    }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }
    if (line.includes("|") && i + 1 < lines.length && TABLE_SEP_RE.test(lines[i + 1])) {
      const header = splitRow(line);
      const align = splitRow(lines[i + 1]).map((c) =>
        c.startsWith(":") && c.endsWith(":") ? "center" : c.endsWith(":") ? "right" : "left"
      );
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      blocks.push({ type: "table", header, align, rows });
      continue;
    }
    if (/^>\s?/.test(line)) {
      const body = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        body.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ type: "quote", children: parseBlocks(body.join("\n")) });
      continue;
    }
    if (LIST_RE.test(line)) {
      const items = [];
      while (i < lines.length) {
        const l = lines[i];
        if (!l.trim()) {
          // A blank line ends the list unless another list item follows.
          if (i + 1 < lines.length && LIST_RE.test(lines[i + 1])) {
            i++;
            continue;
          }
          break;
        }
        const m = l.match(LIST_RE);
        if (m) {
          items.push({ indent: m[1].replace(/\t/g, "  ").length, ordered: /\d/.test(m[2]), num: parseInt(m[2], 10), text: m[3] });
        } else if (/^\s+\S/.test(l) && items.length) {
          items[items.length - 1].text += " " + l.trim();
        } else break;
        i++;
      }
      blocks.push(buildList(items, 0).block);
      continue;
    }
    const para = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i], lines[i + 1])) {
      para.push(lines[i]);
      i++;
    }
    blocks.push({ type: "paragraph", text: para.join("\n") });
  }
  return blocks;
}

function buildList(items, start) {
  const base = items[start].indent;
  const block = { type: "list", ordered: items[start].ordered, start: items[start].num || 1, items: [] };
  let i = start;
  while (i < items.length && items[i].indent >= base) {
    if (items[i].indent > base && block.items.length) {
      const sub = buildList(items, i);
      block.items[block.items.length - 1].children.push(sub.block);
      i = sub.next;
      continue;
    }
    block.items.push({ text: items[i].text, children: [] });
    i++;
  }
  return { block, next: i };
}

const INLINE_RE =
  /(`+)([\s\S]*?[^`])\1(?!`)|\*\*([\s\S]+?)\*\*|__([\s\S]+?)__|~~([\s\S]+?)~~|\*([^*\s](?:[\s\S]*?[^*\s])?)\*|(?<![A-Za-z0-9])_([^_\s](?:[\s\S]*?[^_\s])?)_(?![A-Za-z0-9])|\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)|(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])/g;

function safeHref(href) {
  if (/^(https?:|mailto:)/i.test(href) || href.startsWith("/") || href.startsWith("#")) return href;
  return null;
}

export function Inline({ text }) {
  const out = [];
  let last = 0;
  let m;
  let k = 0;
  const s = String(text || "");
  const re = new RegExp(INLINE_RE.source, "g");
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(<Fragment key={k++}>{s.slice(last, m.index)}</Fragment>);
    if (m[1]) {
      out.push(
        <code key={k++} className="rounded-md bg-bubble px-1.5 py-0.5 font-mono text-[0.875em]">
          {m[2]}
        </code>
      );
    } else if (m[3] || m[4]) {
      out.push(<strong key={k++} className="font-semibold"><Inline text={m[3] || m[4]} /></strong>);
    } else if (m[5]) {
      out.push(<del key={k++}><Inline text={m[5]} /></del>);
    } else if (m[6] || m[7]) {
      out.push(<em key={k++}><Inline text={m[6] || m[7]} /></em>);
    } else if (m[8]) {
      const href = safeHref(m[9]);
      out.push(
        href ? (
          <a key={k++} href={href} target="_blank" rel="noopener noreferrer nofollow" className="underline decoration-line underline-offset-2 hover:text-muted">
            <Inline text={m[8]} />
          </a>
        ) : (
          <Fragment key={k++}>{m[8]}</Fragment>
        )
      );
    } else if (m[10]) {
      out.push(
        <a key={k++} href={m[10]} target="_blank" rel="noopener noreferrer nofollow" className="underline decoration-line underline-offset-2 hover:text-muted">
          {m[10]}
        </a>
      );
    }
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push(<Fragment key={k++}>{s.slice(last)}</Fragment>);
  // Preserve single line breaks inside paragraphs.
  return out.map((node, idx) =>
    typeof node.props?.children === "string" && node.type === Fragment && node.props.children.includes("\n") ? (
      <Fragment key={`b${idx}`}>
        {node.props.children.split("\n").map((part, j, arr) => (
          <Fragment key={j}>
            {part}
            {j < arr.length - 1 ? <br /> : null}
          </Fragment>
        ))}
      </Fragment>
    ) : (
      node
    )
  );
}

export function CodeBlock({ lang, text }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-code">
      <div className="flex h-9 items-center justify-between border-b border-line bg-bubble px-4 text-xs text-muted">
        <span className="font-medium">{lang || "code"}</span>
        <button type="button" onClick={copy} className="flex items-center gap-1.5 rounded-md px-1.5 py-1 hover:text-fg" aria-label="Copy code">
          <Icon name={copied ? "check" : "copy"} size={14} />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="scroll-thin overflow-x-auto p-4 font-mono text-[13.5px] leading-[1.6]">
        <code>{text}</code>
      </pre>
    </div>
  );
}

function Block({ b }) {
  switch (b.type) {
    case "heading": {
      const cls =
        b.level === 1
          ? "text-2xl font-semibold leading-8 mt-2"
          : b.level === 2
            ? "text-xl font-semibold leading-7 mt-2"
            : "text-[17px] font-semibold leading-7 mt-1";
      const Tag = `h${Math.min(b.level + 1, 6)}`;
      return <Tag className={cls}><Inline text={b.text} /></Tag>;
    }
    case "paragraph":
      return <p className="m-0"><Inline text={b.text} /></p>;
    case "hr":
      return <hr className="border-line" />;
    case "code":
      return <CodeBlock lang={b.lang} text={b.text} />;
    case "quote":
      return (
        <blockquote className="flex flex-col gap-3 border-l-[3px] border-line pl-4 text-fg/90">
          {b.children.map((c, i) => <Block key={i} b={c} />)}
        </blockquote>
      );
    case "table":
      return (
        <div className="scroll-thin overflow-x-auto rounded-xl border border-line">
          <table className="w-full border-collapse text-[14px] leading-6">
            <thead className="bg-bubble">
              <tr>
                {b.header.map((h, i) => (
                  <th key={i} style={{ textAlign: b.align[i] }} className="border-b border-line px-3 py-2 font-semibold">
                    <Inline text={h} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((r, ri) => (
                <tr key={ri} className="border-b border-line last:border-0">
                  {b.header.map((_, ci) => (
                    <td key={ci} style={{ textAlign: b.align[ci] }} className="px-3 py-2 align-top">
                      <Inline text={r[ci] ?? ""} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "list": {
      const Tag = b.ordered ? "ol" : "ul";
      return (
        <Tag start={b.ordered && b.start !== 1 ? b.start : undefined} className={`m-0 flex flex-col gap-0.5 pl-[22px] ${b.ordered ? "list-decimal" : "list-disc"}`}>
          {b.items.map((it, i) => {
            const task = it.text.match(/^\[( |x|X)\]\s+(.*)$/);
            return (
              <li key={i} className={task ? "list-none -ml-[22px]" : "pl-1"}>
                {task ? (
                  <span className="flex items-start gap-2">
                    <input type="checkbox" checked={task[1] !== " "} readOnly className="mt-[7px]" aria-label="task" />
                    <span><Inline text={task[2]} /></span>
                  </span>
                ) : (
                  <Inline text={it.text} />
                )}
                {it.children.length ? <div className="mt-1 flex flex-col gap-1">{it.children.map((c, j) => <Block key={j} b={c} />)}</div> : null}
              </li>
            );
          })}
        </Tag>
      );
    }
    default:
      return null;
  }
}

export default function Markdown({ text, streaming = false }) {
  const blocks = parseBlocks(text);
  return (
    <div className={`flex flex-col gap-[14px] text-[16px] leading-[26px] ${streaming ? "assist-caret-host" : ""}`}>
      {blocks.map((b, i) => <Block key={i} b={b} />)}
      {streaming ? <span className="assist-caret" aria-hidden="true" /> : null}
    </div>
  );
}
