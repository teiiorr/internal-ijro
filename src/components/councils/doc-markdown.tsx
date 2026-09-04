"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

/**
 * Renders a protocol/xulosa document (markdown extracted from .docx) with real
 * structure — headings, bold, lists and bordered tables — instead of a raw text
 * dump. GFM enables tables; breaks preserve the document's line layout.
 */
export function DocMarkdown({ children }: { children: string }) {
  return (
    <div className="text-[13px] leading-relaxed text-[var(--foreground)]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          p: (props) => <p className="my-2 break-words first:mt-0 last:mb-0" {...props} />,
          strong: (props) => <strong className="font-bold text-[var(--foreground)]" {...props} />,
          h1: (props) => <h3 className="mb-2 mt-5 text-base font-bold first:mt-0" {...props} />,
          h2: (props) => <h4 className="mb-2 mt-4 text-sm font-bold first:mt-0" {...props} />,
          h3: (props) => <h4 className="mb-1.5 mt-4 text-sm font-bold first:mt-0" {...props} />,
          ul: (props) => <ul className="my-2 list-disc space-y-1 pl-5" {...props} />,
          ol: (props) => <ol className="my-2 list-decimal space-y-1 pl-5" {...props} />,
          blockquote: (props) => <blockquote className="my-2 border-l-2 border-[var(--border-strong)] pl-3 text-[var(--muted)]" {...props} />,
          hr: () => <hr className="my-4 border-[var(--border)]" />,
          a: (props) => <a className="text-[var(--primary)] underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...props} />,
          code: (props) => <code className="rounded bg-[var(--surface-3)] px-1 py-0.5 font-mono text-[12px]" {...props} />,
          table: (props) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-[var(--border)]">
              <table className="w-full border-collapse text-[12px] tabular-nums" {...props} />
            </div>
          ),
          thead: (props) => <thead className="bg-[var(--surface-3)]" {...props} />,
          th: (props) => <th className="border border-[var(--border)] px-2.5 py-1.5 text-left align-top font-semibold" {...props} />,
          td: (props) => <td className="border border-[var(--border)] px-2.5 py-1.5 align-top" {...props} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
