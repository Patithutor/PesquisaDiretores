import { dimensions } from "./survey-data";

// Lista extraída do Lotacionograma simplificado do Sebrae/MT (05.08.2026),
// incluindo as assessorias. As áreas seguem a ordem do lotacionograma e os
// nomes vêm em ordem alfabética dentro de cada área.
// Atualize este arquivo quando o lotacionograma mudar.

export type Leader = {
  name: string;
  role: string;
  area: string;
  /** Assessorias não lideram equipe e respondem um questionário mais curto. */
  assessor?: boolean;
};

export type LeaderGroup = {
  area: string;
  leaders: readonly Leader[];
};

export const leaderGroups = [
  {
    area: "Conselho Deliberativo Estadual do Sebrae/MT – CDE",
    leaders: [
      { name: "Arley Carlos Silva", role: "Gerente de Auditoria Interna", area: "Conselho Deliberativo Estadual do Sebrae/MT – CDE" },
    ],
  },
  {
    area: "Superintendência",
    leaders: [
      { name: "Denise Pimpim Lima Silva Martins", role: "Gerente de Gestão da Excelência", area: "Superintendência" },
      { name: "Élen Gandolfo Marques Yabunaka", role: "Gerente de Eventos Institucionais", area: "Superintendência" },
      { name: "Lucimeire Dias Taques de Andrade", role: "Assessora", area: "Superintendência", assessor: true },
      { name: "Marcia Cruz Moreira", role: "Assessora Jurídica", area: "Superintendência", assessor: true },
      { name: "Marta Regina Torezam", role: "Gerente de Comunicação e Marketing", area: "Superintendência" },
      { name: "Ricardo Willian Santiago", role: "Gerente de Inteligência Estratégica", area: "Superintendência" },
      { name: "Suleima Metelo Coelho", role: "Gerente de Desenvolvimento de Seres Humanos", area: "Superintendência" },
    ],
  },
  {
    area: "Diretoria de Administração e Finanças",
    leaders: [
      { name: "Bruna Leticia Souza Prado", role: "Gerente Jurídico, Licitações e Contratos", area: "Diretoria de Administração e Finanças" },
      { name: "Camille Vieira de Oliveira Campos", role: "Gerente de Administração", area: "Diretoria de Administração e Finanças" },
      { name: "Charles Marques Padilha", role: "Gerente do Centro de Eventos do Pantanal", area: "Diretoria de Administração e Finanças" },
      { name: "Claudiney Benedito de Aquino", role: "Gerente de Contabilidade, Orçamento e Convênios", area: "Diretoria de Administração e Finanças" },
      { name: "Helber Figueiredo Serrou Barbosa", role: "Assessor", area: "Diretoria de Administração e Finanças", assessor: true },
      { name: "Mileno Nogueira Alencar", role: "Gerente de Finanças", area: "Diretoria de Administração e Finanças" },
      { name: "Nuccia Maria Gomes Almeida Santos", role: "Coordenadora da Gerência de Administração", area: "Diretoria de Administração e Finanças" },
      { name: "Vagner Duarte", role: "Gerente de Tecnologia da Informação", area: "Diretoria de Administração e Finanças" },
    ],
  },
  {
    area: "Diretoria Técnica",
    leaders: [
      { name: "Amanda Moura Walter", role: "Gerente da Escola de Negócios", area: "Diretoria Técnica" },
      { name: "Erika Dos Santos Silva", role: "Gerente de Competitividade", area: "Diretoria Técnica" },
      { name: "Fernando José de Holanda Neves Filho", role: "Gerente de Relacionamento", area: "Diretoria Técnica" },
      { name: "Leandro Silva Gonçalves", role: "Gerente de Inovação", area: "Diretoria Técnica" },
      { name: "Marisbeth Maria Gonçalves", role: "Assessora", area: "Diretoria Técnica", assessor: true },
      { name: "Patricia Pedrotti", role: "Gerente de Mercado", area: "Diretoria Técnica" },
      { name: "Sandro Rossi de Carvalho", role: "Gerente de Desenvolvimento Territorial", area: "Diretoria Técnica" },
      { name: "Tassia Gonçalves dos Santos", role: "Gerente do Centro Sebrae de Sustentabilidade", area: "Diretoria Técnica" },
    ],
  },
  {
    area: "Diretoria Executiva",
    leaders: [
      { name: "Adriano Bigotto Cabreira", role: "Coordenadora da Agência de Alta Floresta", area: "Diretoria Executiva" },
      { name: "Aline Ferreira Da Silva", role: "Coordenador da Agência de Sorriso", area: "Diretoria Executiva" },
      { name: "Carolina Pereira Rodrigues", role: "Coordenadora da Agência de Guarantã do Norte", area: "Diretoria Executiva" },
      { name: "Cirlene Barbosa Silva Espicaski", role: "Gerente da Regional Sudoeste", area: "Diretoria Executiva" },
      { name: "Douglas de Arruda Lindote", role: "Coordenador da Agência de Pontes e Lacerda", area: "Diretoria Executiva" },
      { name: "Guilherme Scheuermann", role: "Coordenador da Agência de Nova Mutum", area: "Diretoria Executiva" },
      { name: "Inajara Marques Amorim", role: "Coordenadora da Agência Cuiabá", area: "Diretoria Executiva" },
      { name: "Jaqueline da Silva Macedo", role: "Gerente da Regional Nordeste", area: "Diretoria Executiva" },
      { name: "João Batista Alves da Silva", role: "Coordenador da Agência de Barra do Garças", area: "Diretoria Executiva" },
      { name: "Julio Henrique Prior", role: "Gerente da Regional Metropolitana", area: "Diretoria Executiva" },
      { name: "Leandra de Lima Franco", role: "Coordenadora da Agência de Sinop", area: "Diretoria Executiva" },
      { name: "Leandro Costa Santos", role: "Coordenador da Agência de Água Boa", area: "Diretoria Executiva" },
      { name: "Lucas Barbosa Moreira", role: "Gerente da Regional Sudeste", area: "Diretoria Executiva" },
      { name: "Monia Kelly Ramos", role: "Coordenador da Agência de Primavera do Leste", area: "Diretoria Executiva" },
      { name: "Rafael Calazans Rubim", role: "Coordenadora da Agência de Juína", area: "Diretoria Executiva" },
      { name: "Renato Ícaro Pereira de Magalhães", role: "Coordenador da Agência de Lucas do Rio Verde", area: "Diretoria Executiva" },
      { name: "Silvia Fraga de Souza", role: "Coordenadora da Agência de Tangará da Serra", area: "Diretoria Executiva" },
      { name: "Venycius Gusthavon Barreto Verssali", role: "Coordenador da Agência de Cáceres", area: "Diretoria Executiva" },
      { name: "Volmir José Contreira", role: "Gerente da Regional Norte", area: "Diretoria Executiva" },
      { name: "Wlademir Alves da Silva", role: "Gerente da Regional Noroeste", area: "Diretoria Executiva" },
    ],
  },
] as const satisfies readonly LeaderGroup[];

