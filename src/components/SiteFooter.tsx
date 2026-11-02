import { Instagram, Linkedin } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-card px-6 py-6">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
        <p>
          site crafted by <span className="font-medium text-foreground">André Vitale</span>
        </p>
        <nav aria-label="Redes sociais de André Vitale" className="flex items-center gap-1">
          <a
            href="https://www.linkedin.com/in/andr%C3%A9-vitale-388a42272"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="André Vitale no LinkedIn"
            title="LinkedIn"
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-secondary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            <Linkedin className="h-4 w-4" aria-hidden="true" />
          </a>
          <a
            href="https://www.instagram.com/andrevitale/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="André Vitale no Instagram"
            title="Instagram"
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-secondary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            <Instagram className="h-4 w-4" aria-hidden="true" />
          </a>
        </nav>
      </div>
    </footer>
  );
}
