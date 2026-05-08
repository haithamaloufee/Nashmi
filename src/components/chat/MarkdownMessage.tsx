"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

const markdownComponents: Components = {
  h1: ({ children }) => <h3 className="mb-2 mt-3 text-base font-black leading-7 text-ink dark:text-white first:mt-0">{children}</h3>,
  h2: ({ children }) => <h3 className="mb-2 mt-3 text-base font-black leading-7 text-ink dark:text-white first:mt-0">{children}</h3>,
  h3: ({ children }) => <h3 className="mb-2 mt-3 text-sm font-black leading-7 text-ink dark:text-white first:mt-0">{children}</h3>,
  h4: ({ children }) => <h4 className="mb-2 mt-3 text-sm font-bold leading-7 text-ink dark:text-white first:mt-0">{children}</h4>,
  p: ({ children }) => <p className="my-2 break-words [overflow-wrap:anywhere] leading-8 text-slate-800 dark:text-slate-100 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-2 pe-5 ps-0 leading-8 text-slate-800 dark:text-slate-100">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-2 pe-5 ps-0 leading-8 text-slate-800 dark:text-slate-100">{children}</ol>,
  li: ({ children }) => <li className="pe-1">{children}</li>,
  strong: ({ children }) => <strong className="font-black text-ink dark:text-white">{children}</strong>,
  em: ({ children }) => <em className="italic text-slate-800 dark:text-slate-100">{children}</em>,
  a: ({ href, children }) => {
    const external = Boolean(href?.startsWith("http"));
    return (
      <a
        href={href || "#"}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className="break-words font-semibold text-civic underline underline-offset-4 hover:text-civic/80 dark:text-emerald-200 dark:hover:text-emerald-100"
      >
        {children}
      </a>
    );
  },
  blockquote: ({ children }) => (
    <blockquote className="my-3 rounded-xl border-l-4 border-civic/50 bg-civic/5 px-4 py-3 text-ink/90 leading-8 dark:border-civic/40 dark:bg-[#0f2f2c] dark:text-slate-100">
      {children}
    </blockquote>
  ),
  code: ({ className, children }) => {
    const isBlock = Boolean(className);
    if (isBlock) {
      return (
        <code className="block overflow-x-auto rounded-xl border border-slate-200 bg-slate-950 p-3 text-left text-[0.86em] leading-7 text-slate-100 dark:border-slate-700" dir="ltr">
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.92em] text-slate-900 dark:bg-slate-800 dark:text-emerald-200">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-3 max-w-full overflow-x-auto rounded-xl bg-transparent p-0" dir="ltr">
      {children}
    </pre>
  )
};

export default function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="chat-markdown min-w-0 max-w-full whitespace-normal break-words text-sm leading-8 text-slate-800 dark:text-slate-100" dir="rtl">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
