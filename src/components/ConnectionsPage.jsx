import React, { useMemo, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Globe,
  MessageCircle,
  RefreshCw,
  Unplug,
  ChevronDown,
  ChevronUp,
  Instagram as InstagramIcon,
  Lock,
} from "lucide-react";


function StatusBadge({ connected, labelConnected = "Online", labelDisconnected = "Offline" }) {
  return (
    <span
      className={
        "text-[10px] px-2 py-0.5 rounded-full border inline-flex items-center gap-1 " +
        (connected
          ? "bg-success/10 text-success border-success/30"
          : "bg-muted/30 text-muted-foreground border-border")
      }
    >
      <Circle className={"w-2.5 h-2.5 " + (connected ? "fill-success text-success" : "fill-muted-foreground text-muted-foreground")} />
      {connected ? labelConnected : labelDisconnected}
    </span>
  );
}

function Step({ done, title, children }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-border bg-background/40 px-4 py-3">
      <div className="mt-0.5">
        <CheckCircle2 className={"w-5 h-5 " + (done ? "text-success" : "text-muted-foreground")} />
      </div>
      <div className="min-w-0">
        <div className={"font-medium text-sm " + (done ? "text-foreground" : "text-muted-foreground")}>{title}</div>
        {children && <div className="mt-1 text-xs text-muted-foreground leading-relaxed">{children}</div>}
      </div>
    </div>
  );
}

