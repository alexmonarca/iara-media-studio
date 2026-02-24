import React from "react";
import { ArrowRight, BrainCircuit, CheckCircle2, Shield, Sparkles } from "lucide-react";
import PlanBuilder from "./PlanBuilder";
import WhoWeHelpSection from "./WhoWeHelpSection";

export default function LandingPage({ onOpenLogin, onOpenSignup }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/50">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card">
              <BrainCircuit className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm font-semibold tracking-tight">IARA</span>
          </div>

          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#funcionalidades" className="hover:text-foreground transition-colors">
              Funcionalidades
            </a>
            <a href="#como-funciona" className="hover:text-foreground transition-colors">
              Como funciona
            </a>
            <a href="#faq" className="hover:text-foreground transition-colors">
              Dúvidas
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenLogin}
              className="h-10 rounded-full border border-border bg-background px-4 text-sm font-medium hover:bg-muted/30 transition-colors"
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={onOpenSignup}
              className="h-10 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-95 transition-opacity"
            >
              Teste grátis
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-32 -top-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -left-24 bottom-0 h-80 w-80 rounded-full bg-muted/40 blur-3xl" />
          </div>

          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-[1.2fr_0.8fr] md:py-24">
            <div>
              <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-6xl">
                IA pronta para operar seu <span className="text-primary">Negócio</span>
              </h1>
              <div className="mt-3 max-w-2xl">
                <p className="text-pretty text-base leading-relaxed text-foreground/90 md:text-lg">
                  Iara é a sua Gestora de Mídias e Secretária inteligente que cuida da rotina!
                </p>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground md:text-base">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary flex-shrink-0" />
                    <span>Atendimento no WhatsApp;</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary flex-shrink-0" />
                    <span>Suporte a interações e direct Instagram</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary flex-shrink-0" />
                    <span>Gestão de conteúdo</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary flex-shrink-0" />
                    <span>Criação de artes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary flex-shrink-0" />
                    <span>Agendamento de Posts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary flex-shrink-0" />
                    <span>Vendas 24h.</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={onOpenSignup}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground hover:opacity-95 transition-opacity"
                >
                  Começar agora
                  <ArrowRight className="h-4 w-4" />
                </button>
                <a
                  href="#funcionalidades"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-background px-6 text-sm font-medium hover:bg-muted/30 transition-colors"
                >
                  Ver funcionalidades
                </a>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <BadgeItem icon={Shield} title="Seguro" desc="Acesso por login" />
                <BadgeItem icon={Sparkles} title="Automação" desc="Rotinas inteligentes" />
                <BadgeItem icon={CheckCircle2} title="Prático" desc="Configuração rápida" />
              </div>
            </div>

            <div className="hidden md:block" aria-hidden="true" />
          </div>
        </section>

        <section id="funcionalidades" className="mx-auto max-w-6xl px-4 py-14">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">Funcionalidades</h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Tudo organizado em um painel, com foco em operação e crescimento.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <FeatureCard
              title="Treinar IA"
              desc="Defina horários, preços e regras para respostas consistentes."
            />
            <FeatureCard
              title="Conexões"
              desc="Conecte canais e acompanhe status em tempo real."
            />
            <FeatureCard
              title="Assinatura"
              desc="Planos e upgrades para destravar módulos conforme sua fase."
            />
          </div>
        </section>

        <WhoWeHelpSection />

        <PlanBuilder onCta={onOpenSignup} />

        <section id="como-funciona" className="border-y border-border bg-card/30">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <h2 className="text-2xl font-semibold tracking-tight">Como funciona</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <StepCard n={1} title="Crie a conta" desc="Acesse com email e senha." />
              <StepCard n={2} title="Configure" desc="Preencha os dados do seu negócio." />
              <StepCard n={3} title="Ative" desc="Conecte canais e comece a testar." />
            </div>
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-2xl font-semibold tracking-tight">Dúvidas</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <FaqItem
              q="Tem teste grátis?"
              a="Sim. Ao entrar pela primeira vez você pode experimentar antes de contratar o seu plano."
            />
            <FaqItem
              q="Preciso deixar meu celular ligado?"
              a="Não! A conexão é feita uma única vez via QR Code (como no WhatsApp Web) e nossa nuvem mantém tudo rodando 24h, mesmo com seu celular desligado ou sem internet."
            />
            <FaqItem
              q="Como a IA aprende sobre meu negócio?"
              a='Você conversa em um chat com ela e passa informações como se estivesse ensinando por chat um novo colaborador, informando sobre seus preços, horários e diferenciais. A IARA processa isso e já sai atendendo com a "personalidade" do seu negócio.'
            />
            <FaqItem
              q="Ela substitui um gestor de tráfego?"
              a="A IARA cuida do atendimento (fundo de funil) e da criação de conteúdo orgânico. Ela potencializa o trabalho do gestor, garantindo que nenhum lead vindo dos anúncios seja perdido por falta de resposta."
            />
          </div>

          <div className="mt-10 rounded-3xl border border-border bg-card/70 p-6 text-center">
            <h3 className="text-lg font-semibold">Pronto para começar?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Crie sua conta e ajuste a IARA para o seu negócio.
            </p>
            <button
              type="button"
              onClick={onOpenSignup}
              className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground hover:opacity-95 transition-opacity"
            >
              Teste grátis
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} IARA</span>
          <span>Desenvolvido com carinho por MonarcaHub</span>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ title, desc }) {
  return (
    <div className="rounded-3xl border border-border bg-card/70 p-6 shadow-[0_0_0_1px_hsl(var(--border))]">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

function StepCard({ n, title, desc }) {
  return (
    <div className="rounded-3xl border border-border bg-background/40 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-sm font-semibold text-foreground">
          {n}
        </div>
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
        </div>
      </div>
    </div>
  );
}

function FaqItem({ q, a }) {
  return (
    <div className="rounded-3xl border border-border bg-card/70 p-6">
      <h3 className="text-sm font-semibold">{q}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{a}</p>
    </div>
  );
}

function BadgeItem({ icon: Icon, title, desc }) {
  return (
    <div className="rounded-2xl border border-border bg-background/40 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-xs text-muted-foreground">{desc}</div>
        </div>
      </div>
    </div>
  );
}
