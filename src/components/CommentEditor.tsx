import { useId, useRef } from "react";
import { Bold, Italic, Underline, List, Quote } from "lucide-react";
import { CommentText } from "./CommentText";

export function CommentEditor({
  value,
  onChange,
  placeholder,
  autoFocus = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  const input = useRef<HTMLTextAreaElement>(null);
  const helpId = useId();
  function format(marker: string, block = false) {
    const field = input.current;
    if (!field) return;
    const start =
      block && field.selectionStart > 0
        ? value.lastIndexOf("\n", field.selectionStart - 1) + 1
        : field.selectionStart;
    const lineEnd = value.indexOf("\n", field.selectionEnd);
    const end = block ? (lineEnd === -1 ? value.length : lineEnd) : field.selectionEnd;
    const selected = value.slice(start, end);
    const replacement = block
      ? (selected || "texto")
          .split("\n")
          .map((line) => marker + line.replace(/^(#{1,2} |> |- )/, ""))
          .join("\n")
      : marker + (selected || "texto") + marker;
    const next = value.slice(0, start) + replacement + value.slice(end);
    if (next.length > 2000) return;
    onChange(next);
    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(
        start + marker.length,
        start + replacement.length - (block ? 0 : marker.length),
      );
    });
  }
  const tools = [
    { label: "Negrito", icon: Bold, marker: "**" },
    { label: "Itálico", icon: Italic, marker: "*" },
    { label: "Sublinhado", icon: Underline, marker: "__" },
    { label: "Lista", icon: List, marker: "- ", block: true },
    { label: "Citação", icon: Quote, marker: "> ", block: true },
  ];
  return (
    <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-border bg-card transition-shadow focus-within:border-primary/35 focus-within:ring-2 focus-within:ring-primary/5">
      <textarea
        ref={input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={2000}
        rows={3}
        autoFocus={autoFocus}
        aria-label={placeholder}
        aria-describedby={helpId}
        placeholder={placeholder}
        className="block min-h-24 w-full resize-y bg-transparent px-3 py-3 text-base leading-relaxed outline-none placeholder:text-muted-foreground/70 sm:text-sm"
      />
      <div
        role="toolbar"
        aria-label="Formatação do comentário"
        className="flex flex-wrap items-center gap-0.5 border-t border-border/70 bg-secondary/30 px-2 py-1.5"
      >
        {tools.map((tool) => (
          <button
            key={tool.label}
            type="button"
            title={tool.label}
            aria-label={tool.label}
            onClick={() => format(tool.marker, tool.block)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:h-9 sm:w-9"
          >
            <tool.icon className="h-4 w-4" aria-hidden="true" />
          </button>
        ))}
        <select
          aria-label="Tamanho do texto"
          defaultValue="size"
          className="ml-1 min-h-8 max-w-24 rounded-lg border-0 bg-transparent px-1 py-1 text-xs text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary sm:text-sm"
          onChange={(e) => {
            format(e.target.value, true);
            e.target.value = "size";
          }}
        >
          <option value="size" disabled>
            Tamanho
          </option>
          <option value="">Normal</option>
          <option value="## ">Grande</option>
          <option value="# ">Maior</option>
        </select>
      </div>
      <div
        id={helpId}
        className="flex flex-wrap justify-between gap-2 border-t border-border/50 px-3 py-2 text-[11px] text-muted-foreground"
      >
        <span className="sr-only sm:not-sr-only">Selecione um trecho para formatar.</span>
        <span>{value.length}/2000</span>
      </div>
      {value && (
        <details className="border-t border-border/60 bg-secondary/20 p-3 text-sm">
          <summary className="cursor-pointer font-semibold text-primary">Ver prévia</summary>
          <div className="mt-3">
            <CommentText text={value} />
          </div>
        </details>
      )}
    </div>
  );
}
