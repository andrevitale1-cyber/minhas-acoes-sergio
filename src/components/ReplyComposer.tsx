import { useEffect, useRef } from "react";
import { CornerDownRight, Send, X } from "lucide-react";
import { CommentEditor } from "./CommentEditor";

export function ReplyComposer({
  author,
  value,
  onChange,
  onDismiss,
  onSubmit,
  busy,
}: {
  author: string;
  value: string;
  onChange: (value: string) => void;
  onDismiss: () => void;
  onSubmit: () => Promise<void>;
  busy: boolean;
}) {
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (busy) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !form.current?.contains(event.target)) onDismiss();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("keydown", escape);
    };
  }, [onDismiss, busy]);
  return (
    <form
      ref={form}
      aria-label={`Responder a ${author}`}
      className="relative ml-2 mt-4 min-w-0 pl-5 before:absolute before:-top-5 before:bottom-6 before:left-0 before:w-4 before:rounded-bl-xl before:border-b-2 before:border-l-2 before:border-primary/20 sm:ml-4 sm:pl-6"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!busy && value.trim()) await onSubmit();
      }}
    >
      <div className="min-w-0 rounded-2xl border border-primary/15 bg-card p-3 shadow-sm sm:p-4">
        <div className="mb-3 flex items-start gap-2 text-xs text-muted-foreground">
          <CornerDownRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <p className="min-w-0 flex-1 break-words">
            Respondendo a <span className="font-semibold text-foreground">{author}</span>
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={onDismiss}
            title="Cancelar resposta"
            aria-label="Cancelar resposta"
            className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-secondary disabled:opacity-40"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <CommentEditor
          autoFocus
          value={value}
          onChange={onChange}
          placeholder="Escreva sua resposta…"
        />
        <div className="mt-3 flex justify-end">
          <button
            disabled={busy || !value.trim()}
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
            {busy ? "Enviando…" : "Responder"}
          </button>
        </div>
      </div>
    </form>
  );
}
