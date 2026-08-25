// Instâncias de direção do Sebrae/MT, conforme as áreas do Lotacionograma
// simplificado (05.08.2026). Quem responde a expectativa institucional indica a
// qual delas pertence. Atualize esta lista quando a estrutura mudar.

export const directorates = [
  "Conselho Deliberativo Estadual do Sebrae/MT – CDE",
  "Superintendência",
  "Diretoria Executiva",
  "Diretoria Técnica",
  "Diretoria de Administração e Finanças",
] as const;

export type Directorate = (typeof directorates)[number];

export function isKnownDirectorate(value: string): value is Directorate {
  return directorates.some((directorate) => directorate === value);
}
