"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

const markdownComponents: Components = {
  h1: ({ children }) => <h3 className="mb-2 mt-3 text-base font-black leading-7 text-ink first:mt-0">{children}</h3>,
  h2: ({ children }) => <h3 className="mb-2 mt-3 text-base font-black leading-7 text-ink first:mt-0">{children}</h3>,
  h3: ({ children }) => <h3 className="mb-2 mt-3 text-sm font-black leading-7 text-ink first:mt-0">{children}</h3>,
  h4: ({ children }) => <h4 className="mb-2 mt-3 text-sm font-bold leading-7 text-ink first:mt-0">{children}</h4>,
  p: ({ children }) => <p className="my-2 leading-8 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pe-5 ps-0 leading-8">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pe-5 ps-0 leading-8">{children}</ol>,
  li: ({ children }) => <li className="pe-1">{children}</li>,
  strong: ({ children }) => <strong className="font-black text-ink">{children}</strong>,
  a: ({ href, children }) => {
    const external = Boolean(href?.startsWith("http"));
    return (
      <a href={href || "#"} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} className="text-civic underline underline-offset-4">
        {children}
      </a>
    );
  },
  blockquote: ({ children }) => <blockquote className="my-3 border-r-4 border-civic/30 bg-civic/5 py-2 pe-3 ps-2 leading-8">{children}</blockquote>,
  code: ({ children }) => <code className="rounded bg-slate-100 px-1 py-0.5 text-[0.92em] text-ink">{children}</code>
};

export default function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="chat-markdown text-sm leading-8 text-ink" dir="rtl">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