export const leaders: readonly Leader[] = leaderGroups.flatMap((group): Leader[] => [...group.leaders]);

const leaderNames = new Set<string>(leaders.map((leader) => leader.name));

export function isKnownLeader(name: string) {
  return leaderNames.has(name);
}

export function findLeader(name: string): Leader | null {
  return leaders.find((leader) => leader.name === name) ?? null;
}

/** Última dimensão respondida por uma assessoria. */
export const ASSESSOR_LAST_DIMENSION = "Compromisso com resultados";

export function isAssessorLeader(name: string) {
  return findLeader(name)?.assessor === true;
}

/**
 * Quantas dimensões o questionário mostra para este líder. As assessorias não
 * lideram equipe: param em "Compromisso com resultados", antes das dimensões
 * de liderança de pessoas. A busca é pelo título, e não pela posição, para que
 * a regra continue na dimensão certa se a ordem da régua mudar; sem o título
 * na régua, o questionário fica inteiro em vez de encurtar no lugar errado.
 */
export function dimensionCountFor(name: string) {
  if (!isAssessorLeader(name)) return dimensions.length;

  const lastIndex = dimensions.findIndex((dimension) => dimension.title === ASSESSOR_LAST_DIMENSION);
  return lastIndex >= 0 ? lastIndex + 1 : dimensions.length;
}

/** Remove acentos e caixa para que a busca encontre "Erika" digitando "erika". */
export function normalizeForSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Casa quando todos os termos digitados aparecem no nome, no cargo ou na área. */
export function matchesLeader(leader: Leader, query: string) {
  const terms = normalizeForSearch(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;

  const haystack = normalizeForSearch(`${leader.name} ${leader.role} ${leader.area}`);
  return terms.every((term) => haystack.includes(term));
}
