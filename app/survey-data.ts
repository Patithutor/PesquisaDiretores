export const levels = [
  "Inércia",
  "Acreditar",
  "Praticar",
  "Melhorar",
  "Compartilhar",
] as const;

export type Dimension = {
  title: string;
  options: readonly [string, string, string, string, string];
};

// Âncoras comportamentais da aba "Diretoria" da Régua de Maturidade da Liderança
// Sebrae/MT ("EXPECTATIVA INSTITUCIONAL"): a Diretoria define, em cada dimensão,
// o nível de maturidade esperado da liderança do Sebrae/MT.
//
// Os 16 títulos e os 5 textos-âncora são idênticos aos da aba "Questionário
// Colaborador" — o que muda entre os dois instrumentos é a pergunta, não a
// régua: lá se registra a prática observada, aqui a expectativa institucional.
export const dimensions = [
  {
    title: "Responsabilização",
    options: [
      "Assume responsabilidades principalmente quando direcionado. Pode atribuir resultados insuficientes a fatores externos ou depender de cobrança para concluir compromissos.",
      "Assume o que foi combinado, mas tende a comunicar dificuldades apenas quando o problema já está instalado. Precisa de acompanhamento para garantir a entrega.",
      "Assume compromissos, acompanha suas entregas e comunica antecipadamente riscos ou desvios. Responde pelos resultados sob sua responsabilidade.",
      "Antecipa riscos, toma providências antes da cobrança e assume problemas mesmo quando envolvem fatores externos. Busca soluções e mobiliza pessoas para corrigir desvios.",
      "Cria uma cultura de responsabilização na equipe. Desenvolve pessoas para que assumam compromissos, aprendam com erros e respondam pelos resultados sem depender da hierarquia.",
    ],
  },
  {
    title: "Autonomia",
    options: [
      "Busca validação mesmo em decisões que estão dentro de sua responsabilidade. Evita assumir decisões de maior complexidade.",
      "Decide situações conhecidas, mas recorre frequentemente à Diretoria diante de dúvidas, riscos ou situações novas.",
      "Toma decisões dentro de seu escopo, utilizando critérios claros e sabendo quando uma questão precisa ser escalada.",
      "Toma decisões com segurança mesmo diante de incerteza, antecipa impactos e assume os riscos inerentes ao seu papel.",
      "Cria autonomia na equipe. Distribui decisões, desenvolve critérios de julgamento e reduz a dependência da hierarquia.",
    ],
  },
  {
    title: "Protagonismo",
    options: [
      "Aguarda direcionamento e tende a esperar que outras pessoas definam o próximo passo.",
      "Age quando provocado ou diante de problemas já identificados.",
      "Toma iniciativa dentro de sua responsabilidade e conduz suas prioridades sem depender de cobrança constante.",
      "Antecipa necessidades, propõe soluções, mobiliza pessoas e assume a liderança de temas relevantes.",
      "Estimula protagonismo em outras pessoas e cria um ambiente em que a equipe assume problemas e oportunidades sem esperar pela liderança.",
    ],
  },
  {
    title: "Coragem para se posicionar",
    options: [
      "Evita se posicionar diante de situações de conflito ou decisões difíceis. Prefere acompanhar a posição dominante.",
      "Se posiciona quando solicitado, mas ainda demonstra receio diante de opiniões divergentes ou decisões de maior exposição.",
      "Expressa opiniões, apresenta discordâncias e propõe alternativas quando entende que algo precisa ser revisto.",
      "Questiona construtivamente, enfrenta conversas difíceis e se posiciona mesmo quando sua opinião é diferente da maioria.",
      "Cria segurança para que outras pessoas também questionem, discordem e tragam perspectivas diferentes sem medo de retaliação.",
    ],
  },
  {
    title: "Transparência",
    options: [
      "Comunica informações principalmente quando solicitado e pode evitar expor dificuldades.",
      "Comunica problemas quando eles se tornam evidentes, mas nem sempre antecipa riscos.",
      "Compartilha informações relevantes, sinaliza riscos e comunica desvios com antecedência.",
      "Cria transparência mesmo em situações desconfortáveis, apresentando problema, impacto e alternativas de solução.",
      "Estabelece um ambiente de confiança em que as pessoas se sentem seguras para comunicar erros, riscos e dificuldades rapidamente.",
    ],
  },
  {
    title: "Maturidade",
    options: [
      "Demonstra dificuldade para reconhecer a própria responsabilidade ou considerar perspectivas diferentes da sua.",
      "Reconhece pontos de desenvolvimento quando recebe feedback, mas ainda apresenta dificuldade para transformar consciência em mudança.",
      "Reconhece forças e limitações, busca feedback e ajusta comportamentos quando necessário.",
      "Reflete sobre o impacto de suas decisões, aprende com experiências e considera diferentes perspectivas antes de agir.",
      "Demonstra elevado autoconhecimento, amplia o horizonte das decisões e desenvolve maturidade nas pessoas ao seu redor.",
    ],
  },
  {
    title: "Coerência",
    options: [
      "Pode cobrar comportamentos que ainda não pratica de maneira consistente.",
      "Reconhece inconsistências quando apontadas, mas nem sempre consegue corrigi-las.",
      "Atua de maneira coerente com os valores e expectativas que comunica à equipe.",
      "É percebido como exemplo dos comportamentos que espera dos demais, inclusive em situações de pressão.",
      "Torna-se referência cultural, influenciando comportamentos por meio do exemplo e fortalecendo a coerência institucional.",
    ],
  },
  {
    title: "Compromisso institucional",
    options: [
      "Toma decisões predominantemente considerando sua própria área ou necessidade imediata.",
      "Considera impactos externos quando eles são apresentados por outras pessoas.",
      "Considera impactos sobre outras áreas, recursos e objetivos institucionais antes de decidir.",
      "Conecta interesses, antecipa impactos e busca soluções que favoreçam o Sebrae como um todo.",
      "Atua com perspectiva institucional, constrói convergência entre áreas e influencia decisões de longo prazo.",
    ],
  },
  {
    title: "Compromisso com resultados",
    options: [
      "Precisa de acompanhamento e cobrança para garantir entregas.",
      "Entrega demandas, mas reage aos desvios depois que eles acontecem.",
      "Planeja, acompanha e entrega seus compromissos dentro dos prazos acordados.",
      "Antecipa obstáculos, mobiliza recursos e ajusta a rota para garantir resultados.",
      "Cria uma cultura de execução na equipe, equilibrando resultado, qualidade e sustentabilidade.",
    ],
  },
  {
    title: "Confiança para liderar",
    options: [
      "Depende da autoridade formal para mobilizar pessoas ou demonstrar segurança.",
      "Constrói confiança principalmente nas relações próximas, mas pode ter dificuldade em situações de conflito ou pressão.",
      "Estabelece relações baseadas em respeito, previsibilidade, diálogo e cumprimento de compromissos.",
      "Utiliza confiança para delegar, dar autonomia, enfrentar conversas difíceis e desenvolver pessoas.",
      "Cria um ambiente em que confiança e responsabilidade coexistem, reduzindo dependência da hierarquia.",
    ],
  },
  {
    title: "Comunicação e diálogo",
    options: [
      "Comunica predominantemente por orientação ou transmissão de informações. Pode não verificar entendimento.",
      "Comunica quando necessário, mas nem sempre cria espaço para diálogo ou escuta.",
      "Comunica prioridades com clareza, escuta a equipe e abre espaço para perguntas e contribuições.",
      "Adapta a comunicação às pessoas e situações, conduz conversas difíceis e promove diálogo aberto.",
      "Constrói uma cultura de diálogo, em que informação circula, conflitos são tratados e as pessoas se sentem ouvidas.",
    ],
  },
  {
    title: "Equilíbrio emocional",
    options: [
      "Reações emocionais interferem frequentemente na tomada de decisão e na relação com a equipe.",
      "Consegue recuperar o equilíbrio depois de situações difíceis, mas pode reagir impulsivamente sob pressão.",
      "Mantém postura profissional e capacidade de decisão mesmo diante de pressão ou frustração.",
      "Administra emoções próprias e influencia positivamente o clima da equipe em situações de tensão.",
      "Torna-se referência de estabilidade e maturidade emocional, ajudando a equipe a atravessar situações críticas.",
    ],
  },
  {
    title: "Respeito",
    options: [
      "Pode permitir que pressão, conflito ou diferenças de opinião afetem a forma como trata as pessoas.",
      "Demonstra respeito na rotina, mas pode ter dificuldade em situações de discordância ou cobrança.",
      "Mantém respeito mesmo ao cobrar, corrigir ou discordar.",
      "Estabelece relações baseadas em respeito, justiça e abertura para diferentes perspectivas.",
      "Cria um ambiente em que respeito é uma expectativa explícita e praticada por todos.",
    ],
  },
  {
    title: "Desenvolvimento do time",
    options: [
      "Concentra decisões e atividades em si e dedica pouca atenção ao desenvolvimento das pessoas.",
      "Desenvolve pessoas principalmente quando surgem necessidades ou problemas específicos.",
      "Dá feedback, delega, acompanha e cria oportunidades de desenvolvimento de maneira consistente.",
      "Conhece as necessidades individuais do time, desenvolve talentos e prepara pessoas para assumir responsabilidades maiores.",
      "Forma novos líderes, cria sucessores e estabelece uma cultura em que desenvolvimento é responsabilidade de todos.",
    ],
  },
  {
    title: "Pensamento estratégico",
    options: [
      "Atua predominantemente sobre demandas imediatas, com pouca conexão com objetivos futuros.",
      "Considera objetivos estratégicos quando direcionado, mas ainda concentra energia no curto prazo.",
      "Conecta prioridades e decisões da área aos objetivos estratégicos da organização.",
      "Antecipa cenários, identifica oportunidades e riscos e orienta a equipe para desafios futuros.",
      "Amplia o horizonte estratégico da organização e influencia decisões que geram impacto sustentável no longo prazo.",
    ],
  },
  {
    title: "Visão sistêmica",
    options: [
      "Analisa problemas predominantemente a partir da perspectiva da própria área.",
      "Considera outras áreas quando identifica impactos ou quando é provocado.",
      "Avalia consequências de suas decisões sobre outras áreas e stakeholders relevantes.",
      "Conecta diferentes perspectivas, identifica interdependências e constrói soluções integradas.",
      "Atua como articulador institucional, conectando áreas e interesses para produzir soluções sistêmicas e sustentáveis.",
    ],
  },
] as const satisfies readonly Dimension[];
