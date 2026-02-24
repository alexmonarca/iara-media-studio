import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Instagram, Lock, MessageSquare, PauseCircle, X } from "lucide-react";

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(nameOrPhone) {
  const s = String(nameOrPhone || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "?";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (a + b).toUpperCase();
}

export default function RecentConversationsTeaser({ onOpenPlans }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [activeTab, setActiveTab] = useState("whatsapp");

  useEffect(() => {
    if (!open) return;
    let alive = true;

    async function run() {
      setLoading(true);
      setError("");
      try {
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;
        const userId = userData?.user?.id;
        if (!userId) {
          if (!alive) return;
          setItems([]);
          return;
        }

        const { data, error: qErr } = await supabase
          .from("interaction_logs")
          .select("id,sender,message_content,customer_phone,created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(20);

        if (qErr) throw qErr;
        if (!alive) return;
        setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Não foi possível carregar as conversas.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [open]);

  const customers = useMemo(() => {
    const map = new Map();
    for (const m of items) {
      const phone = m.customer_phone || "";
      if (!phone) continue;
      const prev = map.get(phone);
      if (!prev) {
        map.set(phone, {
          phone,
          lastMessage: m.message_content,
          lastAt: m.created_at,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt));
  }, [items]);

  const ordered = useMemo(() => {
    return [...items].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }, [items]);

  return (
    <>
      <div className="mt-5 rounded-2xl border border-border bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/50 overflow-hidden">
        <div className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground">Chat — ver últimas conversas</div>
            <p className="mt-1 text-xs text-muted-foreground">
               Pause IA por conversa e veja Instagram (Preview Painel Omnichannel).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="h-10 px-4 rounded-full border border-border bg-background/40 text-foreground hover:bg-background/60 transition-colors text-sm inline-flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Chat - ver últimas conversas
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-background/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-5xl rounded-3xl border border-border bg-card shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-border flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-lg font-semibold text-foreground">Últimas conversas (preview)</div>
                <div className="text-xs text-muted-foreground">Demonstração do Painel Omnichannel — alguns controles são bloqueados.</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenPlans?.()}
                  className="h-9 px-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-xs font-medium"
                >
                  Ir para Planos
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-border bg-background/40 text-foreground hover:bg-background/60 transition-colors"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="px-5 pt-4">
              <div className="inline-flex rounded-full border border-border bg-background/40 p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("whatsapp")}
                  className={
                    "px-4 py-2 rounded-full text-sm transition-colors " +
                    (activeTab === "whatsapp" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-background/60")
                  }
                >
                  WhatsApp
                </button>
                <button
                  type="button"
                  disabled
                  className="px-4 py-2 rounded-full text-sm text-muted-foreground inline-flex items-center gap-2 opacity-70 cursor-not-allowed"
                  title="Disponível no upgrade"
                >
                  <Instagram className="w-4 h-4" /> Instagram <Lock className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-1 rounded-2xl border border-border bg-background/40 overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <div className="text-sm font-medium text-foreground">Conversas</div>
                  <div className="text-xs text-muted-foreground">Clique para abrir (preview).</div>
                </div>
                <div className="p-2">
                  {loading ? (
                    <div className="p-3 text-xs text-muted-foreground">Carregando…</div>
                  ) : error ? (
                    <div className="p-3 text-xs text-destructive">{error}</div>
                  ) : customers.length === 0 ? (
                    <div className="p-3 text-xs text-muted-foreground">Nenhuma conversa encontrada.</div>
                  ) : (
                    <div className="max-h-[420px] overflow-auto chat-scroll">
                      {customers.map((c) => (
                        <div
                          key={c.phone}
                          className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 hover:bg-background/60 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-9 w-9 rounded-full border border-border bg-card flex items-center justify-center text-xs font-semibold text-foreground">
                              {getInitials(c.phone)}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm text-foreground truncate">{c.phone}</div>
                              <div className="text-[11px] text-muted-foreground truncate">{c.lastMessage}</div>
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled
                            className="h-8 px-3 rounded-full border border-border bg-background/40 text-muted-foreground text-xs inline-flex items-center gap-2 cursor-not-allowed"
                            title="Pausar por conversa disponível no upgrade"
                          >
                            <PauseCircle className="w-4 h-4" /> Pausar <Lock className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-2 rounded-2xl border border-border bg-background/40 overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">Histórico recente</div>
                    <div className="text-xs text-muted-foreground">WhatsApp (preview).</div>
                  </div>
                  <div className="inline-flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Lock className="w-3.5 h-3.5" /> Controles completos no upgrade
                  </div>
                </div>

                <div className="p-4">
                  {loading ? (
                    <div className="text-xs text-muted-foreground">Carregando…</div>
                  ) : error ? (
                    <div className="text-xs text-destructive">{error}</div>
                  ) : ordered.length === 0 ? (
                    <div className="text-xs text-muted-foreground">Nenhuma mensagem encontrada.</div>
                  ) : (
                    <div className="max-h-[420px] overflow-auto chat-scroll space-y-2">
                      {ordered.map((m) => {
                        const isAI = (m.sender || "").toLowerCase() === "ai";
                        const who = isAI ? "IA" : m.customer_phone ? `Cliente (${m.customer_phone})` : "Cliente";
                        return (
                          <div key={m.id} className={"flex " + (isAI ? "justify-end" : "justify-start")}>
                            <div
                              className={
                                "max-w-[85%] rounded-2xl border border-border px-3 py-2 " +
                                (isAI ? "bg-primary/10" : "bg-muted/30")
                              }
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-[11px] text-muted-foreground truncate">{who}</div>
                                <div className="text-[11px] text-muted-foreground flex-shrink-0">{formatTime(m.created_at)}</div>
                              </div>
                              <div className="mt-1 text-sm text-foreground whitespace-pre-wrap break-words">{m.message_content}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