export default function ConnectionsPage({
  planName,
  isTrialPlan,
  wantsOfficialApi,
  onOpenPlansTab,

  // Extras (Assinatura)
  extraChannels = 0,

  // WhatsApp (MonarcaHub)
  onOpenWhatsAppConnectUnofficial,
  whatsappUnofficialStatus,

  // WhatsApp (API Oficial)
  onOpenWhatsAppConnectOfficial,
  whatsappOfficialStatus,

  // Gestão (já conectado)
  onWhatsAppDisconnect,
  onWhatsAppRestart,
}) {
  const [showAlreadyConnected, setShowAlreadyConnected] = useState(false);
  const [tutorialCollapsed, setTutorialCollapsed] = useState(true);

  const whatsappUnofficialConnected = (whatsappUnofficialStatus ?? "disconnected") === "connected";
  const whatsappOfficialConnected = (whatsappOfficialStatus ?? "disconnected") === "connected";
  const whatsappConnected = whatsappUnofficialConnected || whatsappOfficialConnected;

  const showOfficialConnect = !isTrialPlan && Boolean(wantsOfficialApi);

  const openUnofficialConnect = () => {
    // Se já está online, o clique em "Conectar" deve abrir o modal de gestão
    // (desconectar/reiniciar), independente do plano.
    if (whatsappUnofficialConnected) {
      setShowAlreadyConnected(true);
      return;
    }
    onOpenWhatsAppConnectUnofficial?.();
  };

  const openOfficialConnect = () => {
    onOpenWhatsAppConnectOfficial?.({ mode: "whatsapp" });
  };

  const openInstagramConnect = () => {
    onOpenWhatsAppConnectOfficial?.({ mode: "instagram" });
  };

  const openBothConnect = () => {
    onOpenWhatsAppConnectOfficial?.({ mode: "both" });
  };

  const instagramUnlocked = Number(extraChannels || 0) >= 1;

  const checklist = useMemo(() => {
    const steps = [];
    steps.push({
      id: "choose",
      done: true,
      title: "1) Escolha o tipo de conexão",
      description: "Aqui você vai conectar via MonarcaHub (padrão) ou via API Oficial da Meta (se habilitada no Treinar IA).",
    });
    steps.push({
      id: "connect",
      done: whatsappConnected,
      title: "2) Conecte o WhatsApp",
      description: "Clique em Conectar e finalize o passo a passo (QR Code ou Embedded Signup).",
    });
    steps.push({
      id: "verify",
      done: whatsappConnected,
      title: "3) Verifique se ficou Online",
      description: "Quando estiver Online, você já pode voltar ao Chat e ativar a IA.",
    });
    return steps;
  }, [whatsappConnected]);

  return (
    <main className="max-w-5xl mx-auto animate-in fade-in">
      <header className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Conexões</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Centralize suas integrações aqui. (Plano atual: <span className="text-foreground">{planName || "—"}</span>)
            </p>
          </div>

          {onOpenPlansTab && (
            <button
              type="button"
              onClick={onOpenPlansTab}
              className="h-10 px-4 rounded-full border border-border bg-background/40 text-foreground hover:bg-background/60 transition-colors text-sm"
            >
              Ver planos / Upgrade
            </button>
          )}
        </div>
      </header>

      <section className="flex flex-col lg:flex-row gap-6">
        {/* Coluna esquerda (desktop): Tutorial + Instagram (masonry simples) */}
        <div className="flex flex-col gap-6 lg:w-1/2">
        {/* Tutorial (padrão recolhido) */}
        <div className="order-1 lg:order-none rounded-3xl border border-border bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/50 shadow-[0_0_0_1px_hsl(var(--border))] overflow-hidden">
          <div className="p-5 border-b border-border">
            <div className="flex items-center justify-between gap-3 cursor-pointer" onClick={() => setTutorialCollapsed(!tutorialCollapsed)}>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-foreground">Tutorial rápido</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Passo a passo para conectar o WhatsApp sem poluir o Chat.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge connected={whatsappConnected} />
                {tutorialCollapsed ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronUp className="w-5 h-5 text-muted-foreground" />}
              </div>
            </div>
          </div>

          {!tutorialCollapsed && (<div className="p-5 space-y-3">
            {checklist.map((s) => (
              <Step key={s.id} done={s.done} title={s.title}>
                {s.description}
              </Step>
            ))}

            <div className="mt-2 rounded-2xl border border-border bg-background/40 overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <div className="text-sm font-medium text-foreground">Vídeo</div>
                <div className="text-xs text-muted-foreground">Veja o passo a passo completo.</div>
              </div>
              <div className="aspect-video w-full bg-black">
                <iframe
                  className="w-full h-full"
                  src="https://www.youtube.com/embed/2rgyPJzZXQg"
                  title="Tutorial Conexões"
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </div>)}
        </div>
        {/* Instagram */}
        <div className="order-3 lg:order-none rounded-3xl border border-border bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/50 shadow-[0_0_0_1px_hsl(var(--border))]">
          <div className="p-5 border-b border-border flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-foreground">Instagram</h2>
              <p className="mt-1 text-xs text-muted-foreground">Conecte e gerencie seu canal de Direct.</p>
            </div>
            {!instagramUnlocked && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border bg-muted/30 text-muted-foreground border-border">
                <Lock className="w-3.5 h-3.5" /> Bloqueado
              </span>
            )}
          </div>
          <div className="p-5 space-y-3">
            <div className="rounded-2xl border border-border bg-background/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <InstagramIcon className="w-4 h-4 text-primary" />
                  <div className="text-sm font-medium text-foreground">Instagram API (Meta)</div>
                </div>
                <StatusBadge connected={false} />
              </div>
              <div className="mt-2 text-xs text-muted-foreground leading-relaxed">
                {instagramUnlocked
                  ? "Conecte o Instagram via API Oficial da Meta para gerenciar mensagens diretas."
                  : "Para liberar o Instagram, vá em Assinatura → Adicionais → Canais Extras e selecione 1 ou mais."}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={instagramUnlocked ? openInstagramConnect : undefined}
                  disabled={!instagramUnlocked}
                  className="h-10 px-4 rounded-full border border-border bg-background/40 text-foreground hover:bg-background/60 transition-colors text-sm inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  title={!instagramUnlocked ? 'Disponível ao contratar "Canais Extras" na aba Assinatura' : undefined}
                >
                  {!instagramUnlocked && <Lock className="w-4 h-4" />}
                  Conectar Instagram
                  <RefreshCw className="w-4 h-4 opacity-70" />
                </button>
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* Coluna direita (desktop): WhatsApp | No mobile vem logo após o tutorial */}
        <div className="order-2 lg:order-none lg:w-1/2">
        <div className="rounded-3xl border border-border bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/50 shadow-[0_0_0_1px_hsl(var(--border))]">
          <div className="p-5 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">WhatsApp</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Conecte e gerencie seu canal de atendimento.
            </p>
          </div>

          <div className="p-5 space-y-3">
            <div className="rounded-2xl border border-border bg-background/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-primary" />
                  <div className="text-sm font-medium text-foreground">MonarcaHub (padrão)</div>
                </div>
                <StatusBadge connected={whatsappUnofficialConnected} />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={openUnofficialConnect}
                  className="h-10 px-4 rounded-full border border-border bg-background/40 text-foreground hover:bg-background/60 transition-colors text-sm inline-flex items-center gap-2"
                >
                  Conectar
                  <RefreshCw className="w-4 h-4 opacity-70" />
                </button>
              </div>
            </div>

            {showOfficialConnect ? (
              <div className="rounded-2xl border border-border bg-background/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary" />
                    <div className="text-sm font-medium text-foreground">API Oficial da Meta</div>
                  </div>
                  <StatusBadge connected={whatsappOfficialConnected} />
                </div>

                <div className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  Esse modo aparece porque você marcou uma opção de “WhatsApp API Oficial da Meta” na aba Treinar IA.
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={openOfficialConnect}
                    className="h-10 px-4 rounded-full border border-border bg-background/40 text-foreground hover:bg-background/60 transition-colors text-sm inline-flex items-center gap-2"
                  >
                    Conectar WhatsApp (API Oficial)
                    <RefreshCw className="w-4 h-4 opacity-70" />
                  </button>

                  {instagramUnlocked && (
                    <button
                      type="button"
                      onClick={openBothConnect}
                      className="h-10 px-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm inline-flex items-center gap-2"
                      title="Conecta WhatsApp + Instagram usando Embedded Signup"
                    >
                      Conectar WhatsApp + Instagram
                      <Globe className="w-4 h-4 opacity-90" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-background/40 p-4">
                <div className="text-sm font-medium text-foreground">API Oficial da Meta</div>
                <div className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Para habilitar, vá em <span className="text-foreground">Treinar IA</span> e marque uma opção em “WhatsApp API Oficial da Meta”.
                </div>
              </div>
            )}

            {whatsappUnofficialConnected && (
              <div className="rounded-2xl border border-border bg-background/40 p-4">
                <div className="text-sm font-medium text-foreground">Gerenciar conexão</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Se você já está conectado e quer trocar o número, use as ações abaixo.
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onWhatsAppDisconnect?.()}
                    disabled={!onWhatsAppDisconnect}
                    className="h-10 px-4 rounded-full border border-border bg-background/40 text-foreground hover:bg-background/60 transition-colors text-sm inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Unplug className="w-4 h-4" />
                    Desconectar
                  </button>

                  <button
                    type="button"
                    onClick={() => onWhatsAppRestart?.()}
                    disabled={!onWhatsAppRestart}
                    className="h-10 px-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Reiniciar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </section>

      {/* Modal: já conectado ao clicar em conectar de novo */}
      {showAlreadyConnected && (
        <div
          onClick={() => setShowAlreadyConnected(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md p-6 rounded-2xl border border-border bg-card shadow-2xl"
          >
            <h2 className="text-2xl font-semibold mb-3 text-foreground">Parece que você já está conectado!</h2>
            <p className="text-muted-foreground mb-4">
              Você pode desconectar para vincular outro número, ou reiniciar a conexão.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowAlreadyConnected(false);
                  onWhatsAppDisconnect?.();
                }}
                disabled={!onWhatsAppDisconnect}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-accent transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Desconectar
              </button>
              {onWhatsAppRestart && (
                <button
                  type="button"
                  onClick={() => {
                    setShowAlreadyConnected(false);
                    onWhatsAppRestart?.();
                  }}
                  disabled={!onWhatsAppRestart}
                  className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Reiniciar
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowAlreadyConnected(false)}
              className="mt-4 w-full px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
