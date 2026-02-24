import React from "react";

const ITEMS = [
  {
    title: "Academias, Clínicas e consultórios",
    desc: "Atendimento, agendamentos e dúvidas frequentes com respostas rápidas e consistentes.",
  },
  {
    title: "Imobiliárias e Corretores",
    desc: "Captação de leads, qualificação e respostas 24h para não perder oportunidades.",
  },
  {
    title: "Profissionais autônomos e empresários",
    desc: "Organização da rotina, comunicação e follow-ups automáticos para ganhar tempo.",
  },
  {
    title: "Pessoas precisando de um Agente IA (clonar a si mesmo)",
    desc: "Um agente que fala no seu tom e ajuda a escalar atendimento e conteúdo.",
  },
];

export default function WhoWeHelpSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold tracking-tight">Quem ajudamos</h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          A IARA se adapta a diferentes operações — do atendimento ao conteúdo.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {ITEMS.map((item) => (
          <div
            key={item.title}
            className="rounded-3xl border border-border bg-card/70 p-6 shadow-[0_0_0_1px_hsl(var(--border))]"
          >
            <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
