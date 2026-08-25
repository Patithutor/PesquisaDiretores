import { dimensions, levels } from "../survey-data";
import { isKnownLeader } from "../leaders";

export type ExpectationAnswerInput = {
  dimension: number;
  /** Nível de maturidade esperado, de 1 a 5. */
  expectedLevel: number;
};

export type ExpectationSubmissionInput = {
  submissionId?: string;
  leaderName: string;
  website?: string;
  answers: ExpectationAnswerInput[];
};

export type ExpectationResult = {
  average: number;
  classification: (typeof levels)[number];
};

export type NormalizedExpectation = {
  submissionId: string;
  leaderName: string;
  completedAt: Date;
  answers: Array<
    ExpectationAnswerInput & {
      title: string;
      levelName: (typeof levels)[number];
      expectedOption: string;
    }
  >;
  result: ExpectationResult;
};

type ValidationResult =
  | { ok: true; value: ExpectationSubmissionInput }
  | { ok: false; message: string };

const SUBMISSION_ID_PATTERN = /^[a-zA-Z0-9_-]{8,80}$/;

export function classifyAverage(average: number): ExpectationResult["classification"] {
  if (average < 1.8) return "Inércia";
  if (average < 2.6) return "Acreditar";
  if (average < 3.4) return "Praticar";
  if (average < 4.2) return "Melhorar";
  return "Compartilhar";
}

export function calculateExpectationResult(expectedLevels: number[]): ExpectationResult {
  if (expectedLevels.length !== dimensions.length) {
    throw new Error(`São necessários ${dimensions.length} níveis esperados para calcular o resultado.`);
  }

  const average =
    Math.round((expectedLevels.reduce((total, level) => total + level, 0) / expectedLevels.length) * 100) / 100;
  return { average, classification: classifyAverage(average) };
}

export function validateExpectationSubmission(payload: unknown): ValidationResult {
  if (!payload || typeof payload !== "object") {
    return { ok: false, message: "Dados da pesquisa inválidos." };
  }

  const input = payload as Partial<ExpectationSubmissionInput>;
  const leaderName = typeof input.leaderName === "string" ? input.leaderName.trim() : "";
  const website = typeof input.website === "string" ? input.website.trim() : "";
  const submissionId = typeof input.submissionId === "string" ? input.submissionId.trim() : undefined;

  // O líder precisa estar no lotacionograma: é o que garante que as
  // expectativas definidas para um mesmo gestor sejam consolidadas juntas,
  // sem variações de grafia.
  if (!isKnownLeader(leaderName)) {
    return { ok: false, message: "Selecione um líder da lista." };
  }

  if (submissionId && !SUBMISSION_ID_PATTERN.test(submissionId)) {
    return { ok: false, message: "Identificador de envio inválido." };
  }

  if (!Array.isArray(input.answers) || input.answers.length !== dimensions.length) {
    return {
      ok: false,
      message: `A pesquisa deve conter exatamente ${dimensions.length} níveis esperados.`,
    };
  }

  const normalizedAnswers: ExpectationAnswerInput[] = [];
  const seenDimensions = new Set<number>();

  for (const rawAnswer of input.answers) {
    if (!rawAnswer || typeof rawAnswer !== "object") {
      return { ok: false, message: "Uma das respostas está em formato inválido." };
    }

    const answer = rawAnswer as Partial<ExpectationAnswerInput>;
    const dimension = Number(answer.dimension);
    const expectedLevel = Number(answer.expectedLevel);

    if (!Number.isInteger(dimension) || dimension < 1 || dimension > dimensions.length) {
      return { ok: false, message: "Uma das dimensões informadas é inválida." };
    }

    if (seenDimensions.has(dimension)) {
      return { ok: false, message: "A pesquisa contém uma dimensão duplicada." };
    }

    if (!Number.isInteger(expectedLevel) || expectedLevel < 1 || expectedLevel > 5) {
      return { ok: false, message: `O nível esperado da dimensão ${dimension} deve estar entre 1 e 5.` };
    }

    seenDimensions.add(dimension);
    normalizedAnswers.push({ dimension, expectedLevel });
  }

  normalizedAnswers.sort((a, b) => a.dimension - b.dimension);

  return {
    ok: true,
    value: {
      submissionId,
      leaderName,
      website,
      answers: normalizedAnswers,
    },
  };
}

export function normalizeExpectation(input: ExpectationSubmissionInput): NormalizedExpectation {
  const result = calculateExpectationResult(input.answers.map((answer) => answer.expectedLevel));

  return {
    submissionId: input.submissionId ?? crypto.randomUUID(),
    leaderName: input.leaderName,
    completedAt: new Date(),
    answers: input.answers.map((answer) => {
      const dimension = dimensions[answer.dimension - 1];
      return {
        ...answer,
        title: dimension.title,
        levelName: levels[answer.expectedLevel - 1],
        expectedOption: dimension.options[answer.expectedLevel - 1],
      };
    }),
    result,
  };
}
