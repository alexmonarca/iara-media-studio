import React, { useMemo, useState } from "react";
import { Check, ShieldCheck } from "lucide-react";

const BASE_PRICE = 150;

const DEFAULT_OPTIONS = [
  {
    key: "secretaria",
    title: "Secretária",
    desc: "cuida do atendimento no Whats e Insta",
    originalPriceLabel: "R$ 1250,00",
    offerPriceLabel: "R$ 150",
    price: 150,
  },
  {
    key: "vendedor",
    title: "Vendedor",
    desc: "A mais alta inteligência em vendas",
    originalPriceLabel: "R$ 2500,00",
    offerPriceLabel: "R$ 150",
    price: 150,
  },
  {
    key: "designer",
    title: "Designer",
    desc: "Artes todos os dias em suas mídias",
    originalPriceLabel: "R$ 3700",
    offerPriceLabel: "R$ 250",
    price: 250,
  },
  {
    key: "gestor_midias",
    title: "Gestor de Mídias",
    desc: "planeja conteúdo e agenda postagens e legendas",
    originalPriceLabel: "R$ 1800",
    offerPriceLabel: "GRÁTIS!",
    price: 0,
  },
];

export default function PlanBuilder({ onCta }) {
  const [selected, setSelected] = useState(() => new Set());

  const total = useMemo(() => {
    let sum = BASE_PRICE;
    for (const opt of DEFAULT_OPTIONS) {
      if (selected.has(opt.key)) sum += opt.price;
    }
    return sum;
  }, [selected]);

  const toggle = (key) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <section id="orcamento" className="border-y border-border bg-card/20">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            Monte seu <span className="text-primary">Plano</span>
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Selecione os módulos extras para sua IARA ficar ainda mais potente.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2 lg:items-start">
          <div className="space-y-4">
            <div className="rounded-3xl border border-border bg-card/70 p-6 shadow-[0_0_0_1px_hsl(var(--border))]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-base font-semibold text-foreground">Plano Base IARA</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    IA Treinada + 1 Canal (WhatsApp) + 1 Usuário + Suporte IA e manutenção
                  </div>
                </div>
                <div className="text-xl font-semibold text-primary">R$ {BASE_PRICE}</div>
              </div>
            </div>

            {DEFAULT_OPTIONS.map((opt) => {
              const active = selected.has(opt.key);
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => toggle(opt.key)}
                  className={
                    "w-full rounded-3xl border border-border p-5 text-left transition-colors " +
                    (active ? "bg-primary/10" : "bg-background/40 hover:bg-muted/25")
                  }
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={
                          "flex h-7 w-7 items-center justify-center rounded-xl border border-border transition-colors " +
                          (active ? "bg-primary text-primary-foreground" : "bg-card")
                        }
                        aria-hidden="true"
                      >
                        {active ? <Check className="h-4 w-4" /> : null}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-foreground">{opt.title}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{opt.desc}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground line-through">{opt.originalPriceLabel}</div>
                      <div className="text-sm font-semibold text-foreground">{opt.offerPriceLabel}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="rounded-3xl border border-border bg-card/70 p-8 text-center shadow-[0_0_0_1px_hsl(var(--border))] lg:sticky lg:top-24">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Comece seu teste 100% grátis
            </p>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Investimento Mensal
            </p>
            <div className="mt-5 flex items-start justify-center gap-2">
              <span className="mt-2 text-2xl font-semibold text-primary">R$</span>
              <span className="text-6xl font-semibold tracking-tight text-foreground">{total}</span>
            </div>

            <button
              type="button"
              onClick={onCta}
              className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-primary px-6 text-sm font-semibold text-primary-foreground hover:opacity-95 transition-opacity"
            >
              Contratar Agora
            </button>

            <p className="mt-5 inline-flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" /> Pagamento Seguro & Sem Fidelidade
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
