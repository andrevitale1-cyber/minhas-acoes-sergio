import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const questions = [
  {
    question: "O que é o Minhas Ações?",
    answer:
      "O Minhas Ações é uma comunidade criada para aproximar investidores e facilitar a troca de opiniões sobre empresas listadas na Bolsa de Valores.",
  },
  {
    question: "O que posso fazer por aqui?",
    answer:
      "Você pode pesquisar uma ação, acompanhar o que outros investidores estão falando sobre a empresa, compartilhar suas opiniões e participar das conversas. Também pode deixar uma avaliação de 1 a 5 estrelas para cada empresa.",
  },
  {
    question: "Sobre quais assuntos podemos conversar?",
    answer:
      "Resultados, notícias, fatos relevantes e acontecimentos que movimentam o mercado. Cada empresa tem seu próprio espaço para reunir comentários, perguntas e respostas da comunidade.",
  },
  {
    question: "Qual é a proposta da comunidade?",
    answer:
      "A proposta é simples: reunir diferentes perspectivas em um só lugar e fortalecer a troca de ideias entre investidores.",
  },
  {
    question: "Preciso de uma conta para participar?",
    answer:
      "Você pode pesquisar empresas e ler os comentários sem entrar. Para compartilhar uma opinião, responder a alguém ou avaliar uma empresa, entre com sua conta pelo Google ou por e-mail.",
  },
  {
    question: "Quem está por trás do Minhas Ações?",
    answer:
      "O Minhas Ações foi idealizado e fundado por Sérgio Neto, analista de ações e consultor de investimentos.",
  },
];

export function AboutCommunity() {
  return (
    <section
      id="sobre"
      aria-labelledby="about-title"
      className="border-t border-border/60 bg-background px-6 py-16 sm:py-24"
    >
      <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-[0.8fr_1.2fr] md:gap-16">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Sobre o Minhas Ações
          </p>
          <h2
            id="about-title"
            className="mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl"
          >
            Uma comunidade.
            <br />
            <span className="text-primary">Diferentes perspectivas.</span>
          </h2>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Um espaço para conhecer outras opiniões e compartilhar a sua.
          </p>
        </div>
        <Accordion type="single" collapsible defaultValue="question-0" className="min-w-0">
          {questions.map((item, index) => (
            <AccordionItem
              key={item.question}
              value={`question-${index}`}
              className="border-border/80 last:border-b-0"
            >
              <AccordionTrigger className="gap-4 py-5 text-[15px] font-semibold leading-snug hover:text-primary hover:no-underline focus-visible:rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="pr-5 text-sm leading-relaxed text-muted-foreground">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
