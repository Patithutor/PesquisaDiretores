// Instâncias de direção do Sebrae/MT, na ordem do Lotacionograma simplificado
// (05.08.2026) — a mesma ordem em que a PesquisaColaboradores agrupa os líderes
// por unidade organizacional. Quem responde a expectativa institucional indica a
// qual delas pertence. Atualize esta lista quando a estrutura mudar.

export const directorates = [
  "Conselho Deliberativo Estadual do Sebrae/MT – CDE",
  "Superintendência",
  "Diretoria de Administração e Finanças",
  "Diretoria Técnica",
  "Diretoria Executiva",
] as const;

export type Directorate = (typeof directorates)[number];

export function isKnownDirectorate(value: string): value is Directorate {
  return directorates.some((directorate) => directorate === value);
}
