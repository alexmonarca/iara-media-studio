import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles,
  Send,
  Maximize2,
  Minimize2,
  CheckSquare,
  Trash2,
  ChevronDown,
  ArrowUpRight,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import RecentConversationsTeaser from "@/components/RecentConversationsTeaser";

/**
 * Primeira tela (estilo Gemini/Lovable): pergunta + input central.
 * Agora: exibe a resposta do agente (via n8n) no próprio chat e permite continuar a conversa.
 */
export default function HomeAIStart({
  user,
  webhookUrl,
  onOpenTrainTab,
  onOpenPlansTab,
  onOpenConnectionsTab,
  planName,
  isTrialPlan,

  // WhatsApp status (para validar ativação da IA)
  whatsappUnofficialStatus,
  whatsappOfficialStatus,

  aiStatus,
  showOnboardingStepsShortcut,
  onOpenOnboardingSteps,
  onToggleAI,
  trialExpired,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [error, setError] = useState("");
  const [conversationId, setConversationId] = useState(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [composerExpanded, setComposerExpanded] = useState(false);
  const [aiStatusHint, setAiStatusHint] = useState("");
  const [showPauseConfirm, setShowPauseConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Histórico minimizado por padrão (para parecer um “chat novo” ao abrir)
  const [historyMinimized, setHistoryMinimized] = useState(false);
  const [historyLimit, setHistoryLimit] = useState(50);
  const [historyHasMore, setHistoryHasMore] = useState(false);

  const messagesEndRef = useRef(null);
  const composerRef = useRef(null);
  const modelMenuRef = useRef(null);

  const [modelMenuOpen, setModelMenuOpen] = useState(false);

  const chatBlocked = Boolean(trialExpired);

  const canSend = useMemo(
    () =>
      input.trim().length > 0 &&
      !sending &&
      !chatBlocked &&
      Boolean(conversationId) &&
      Boolean(user?.id),
    [input, sending, conversationId, user?.id, chatBlocked]
  );

  useEffect(() => {
    if (historyMinimized) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending, loadingHistory, historyMinimized]);

  useEffect(() => {
    if (historyMinimized) return;
    // Quando o usuário “abre” o histórico, vai direto pro final.
    const id = requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    });
    return () => cancelAnimationFrame(id);
  }, [historyMinimized]);

  useEffect(() => {
    if (!modelMenuOpen) return;
    const onDocClick = (e) => {
      if (!modelMenuRef.current) return;
      if (modelMenuRef.current.contains(e.target)) return;
      setModelMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [modelMenuOpen]);

  const parseWebhookResponse = (rawText) => {
    // n8n às vezes devolve JSON com caracteres de controle (\n, etc). Sanitizamos.
    const tryParse = (t) => {
      try {
        return JSON.parse(t);
      } catch {
        return null;
      }
    };

    const json = tryParse(rawText);
    if (json) return json;

    const sanitized = rawText.replace(/[\u0000-\u001F\u007F-\u009F]/g, " ");
    const json2 = tryParse(sanitized);
    if (json2) return json2;

    // Se não for JSON, tratamos como texto mesmo.
    return rawText;
  };

  const getReplyTextFromN8n = (data) => {
    if (typeof data === "string") return data;
    if (!data || typeof data !== "object") return "Resposta processada.";

    // Compatível com variações comuns no n8n
    return (
      data.reply ??
      data.output ??
      data.message ??
      data.text ??
      data.content ??
      "Resposta processada."
    );
  };

  const persistMessage = async ({ role, content, conversation_id }) => {
    if (!user?.id) return;

    // Observação: depende de RLS no seu Supabase permitindo INSERT/SELECT do próprio usuário.
    const { error: insertError } = await supabase.from("chat_messages").insert({
      conversation_id,
      user_id: user.id,
      role,
      content,
    });

    if (insertError) throw insertError;
  };

  const loadHistory = async (limit = historyLimit) => {
    if (!user?.id) return;

    setLoadingHistory(true);
    setError("");

    try {
      // Busca as ÚLTIMAS mensagens (ordem desc) e depois inverte p/ renderizar em ordem cronológica.
      const { data, error: selectError } = await supabase
        .from("chat_messages")
        .select("conversation_id, role, content, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (selectError) throw selectError;

      const ordered = [...(data ?? [])].reverse();

      const restored = ordered.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.created_at,
      }));

      setMessages(restored);
      setHistoryHasMore((data ?? []).length === limit);

      const lastConversationId =
        data && data.length > 0 ? data[0].conversation_id : null;

      // Se já existe histórico, seguimos na última conversa; senão, criamos uma nova.
      setConversationId(
        lastConversationId ??
          crypto?.randomUUID?.() ??
          `${Date.now()}-${Math.random()}`
      );

      // Minimiza automaticamente quando há histórico (pra “parecer novo chat” ao abrir)
      if (restored.length > 0) setHistoryMinimized(true);
    } catch (e) {
      // Não travar a UI: só avisar.
      setError(
        e?.message ||
          "Não foi possível carregar o histórico. Verifique as políticas (RLS) e permissões da tabela chat_messages."
      );
      if (!conversationId) {
        setConversationId(crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);
      }
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    // Carrega histórico assim que o usuário estiver autenticado.
    // Também recarrega quando o usuário pedir “carregar mais histórico”.
    if (!user?.id) return;
    loadHistory(historyLimit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, historyLimit]);

  const clearHistory = async () => {
    if (!user?.id || clearingHistory) return;

    setClearingHistory(true);
    setError("");

    try {
      const { error: deleteError } = await supabase
        .from("chat_messages")
        .delete()
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;

      setMessages([]);
      setConversationId(
        crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
      );
    } catch (e) {
      setError(e?.message || "Não foi possível limpar o histórico.");
    } finally {
      setClearingHistory(false);
    }
  };

  const send = async () => {
    if (!canSend) return;
    if (chatBlocked) return;

    const userText = input.trim();
    setInput("");
    setSending(true);
    setError("");

    const userMessage = {
      role: "user",
      content: userText,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      if (!webhookUrl) {
        throw new Error("Webhook não configurado.");
      }

      // 1) Salva a mensagem do usuário no seu Supabase (persistência pós-F5)
      await persistMessage({
        role: "user",
        content: userText,
        conversation_id: conversationId,
      });

      const payload = {
        event: "user_message",
        source: "home_ai_start",
        user_id: user?.id ?? null,
        email: user?.email ?? null,
        message: userText.replace(/\n/g, " "),
        conversation_id: conversationId,
        created_at: new Date().toISOString(),
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const resp = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        mode: "cors",
        body: JSON.stringify(payload),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (!resp.ok) {
        const t = await resp.text().catch(() => "");
        throw new Error(t || `Webhook retornou ${resp.status}`);
      }

      const rawText = await resp.text();
      const parsed = parseWebhookResponse(rawText);
      const replyText = getReplyTextFromN8n(parsed);

      const assistantMessage = {
        role: "assistant",
        content: replyText,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // 2) Salva resposta do agente também
      await persistMessage({
        role: "assistant",
        content: replyText,
        conversation_id: conversationId,
      });
    } catch (e) {
      const rawMessage = e?.message || "";

      const friendlyMessage =
        e?.name === "AbortError"
          ? "A conexão com a IA demorou demais e expirou. Tente novamente em alguns instantes."
          : rawMessage.includes("timeout exceeded when trying to connect")
            ? "O workflow da IA não conseguiu se conectar a um serviço externo (timeout). Verifique o n8n e as credenciais/URLs usadas no fluxo."
            : rawMessage ||
              "Erro ao processar a resposta do agente. Verifique o nó ‘Respond to Webhook’ no n8n.";

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: friendlyMessage,
          isError: true,
          timestamp: new Date().toISOString(),
        },
      ]);
      setError(friendlyMessage);
    } finally {
      setSending(false);
    }
  };

  const whatsappUnofficialConnected =
    (whatsappUnofficialStatus ?? "disconnected") === "connected";
  const whatsappOfficialConnected =
    (whatsappOfficialStatus ?? "disconnected") === "connected";
  const whatsappConnected = whatsappUnofficialConnected || whatsappOfficialConnected;

  const aiActive = aiStatus === "active";

  const planTier = useMemo(() => {
    const p = String(planName || "").toLowerCase();
    if (p.includes("premium")) return "premium";
    if (p.includes("start") || p.includes("base")) return "start";
    // níveis: Trial < Start < Premium
    return "trial";
  }, [planName]);

  const shouldShowRecentConversationsTeaser = planTier !== "premium";

  const availableModels = useMemo(() => {
    if (planTier === "premium") return ["Trial", "Start", "Premium"];
    if (planTier === "start") return ["Start"]; // não pode voltar para Trial
    return ["Trial"]; // trial/gratuito
  }, [planTier]);

  const allModels = useMemo(() => ["Trial", "Start", "Premium"], []);

  const [aiModel, setAiModel] = useState(() => availableModels[availableModels.length - 1] || "Trial");

  useEffect(() => {
    const next = availableModels.includes(aiModel)
      ? aiModel
      : availableModels[availableModels.length - 1] || "Trial";
    setAiModel(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableModels.join("|")]);

  return (
    <section className="min-h-[70vh] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-3xl">
        <div className="mb-8">
          <div className="min-w-0">
            {onOpenPlansTab && (
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 backdrop-blur px-3 py-1.5 text-xs text-muted-foreground">
                <span className="text-foreground/90">{planName || "Plano"}</span>
                <span className="opacity-60">|</span>
                <button
                  type="button"
                  onClick={onOpenPlansTab}
                  className="underline underline-offset-4 text-foreground hover:text-primary transition-colors"
                >
                  Fazer upgrade
                </button>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>Olá! Aqui é a IARA!</span>
              </div>
            </div>

            <h1 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-foreground leading-tight">
              {isTrialPlan ? "Bora Treinar essa IA?" : "Olá! Como posso ajudar hoje?"}
            </h1>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/50 shadow-[0_0_0_1px_hsl(var(--border))]">
          <div className="p-4 md:p-5">
            {/* Área do chat */}
            {loadingHistory && messages.length === 0 && (
              <div className="mb-4 rounded-2xl px-4 py-3 text-sm border border-border bg-background/40 text-muted-foreground">
                Carregando histórico…
              </div>
            )}

             {messages.length > 0 && historyMinimized && (
               <button
                 type="button"
                 onClick={() => {
                   setHistoryMinimized(false);
                   setTimeout(() => composerRef.current?.focus(), 0);
                 }}
                 className="mb-4 w-full text-left rounded-2xl px-4 py-3 text-sm border border-border bg-background/40 text-muted-foreground hover:bg-background/60 transition-colors"
                 aria-label="Abrir histórico"
               >
                 Abrir Histórico.
               </button>
             )}

            {messages.length > 0 && !historyMinimized && (
              <div className="mb-4 max-h-[46vh] overflow-y-auto pr-1 space-y-3 chat-scroll">
                {historyHasMore && (
                  <div className="sticky top-0 z-10 pb-2 bg-card/70 supports-[backdrop-filter]:bg-card/50 backdrop-blur">
                    <button
                      type="button"
                      onClick={() => setHistoryLimit((v) => v + 50)}
                      className="w-full rounded-xl px-3 py-2 text-sm border border-border bg-background/40 text-foreground hover:bg-background/60 transition-colors"
                    >
                      Carregar mais histórico
                    </button>
                  </div>
                )}

                {messages.map((m, idx) => {
                  const isUser = m.role === "user";
                  return (
                    <div
                      key={`${m.timestamp ?? idx}-${idx}`}
                      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={
                          "max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed border " +
                          (m.isError
                            ? "bg-destructive/10 border-destructive/30 text-destructive"
                            : isUser
                              ? "bg-primary text-primary-foreground border-primary/30"
                              : "bg-background/40 text-foreground border-border")
                        }
                      >
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      </div>
                    </div>
                  );
                })}

                {sending && (
                  <div className="flex justify-start">
                    <div className="max-w-[90%] rounded-2xl px-4 py-3 text-sm border border-border bg-background/40 text-muted-foreground">
                      Gerando resposta…
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}

            {/* Input */}
            <div className="flex items-end gap-3">
              <div className="flex-1">
                  <textarea
                    ref={composerRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onFocus={() => {
                      if (!historyMinimized) return;
                      setHistoryMinimized(false);
                    }}
                    onKeyDown={(e) => {
                    // Enter = enviar. Ctrl/Cmd + Enter = quebra de linha.
                    if (
                      e.key === "Enter" &&
                      !(e.ctrlKey || e.metaKey || e.shiftKey || e.altKey)
                    ) {
                      e.preventDefault();
                      if (!chatBlocked) send();
                      return;
                    }

                    // Garante que Ctrl/Cmd+Enter NÃO seja interpretado como envio por algum handler externo
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.stopPropagation();
                    }
                  }}
                  onInput={(e) => {
                    // Auto-grow simples (sem bibliotecas) quando NÃO está expandido
                    if (composerExpanded) return;
                    e.currentTarget.style.height = "0px";
                    e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                  }}
                  rows={composerExpanded ? 6 : 1}
                  placeholder={
                    messages.length === 0
                      ? "Ensine tudo sobre seu negócio aqui!"
                      : "Continue a conversa com a IARA…"
                  }
                  className={
                    "w-full bg-transparent text-foreground placeholder:text-muted-foreground/80 outline-none text-base md:text-lg resize-none leading-relaxed overflow-y-auto chat-scroll " +
                    (composerExpanded ? "min-h-32 max-h-[46vh]" : "max-h-40")
                  }
                  aria-label="Mensagem para a IARA"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setComposerExpanded((v) => !v);
                  // Mantém foco no campo ao expandir/contrair
                  setTimeout(() => composerRef.current?.focus(), 0);
                }}
                className="hidden sm:inline-flex items-center justify-center h-11 w-11 rounded-2xl border border-border bg-background/40 text-foreground hover:bg-background/60 transition-colors"
                aria-label={composerExpanded ? "Fechar caixa de texto" : "Abrir caixa de texto"}
                title={composerExpanded ? "Fechar" : "Abrir"}
              >
                {composerExpanded ? (
                  <Minimize2 className="w-5 h-5" />
                ) : (
                  <Maximize2 className="w-5 h-5" />
                )}
              </button>

              <button
                type="button"
                onClick={send}
                disabled={!canSend}
                className="inline-flex items-center justify-center h-11 w-11 rounded-2xl bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Enviar"
                title={chatBlocked ? "Faça upgrade para continuar" : "Enter para enviar"}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>

              <div className="mt-4 flex flex-wrap gap-2">
               <button
                 type="button"
                 onClick={onOpenTrainTab}
                 className="px-4 py-2 rounded-full border border-border bg-background/40 text-foreground hover:bg-background/60 transition-colors text-sm"
               >
                 Treinar IA
               </button>

               <button
                 type="button"
                 onClick={onOpenConnectionsTab}
                 className="px-4 py-2 rounded-full border border-border bg-background/40 text-foreground hover:bg-background/60 transition-colors text-sm inline-flex items-center gap-2"
               >
                 <span>Conexões</span>
                 <span
                   className={
                     "text-[10px] px-2 py-0.5 rounded-full border " +
                     (whatsappConnected
                       ? "bg-success/10 text-success border-success/30"
                       : "bg-muted/30 text-muted-foreground border-border")
                   }
                 >
                   {whatsappConnected ? "Online" : "Offline"}
                 </span>
               </button>

              {showOnboardingStepsShortcut && Boolean(onOpenOnboardingSteps) && (
                <button
                  type="button"
                  onClick={onOpenOnboardingSteps}
                  className="px-4 py-2 rounded-xl border border-border bg-background/40 text-foreground hover:bg-background/60 transition-colors text-sm inline-flex items-center gap-2"
                  aria-label="Primeiros passos - Economize aqui"
                >
                  <CheckSquare className="w-4 h-4" />
                  Primeiros passos - Economize aqui!
                </button>
              )}


              <button
                type="button"
                onClick={() => setIsUpgradeModalOpen(true)}
                className="px-4 py-2 rounded-xl border border-border bg-background/40 text-foreground hover:bg-background/60 transition-colors text-sm"
              >
                Criar arte
              </button>

              <button
                type="button"
                onClick={() => {
                  if (chatBlocked) {
                    setAiStatusHint(
                      "Seu teste grátis terminou. Faça upgrade para ativar a IA."
                    );
                    if (onOpenPlansTab) onOpenPlansTab();
                    return;
                  }
                  if (aiActive) {
                    setShowPauseConfirm(true);
                    return;
                  }
                  if (!whatsappConnected) {
                    setAiStatusHint("Para ativar a IA, conecte o WhatsApp primeiro.");
                    return;
                  }

                  // WhatsApp online => pode ativar a IA (persistência acontece no callback do App)
                  setAiStatusHint("");
                  if (onToggleAI) onToggleAI();
                }}
                className={
                  "px-4 py-2 rounded-xl border text-sm select-none transition-colors " +
                  (aiActive
                    ? "bg-success/10 text-success border-success/30 hover:bg-success/20 cursor-pointer"
                    : chatBlocked
                      ? "bg-muted/30 text-muted-foreground border-border cursor-not-allowed"
                      : "bg-warning/10 text-warning border-warning/30 hover:bg-background/40")
                }
                aria-label={aiActive ? "IA ativa" : "IA Pausada"}
              >
                {aiActive ? "IA ativa" : "IA Pausada"}
               </button>

               {messages.length > 0 && (
                 <div className="inline-flex items-center gap-2">
                   <div ref={modelMenuRef} className="relative">
                     <button
                       type="button"
                       onClick={() => setModelMenuOpen((v) => !v)}
                       className="h-10 rounded-full border border-border bg-background/40 text-foreground hover:bg-background/60 transition-colors text-sm px-3 inline-flex items-center gap-2"
                       aria-label="Modelo da IA"
                       title="Modelo da IA (de acordo com seu plano)"
                     >
                       <span className="font-medium">{aiModel}</span>
                       <ChevronDown className="w-4 h-4 opacity-70" />
                     </button>

                     {modelMenuOpen && (
                       <div className="absolute right-0 bottom-full mb-2 w-48 rounded-2xl border border-border bg-card shadow-xl overflow-hidden z-[100]">
                         {allModels.map((model) => {
                           const isAvailable = availableModels.includes(model);
                           const isActive = aiModel === model;

                           const isUpgradeLocked = !isAvailable && planTier !== "premium" && (model === "Start" || model === "Premium");
                           const isDowngradeLocked = !isAvailable && planTier !== "trial" && model === "Trial";

                           const label =
                             isUpgradeLocked
                               ? "Fazer upgrade"
                               : isDowngradeLocked
                                 ? "Indisponível"
                                 : "Selecionar";

                           return (
                             <button
                               key={model}
                               type="button"
                               onClick={() => {
                                 if (isAvailable) {
                                   setAiModel(model);
                                   setModelMenuOpen(false);
                                   return;
                                 }
                                 if (isUpgradeLocked && onOpenPlansTab) {
                                   setModelMenuOpen(false);
                                   onOpenPlansTab();
                                 }
                               }}
                               disabled={!isAvailable && !isUpgradeLocked}
                               className={
                                 "w-full px-3 py-2.5 text-sm flex items-center justify-between gap-2 text-left transition-colors " +
                                 (isActive
                                   ? "bg-primary/10 text-foreground"
                                   : "hover:bg-accent") +
                                 (!isAvailable && !isUpgradeLocked
                                   ? " opacity-60 cursor-not-allowed"
                                   : "")
                               }
                             >
                               <span
                                 className={
                                   "" +
                                   (isDowngradeLocked ? " line-through" : "")
                                 }
                               >
                                 {model}
                               </span>
                               <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                 {isUpgradeLocked && <ArrowUpRight className="w-3.5 h-3.5" />}
                                 <span>{label}</span>
                               </span>
                             </button>
                           );
                         })}
                       </div>
                     )}
                   </div>

                   <button
                     type="button"
                     onClick={() => setShowClearConfirm(true)}
                     className="inline-flex items-center justify-center h-10 w-10 rounded-full border border-border bg-background/40 text-foreground hover:bg-background/60 transition-colors"
                     aria-label="Limpar histórico do chat"
                     title="Limpar histórico"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                 </div>
               )}
             </div>

             {chatBlocked && onOpenPlansTab && (
               <div className="mt-3">
                 <div className="text-sm border border-border bg-background/40 text-muted-foreground rounded-xl px-3 py-2 flex flex-wrap items-center gap-2">
                   <span>
                     Seu plano de teste terminou. Faça upgrade para voltar a usar o chat.
                   </span>
                   <button
                     type="button"
                     onClick={onOpenPlansTab}
                     className="underline underline-offset-4 text-foreground hover:text-primary transition-colors"
                   >
                     Fazer upgrade
                   </button>
                 </div>
               </div>
             )}

             {(aiStatusHint || error) && (
               <div className="mt-3 space-y-2">
                 {error && (
                   <div className="text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded-xl px-3 py-2">
                     {error}
                   </div>
                 )}

                 {aiStatusHint && (
                   <div className="text-sm border border-border bg-background/40 text-muted-foreground rounded-xl px-3 py-2">
                     {aiStatusHint}
                   </div>
                 )}
               </div>
             )}

            <div className="mt-3 text-xs text-muted-foreground">
              A IARA pode cometer erros, é bom revisar as informações na aba “Treinar IA”.
            </div>

            {/* Observação: mensagens técnicas de deploy (Vercel/env) não devem aparecer para o usuário final */}
          </div>
        </div>

        {shouldShowRecentConversationsTeaser && (
          <RecentConversationsTeaser onOpenPlans={onOpenPlansTab} />
        )}

        {isUpgradeModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-background/80 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl">
              <div className="p-5">
                <div className="text-lg font-semibold text-foreground">
                  Recurso disponível apenas no upgrade
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Para usar <strong className="text-foreground">Criar arte</strong>, é
                  necessário fazer upgrade do seu plano.
                </p>

                <div className="mt-5 flex flex-wrap gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsUpgradeModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-border bg-background/40 text-foreground hover:bg-background/60 transition-colors text-sm"
                  >
                    Fechar
                  </button>
                  {onOpenPlansTab && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsUpgradeModalOpen(false);
                        onOpenPlansTab();
                      }}
                      className="px-4 py-2 rounded-lg bg-primary text-primary-foreground transition-colors text-sm"
                    >
                      Ver Assinatura
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Pausar IA */}
        {showPauseConfirm && (
          <div
            onClick={() => setShowPauseConfirm(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md p-6 rounded-2xl border border-border bg-card shadow-2xl"
            >
              <h2 className="text-2xl font-semibold mb-3 text-foreground">
                Pausar IA?
              </h2>
              <p className="text-muted-foreground mb-4">
                Tem certeza de que deseja pausar a IA? Ela não responderá mais mensagens até ser reativada.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPauseConfirm(false);
                    if (onToggleAI) onToggleAI();
                  }}
                  className="flex-1 px-4 py-2 rounded-lg bg-warning text-warning-foreground hover:bg-warning/90 transition-colors font-medium"
                >
                  Pausar
                </button>
                <button
                  onClick={() => setShowPauseConfirm(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-accent transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Limpar Histórico */}
        {showClearConfirm && (
          <div
            onClick={() => !clearingHistory && setShowClearConfirm(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md p-6 rounded-2xl border border-border bg-card shadow-2xl"
              role="dialog"
              aria-modal="true"
            >
              <h2 className="text-2xl font-semibold mb-3 text-foreground">
                Limpar histórico?
              </h2>
              <p className="text-muted-foreground mb-4">
                Isso apagará definitivamente todas as mensagens do seu chat.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    await clearHistory();
                    setShowClearConfirm(false);
                  }}
                  disabled={clearingHistory}
                  className="flex-1 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {clearingHistory ? "Limpando…" : "Apagar"}
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  disabled={clearingHistory}
                  className="flex-1 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-accent transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

