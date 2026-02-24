import React from "react";
import { Download, X, Image as ImageIcon, MessageSquare, Sparkles } from "lucide-react";

function formatTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function GeneratedArtDetailsModal({ open, art, onClose }) {
  if (!open || !art) return null;

  const hasImage = Boolean(art.image_url);

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="absolute left-1/2 top-1/2 w-[min(920px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2">
        <div className="rounded-3xl border border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-[0_20px_80px_-40px_hsl(var(--foreground)/0.35)] overflow-hidden">
          <div className="p-5 border-b border-border flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-2xl border border-border bg-background/40 flex items-center justify-center">
                  {hasImage ? <ImageIcon className="w-4 h-4 text-primary" /> : <MessageSquare className="w-4 h-4 text-primary" />}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">Detalhes da geração</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {art.format || "—"} • {formatTime(art.created_at)}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {hasImage && (
                <a
                  href={art.image_url}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="h-9 px-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-xs font-semibold inline-flex items-center gap-2"
                  title="Baixar imagem"
                >
                  <Download className="w-4 h-4" />
                  Baixar
                </a>
              )}
              <button
                type="button"
                onClick={onClose}
                className="h-9 w-9 rounded-full border border-border bg-background/40 text-foreground hover:bg-background/60 transition-colors inline-flex items-center justify-center"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="rounded-2xl border border-border bg-background/40 overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="text-xs font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" /> Resultado
                </div>
              </div>
              <div className="p-4 space-y-4">
                {hasImage ? (
                  <img
                    src={art.image_url}
                    alt="Arte gerada"
                    className="w-full max-h-[420px] object-contain rounded-xl border border-border bg-background"
                    loading="lazy"
                  />
                ) : (
                  <div className="rounded-xl border border-border bg-background/40 p-4 text-sm text-muted-foreground">
                    Esta geração foi somente texto.
                  </div>
                )}

                <div className="rounded-xl border border-border bg-background/40 p-4">
                  <div className="text-[11px] font-semibold text-muted-foreground">Legenda</div>
                  <div className="mt-2 text-sm text-foreground whitespace-pre-wrap break-words">{art.caption || "—"}</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-background/40 p-4">
                <div className="text-[11px] font-semibold text-muted-foreground">Prompt</div>
                <div className="mt-2 text-sm text-foreground whitespace-pre-wrap break-words">{art.prompt || "—"}</div>
              </div>

              <div className="rounded-2xl border border-border bg-background/40 p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[11px] font-semibold text-muted-foreground">Formato</div>
                    <div className="mt-1 text-sm text-foreground">{art.format || "—"}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-muted-foreground">Data</div>
                    <div className="mt-1 text-sm text-foreground">{formatTime(art.created_at)}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-muted/25 p-4 text-xs text-muted-foreground leading-relaxed">
                Dica: se você quiser repetir a geração, copie o prompt e ajuste objetivo/CTA/público para testar variações.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
