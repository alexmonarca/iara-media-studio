import React from "react";
import { Image as ImageIcon, MessageSquare } from "lucide-react";

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function formatLabel(format) {
  const f = String(format || "").toLowerCase();
  if (f === "texto") return "Texto";
  if (f.includes("story")) return "Story";
  if (f.includes("retrato")) return "Retrato";
  if (f.includes("quadr")) return "Quadrado";
  return format || "—";
}

export default function GeneratedArtsHistoryList({ items, onOpenDetails }) {
  if (!items || items.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-background/40 p-4 text-sm text-muted-foreground">
        Ainda não há gerações registradas.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((row) => {
        const hasImage = Boolean(row.image_url);
        return (
          <button
            key={row.id}
            type="button"
            onClick={() => onOpenDetails?.(row)}
            className="w-full text-left rounded-2xl border border-border bg-background/40 hover:bg-background/60 transition-colors p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="h-8 w-8 rounded-2xl border border-border bg-card/70 inline-flex items-center justify-center">
                    {hasImage ? (
                      <ImageIcon className="w-4 h-4 text-primary" />
                    ) : (
                      <MessageSquare className="w-4 h-4 text-primary" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">
                      {row.caption ? String(row.caption).slice(0, 72) : "(sem legenda)"}
                      {row.caption && String(row.caption).length > 72 ? "…" : ""}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground truncate">
                      {formatLabel(row.format)} {row.created_at ? `• ${formatTime(row.created_at)}` : ""}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0 text-[11px] px-2.5 py-1 rounded-full border border-border bg-card/60 text-muted-foreground">
                Ver
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
