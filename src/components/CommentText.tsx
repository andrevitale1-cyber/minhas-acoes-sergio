import { Fragment } from "react";

// Only these text markers become React elements; user HTML is always rendered as text.
function inline(text: string) {
  return text
    .split(/(\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*)/g)
    .map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={i}>{part.slice(2, -2)}</strong>
      ) : part.startsWith("__") && part.endsWith("__") ? (
        <u key={i}>{part.slice(2, -2)}</u>
      ) : part.startsWith("*") && part.endsWith("*") && part.length > 2 ? (
        <em key={i}>{part.slice(1, -1)}</em>
      ) : (
        <Fragment key={i}>{part}</Fragment>
      ),
    );
}
export function CommentText({ text }: { text: string }) {
  return (
    <div className="space-y-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
      {text.split("\n").map((line, i) => {
        if (line.startsWith("## "))
          return (
            <p key={i} className="text-lg font-semibold">
              {inline(line.slice(3))}
            </p>
          );
        if (line.startsWith("# "))
          return (
            <p key={i} className="text-2xl font-semibold">
              {inline(line.slice(2))}
            </p>
          );
        if (line.startsWith("> "))
          return (
            <blockquote
              key={i}
              className="border-l-2 border-primary/40 pl-3 italic text-muted-foreground"
            >
              {inline(line.slice(2))}
            </blockquote>
          );
        if (line.startsWith("- "))
          return (
            <div key={i} className="flex min-w-0 gap-2">
              <span aria-hidden="true">•</span>
              <p className="min-w-0">{inline(line.slice(2))}</p>
            </div>
          );
        return <p key={i}>{line ? inline(line) : <br />}</p>;
      })}
    </div>
  );
}
