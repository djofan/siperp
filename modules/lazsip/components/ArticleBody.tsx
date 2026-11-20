import { Fragment } from "react";

// Render a small Markdown subset as React nodes, never raw HTML.
function inline(text: string) {
  return text.split(/(\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g).map((part, i) => {
    const match = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/.exec(part);
    return match ? <a key={i} href={match[2]} rel="noopener noreferrer" target="_blank" className="underline underline-offset-4">{match[1]}</a> : <Fragment key={i}>{part}</Fragment>;
  });
}
export function ArticleBody({ content }: { content: string }) {
  return <div className="space-y-4 break-words text-base leading-8 text-lazsip-primary-900/85 sm:text-lg">{content.split(/\n\s*\n/).map((block, i) => {
    const text = block.trim();
    if (/^#{1,3} /.test(text)) return <h2 key={i} className="pt-4 text-2xl font-bold leading-snug text-lazsip-primary-900">{inline(text.replace(/^#{1,3} /, ""))}</h2>;
    if (text.startsWith("> ")) return <blockquote key={i} className="border-l-4 border-lazsip-primary-500 bg-lazsip-primary-50 px-5 py-3">{inline(text.replace(/^> ?/gm, ""))}</blockquote>;
    const lines = text.split("\n");
    if (lines.every(line => /^[-*] /.test(line))) return <ul key={i} className="list-disc space-y-2 pl-6">{lines.map((line, j) => <li key={j}>{inline(line.slice(2))}</li>)}</ul>;
    return <p key={i} className="whitespace-pre-line">{inline(text)}</p>;
  })}</div>;
}
