import { useId, useRef } from "react";
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
    { label: "Negrito", text: "N", marker: "**", className: "font-bold" },
    { label: "Itálico", text: "I", marker: "*", className: "italic" },
    { label: "Sublinhado", text: "S", marker: "__", className: "underline" },
    { label: "Lista", text: "• Lista", marker: "- ", block: true },
    { label: "Citação", text: "❝ Citação", marker: "> ", block: true },
  ];
  return (
    <div className="min-w-0 flex-1 rounded-xl border border-input bg-background">
      <div
        role="toolbar"
        aria-label="Formatação do comentário"
        className="flex flex-wrap items-center gap-1 border-b border-border p-2"
      >
        {tools.map((tool) => (
          <button
            key={tool.label}
            type="button"
            title={tool.label}
            aria-label={tool.label}
            onClick={() => format(tool.marker, tool.block)}
            className={`rounded px-3 py-2 text-sm hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${tool.className || ""}`}
          >
            {tool.text}
          </button>
        ))}
        <select
          aria-label="Tamanho do texto"
          defaultValue="size"
          className="rounded border border-input bg-background px-2 py-2 text-sm"
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
        className="w-full resize-y bg-transparent p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
      />
      <div
        id={helpId}
        className="flex justify-between gap-2 px-3 pb-2 text-xs text-muted-foreground"
      >
        <span>Selecione o texto para formatar.</span>
        <span>{value.length}/2000</span>
      </div>
      {value && (
        <details className="border-t border-border p-3 text-sm">
          <summary className="cursor-pointer font-semibold text-primary">Ver prévia</summary>
          <div className="mt-3">
            <CommentText text={value} />
          </div>
        </details>
      )}
    </div>
  );
}
