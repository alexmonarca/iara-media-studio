import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ChevronDown, ChevronUp, MessageSquare } from "lucide-react";

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

export default function ConversationLogsCard({
  title = "Conversas - chat",
  limit = 10,
  onOpenPlans,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);

  useEffect(() => {
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
          setLoading(false);
          return;
        }

        const { data, error: qErr } = await supabase
          .from("interaction_logs")
          .select("id,sender,message_content,customer_phone,created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (qErr) throw qErr;

        if (!alive) return;
        setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Não foi possível carregar o histórico.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [limit]);

  const ordered = useMemo(() => {
    // Vem desc do banco (mais recente primeiro), aqui mostramos como chat (antigo -> novo)
    return [...items].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }, [items]);

  return (
    <div className="rounded-3xl border border-border bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/50 shadow-[0_0_0_1px_hsl(var(--border))] overflow-hidden h-fit">
      <div className="p-5 border-b border-border">
        <div
          className="flex items-center justify-between gap-3 cursor-pointer"
          onClick={() => setCollapsed(!collapsed)}
        >
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Últimas {limit} mensagens registradas no atendimento.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {collapsed ? (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>

      {!collapsed && (
        <div className="p-5 space-y-4">
          <div className="rounded-2xl border border-border bg-background/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <div className="text-sm font-medium text-foreground">Painel Omnichannel</div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  Confira todas as conversas e tenha mais controle de quem a IA conversa.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenPlans?.()}
                className="h-9 px-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-xs font-medium"
              >
                Abrir planos
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background/40 overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-foreground">Histórico recente</div>
                <div className="text-xs text-muted-foreground">Registro simplificado do chat.</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  // recarrega rápido sem mexer no restante da página
                  setItems([]);
                  setLoading(true);
                  setError("");
                  // dispara o efeito atual alterando limit? não; então forçamos via microtask
                  Promise.resolve().then(async () => {
                    try {
                      const { data: userData } = await supabase.auth.getUser();
                      const userId = userData?.user?.id;
                      if (!userId) {
                        setLoading(false);
                        return;
                      }
                      const { data, error: qErr } = await supabase
                        .from("interaction_logs")
                        .select("id,sender,message_content,customer_phone,created_at")
                        .eq("user_id", userId)
                        .order("created_at", { ascending: false })
                        .limit(limit);
                      if (qErr) throw qErr;
                      setItems(Array.isArray(data) ? data : []);
                    } catch (e) {
                      setError(e?.message || "Não foi possível carregar o histórico.");
                    } finally {
                      setLoading(false);
                    }
                  });
                }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Atualizar
              </button>
            </div>

            <div className="p-4">
              {loading ? (
                <div className="text-xs text-muted-foreground">Carregando…</div>
              ) : error ? (
                <div className="text-xs text-destructive">{error}</div>
              ) : ordered.length === 0 ? (
                <div className="text-xs text-muted-foreground">Nenhuma mensagem encontrada.</div>
              ) : (
                <div className="max-h-[360px] overflow-auto chat-scroll space-y-2">
                  {ordered.map((m) => {
                    const isAI = (m.sender || "").toLowerCase() === "ai";
                    const who = isAI ? "IA" : m.customer_phone ? `Cliente (${m.customer_phone})` : "Cliente";
                    return (
                      <div
                        key={m.id}
                        className={"flex " + (isAI ? "justify-end" : "justify-start")}
                      >
                        <div
                          className={
                            "max-w-[85%] rounded-2xl border border-border px-3 py-2 " +
                            (isAI
                              ? "bg-primary/10"
                              : "bg-muted/30")
                          }
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-[11px] text-muted-foreground truncate">{who}</div>
                            <div className="text-[11px] text-muted-foreground flex-shrink-0">
                              {formatTime(m.created_at)}
                            </div>
                          </div>
                          <div className="mt-1 text-sm text-foreground whitespace-pre-wrap break-words">
                            {m.message_content}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
