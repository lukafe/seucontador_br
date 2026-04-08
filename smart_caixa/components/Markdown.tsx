"use client";

import { marked } from "marked";
import { useMemo } from "react";

marked.setOptions({
  breaks: true,
  gfm: true,
});

export default function Markdown({ children }: { children: string }) {
  const html = useMemo(() => {
    if (!children) return "";
    return marked.parse(children, { async: false }) as string;
  }, [children]);

  return (
    <div
      className="markdown-content text-sm text-zinc-300"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
