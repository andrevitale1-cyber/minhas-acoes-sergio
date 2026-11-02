import { useId, useRef } from "react";
import { Bold, Italic, Underline, List, Quote, Paperclip, X, FileText } from "lucide-react";
import { attachmentAccept, attachmentSize } from "@/lib/attachments";
import type { AttachmentDraft } from "@/hooks/use-attachment-draft";
import { CommentText } from "./CommentText";

export function CommentEditor({
  value,
  onChange,
  placeholder,
  autoFocus = false,
  attachments,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoFocus?: boolean;
  attachments?: AttachmentDraft | undefined;
  disabled?: boolean;
}) {
  const input = useRef<HTMLTextAreaElement>(null);
  const helpId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
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
        disabled={disabled}
        autoFocus={autoFocus}
        aria-label={placeholder}
        aria-describedby={helpId}
        placeholder={placeholder}
        className="block min-h-24 w-full resize-y bg-transparent px-3 py-3 text-base leading-relaxed outline-none placeholder:text-muted-foreground/70 sm:text-sm"
      />
      {attachments && attachments.items.length > 0 && (
        <ul className="space-y-1 px-3 pb-3">
          {attachments.items.map((item) => (
            <li
              key={item.id}
              className="flex min-w-0 items-center gap-2 rounded-lg bg-secondary/60 px-2 py-1.5 text-xs"
            >
              <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{item.file.name}</span>
              <span className="shrink-0 text-muted-foreground">
                {attachmentSize(item.file.size)}
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => attachments.remove(item.id)}
                aria-label={`Remover ${item.file.name}`}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full hover:bg-secondary"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {attachments?.error && (
        <p role="alert" className="px-3 pb-3 text-xs text-destructive">
          {attachments.error}
        </p>
      )}
      <div
        role="toolbar"
        aria-label="Formatação do comentário"
        className="flex flex-wrap items-center gap-0.5 border-t border-border/70 bg-secondary/30 px-2 py-1.5"
      >
        {attachments && (
          <>
            <input
              ref={fileInput}
              type="file"
              multiple
              accept={attachmentAccept}
              disabled={disabled}
              aria-label="Selecionar anexos"
              className="sr-only"
              tabIndex={-1}
              onChange={(event) => {
                if (event.target.files) attachments.add(event.target.files);
                event.target.value = "";
              }}
            />
            <button
              type="button"
              title="Anexar imagem ou arquivo"
              aria-label="Anexar imagem ou arquivo"
              disabled={disabled || attachments.items.length >= 3}
              onClick={() => fileInput.current?.click()}
              className="mr-1 flex h-8 w-8 items-center justify-center rounded-lg border-r border-border text-primary hover:bg-secondary disabled:opacity-40 sm:h-9 sm:w-9"
            >
              <Paperclip className="h-4 w-4" aria-hidden="true" />
            </button>
          </>
        )}
        {tools.map((tool) => (
          <button
            key={tool.label}
            type="button"
            disabled={disabled}
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
          disabled={disabled}
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
        {attachments && <span className="w-full">Até 3 anexos · 3 MB por arquivo</span>}
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
