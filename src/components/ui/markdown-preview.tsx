"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Minimal markdown renderer for AI-generated previews.
// Supports: h2/h3, ul (- ), ol (1. ), blockquotes (>), bold (**), italics (_),
// inline links [text](href), and paragraphs. No external deps.

type Block =
  | { kind: "h2"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "quote"; text: string }
  | { kind: "p"; text: string };

function parse(md: string): Block[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (line.startsWith("## ")) { blocks.push({ kind: "h2", text: line.slice(3).trim() }); i++; continue; }
    if (line.startsWith("### ")) { blocks.push({ kind: "h3", text: line.slice(4).trim() }); i++; continue; }
    if (line.startsWith("> ")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) { buf.push(lines[i].slice(2)); i++; }
      blocks.push({ kind: "quote", text: buf.join(" ") });
      continue;
    }
    if (/^- /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^- /.test(lines[i])) { items.push(lines[i].slice(2)); i++; }
      blocks.push({ kind: "ul", items });
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) { items.push(lines[i].replace(/^\d+\.\s/, "")); i++; }
      blocks.push({ kind: "ol", items });
      continue;
    }
    const buf = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !/^(#|>|-|\d+\.\s)/.test(lines[i])) { buf.push(lines[i]); i++; }
    blocks.push({ kind: "p", text: buf.join(" ") });
  }
  return blocks;
}

function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|_[^_]+_|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = pattern.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) {
      out.push(<strong key={key++}>{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith("_")) {
      out.push(<em key={key++}>{tok.slice(1, -1)}</em>);
    } else {
      const linkMatch = /\[([^\]]+)\]\(([^)]+)\)/.exec(tok)!;
      out.push(
        <a key={key++} href={linkMatch[2]} className="text-brand-500 underline-offset-2 hover:underline">
          {linkMatch[1]}
        </a>,
      );
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function MarkdownPreview({ source, className }: { source: string; className?: string }) {
  const blocks = parse(source ?? "");
  return (
    <div className={cn("space-y-3 text-sm leading-relaxed", className)}>
      {blocks.map((b, idx) => {
        switch (b.kind) {
          case "h2":
            return <h2 key={idx} className="text-lg font-semibold tracking-tight mt-4 first:mt-0">{renderInline(b.text)}</h2>;
          case "h3":
            return <h3 key={idx} className="text-base font-semibold mt-3">{renderInline(b.text)}</h3>;
          case "ul":
            return (
              <ul key={idx} className="list-disc pl-5 space-y-1">
                {b.items.map((it, j) => <li key={j}>{renderInline(it)}</li>)}
              </ul>
            );
          case "ol":
            return (
              <ol key={idx} className="list-decimal pl-5 space-y-1">
                {b.items.map((it, j) => <li key={j}>{renderInline(it)}</li>)}
              </ol>
            );
          case "quote":
            return (
              <blockquote key={idx} className="border-l-2 border-brand-500/60 pl-3 italic text-muted-foreground">
                {renderInline(b.text)}
              </blockquote>
            );
          default:
            return <p key={idx}>{renderInline(b.text)}</p>;
        }
      })}
    </div>
  );
}
