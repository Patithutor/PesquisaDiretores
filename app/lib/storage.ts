import "server-only";

import { get, list, put } from "@vercel/blob";
import type { NormalizedExpectation } from "./expectation";

const PREFIX = "expectativas/";

export type StoredAnswer = {
  dimension: number;
  title: string;
  expectedLevel: number;
  levelName: string;
  expectedOption: string;
};

export type StoredSubmission = {
  submissionId: string;
  leaderName: string;
  completedAt: string;
  average: number;
  classification: string;
  answers: StoredAnswer[];
};

export function isBlobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "sem-lider";
}

// Não guardamos IP, cabeçalhos nem qualquer identificação de quem respondeu:
// a tela promete anonimato, como na pesquisa de colaboradores.
function toStoredSubmission(expectation: NormalizedExpectation): StoredSubmission {
  return {
    submissionId: expectation.submissionId,
    leaderName: expectation.leaderName,
    completedAt: expectation.completedAt.toISOString(),
    average: expectation.result.average,
    classification: expectation.result.classification,
    answers: expectation.answers.map((answer) => ({
      dimension: answer.dimension,
      title: answer.title,
      expectedLevel: answer.expectedLevel,
      levelName: answer.levelName,
      expectedOption: answer.expectedOption,
    })),
  };
}

export async function saveSubmission(expectation: NormalizedExpectation) {
  if (!isBlobConfigured()) return null;

  const record = toStoredSubmission(expectation);
  const pathname = `${PREFIX}${slugify(expectation.leaderName)}/${record.completedAt}-${expectation.submissionId}.json`;

  const blob = await put(pathname, JSON.stringify(record, null, 2), {
    access: "private",
    contentType: "application/json",
    // O pathname já é único por submissionId; reenvios do mesmo formulário
    // sobrescrevem em vez de duplicar a resposta.
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  return blob.pathname;
}

export async function loadSubmissions(): Promise<StoredSubmission[]> {
  const pathnames: string[] = [];
  let cursor: string | undefined;

  do {
    const page = await list({ prefix: PREFIX, cursor, limit: 1_000 });
    pathnames.push(...page.blobs.map((blob) => blob.pathname));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  const submissions = await Promise.all(
    pathnames.map(async (pathname) => {
      const result = await get(pathname, { access: "private" });
      if (!result?.stream) return null;

      const text = await new Response(result.stream).text();
      try {
        return JSON.parse(text) as StoredSubmission;
      } catch {
        console.error("Resposta armazenada em formato inválido", { pathname });
        return null;
      }
    }),
  );

  return submissions
    .filter((submission): submission is StoredSubmission => submission !== null)
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt));
}
