import { dimensions, levels } from "../survey-data";
import { isKnownDirectorate } from "../directorates";

export const RESPONDENT_NAME_MAX_LENGTH = 120;
export const RESPONDENT_ROLE_MAX_LENGTH = 120;

export type ExpectationAnswerInput = {
  dimension: number;
  /** Nível de maturidade esperado, de 1 a 5. */
  expectedLevel: number;
};

export type ExpectationSubmissionInput = {
  submissionId?: string;
  respondentName: string;
  respondentRole: string;
  directorate: string;
  website?: string;
  answers: ExpectationAnswerInput[];
};

export type ExpectationResult = {
  average: number;
  classification: (typeof levels)[number];
};

export type NormalizedExpectation = {
  submissionId: string;
  respondentName: string;
  respondentRole: string;
  directorate: string;
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
  const respondentName = typeof input.respondentName === "string" ? input.respondentName.trim() : "";
  const respondentRole = typeof input.respondentRole === "string" ? input.respondentRole.trim() : "";
  const directorate = typeof input.directorate === "string" ? input.directorate.trim() : "";
  const website = typeof input.website === "string" ? input.website.trim() : "";
  const submissionId = typeof input.submissionId === "string" ? input.submissionId.trim() : undefined;

  // A expectativa institucional é uma posição assumida, não uma percepção
  // anônima: sem saber quem respondeu não há como validar nem fechar o
  // consenso da Diretoria depois.
  if (respondentName.length < 3 || respondentName.length > RESPONDENT_NAME_MAX_LENGTH) {
    return { ok: false, message: "Informe o seu nome completo." };
  }

  if (respondentRole.length > RESPONDENT_ROLE_MAX_LENGTH) {
    return { ok: false, message: `O cargo deve ter no máximo ${RESPONDENT_ROLE_MAX_LENGTH} caracteres.` };
  }

  if (!isKnownDirectorate(directorate)) {
    return { ok: false, message: "Selecione a sua diretoria ou instância na lista." };
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
      respondentName,
      respondentRole,
      directorate,
      website,
      answers: normalizedAnswers,
    },
  };
}

export function normalizeExpectation(input: ExpectationSubmissionInput): NormalizedExpectation {
  const result = calculateExpectationResult(input.answers.map((answer) => answer.expectedLevel));

  return {
    submissionId: input.submissionId ?? crypto.randomUUID(),
    respondentName: input.respondentName,
    respondentRole: input.respondentRole,
    directorate: input.directorate,
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
