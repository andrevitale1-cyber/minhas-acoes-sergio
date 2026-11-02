import { Download, FileText } from "lucide-react";
import { attachmentSize, attachmentUrl, type CommentAttachment } from "@/lib/attachments";
export function CommentAttachments({ files }: { files: CommentAttachment[] }) {
  if (!files.length) return null;
  return (
    <div className="mt-3 grid min-w-0 gap-2">
      {files.map((file) => (
        <div
          key={file.id}
          className="min-w-0 overflow-hidden rounded-xl border border-border bg-card"
        >
          {file.type.startsWith("image/") && (
            <a
              href={attachmentUrl(file.id)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Abrir imagem ${file.name}`}
            >
              <img
                src={attachmentUrl(file.id)}
                alt={file.name}
                loading="lazy"
                decoding="async"
                className="max-h-80 w-full bg-secondary/30 object-contain"
              />
            </a>
          )}
          <a
            href={attachmentUrl(file.id, true)}
            download={file.name}
            className="flex min-w-0 items-center gap-2 px-3 py-2.5 text-sm text-primary hover:bg-secondary/50"
            aria-label={`Baixar ${file.name}, ${attachmentSize(file.size)}`}
          >
            <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{file.name}</span>
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {attachmentSize(file.size)}
            </span>
            <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
          </a>
        </div>
      ))}
    </div>
  );
}
