import { dimensions, levels } from "../survey-data";
import { dimensionCountFor, isKnownLeader } from "../leaders";

export const COMMENT_MAX_LENGTH = 2_000;

export type AssessmentAnswerInput = {
  dimension: number;
  /** Nível de maturidade observado, de 1 a 5. */
  score: number;
  /** Exemplo opcional que ilustra a resposta. */
  comment: string;
};

export type AssessmentSubmissionInput = {
  submissionId?: string;
  leaderName: string;
  website?: string;
  answers: AssessmentAnswerInput[];
};

export type AssessmentResult = {
  average: number;
  classification: (typeof levels)[number];
};

export type NormalizedAssessment = {
  submissionId: string;
  leaderName: string;
  completedAt: Date;
  answers: Array<
    AssessmentAnswerInput & {
      title: string;
      level: (typeof levels)[number];
      selectedOption: string;
    }
  >;
  result: AssessmentResult;
};

type ValidationResult =
  | { ok: true; value: AssessmentSubmissionInput }
  | { ok: false; message: string };

const SUBMISSION_ID_PATTERN = /^[a-zA-Z0-9_-]{8,80}$/;

export function classifyAverage(average: number): AssessmentResult["classification"] {
  if (average < 1.8) return "Inércia";
  if (average < 2.6) return "Acreditar";
  if (average < 3.4) return "Praticar";
  if (average < 4.2) return "Melhorar";
  return "Compartilhar";
}

export function calculateAssessmentResult(scores: number[]): AssessmentResult {
  // O número de dimensões varia com o avaliado: assessorias respondem uma
  // versão reduzida do questionário.
  if (scores.length === 0) {
    throw new Error("É preciso ao menos uma nota para calcular o resultado.");
  }

  const average =
    Math.round((scores.reduce((total, level) => total + level, 0) / scores.length) * 100) / 100;
  return { average, classification: classifyAverage(average) };
}

export function validateAssessmentSubmission(payload: unknown): ValidationResult {
  if (!payload || typeof payload !== "object") {
    return { ok: false, message: "Dados da pesquisa inválidos." };
  }

  const input = payload as Partial<AssessmentSubmissionInput>;
  const leaderName = typeof input.leaderName === "string" ? input.leaderName.trim() : "";
  const website = typeof input.website === "string" ? input.website.trim() : "";
  const submissionId = typeof input.submissionId === "string" ? input.submissionId.trim() : undefined;

  // O avaliado precisa estar no lotacionograma: é o que garante que as
  // respostas sobre uma mesma pessoa sejam consolidadas juntas, sem variações
  // de grafia.
  if (!isKnownLeader(leaderName)) {
    return { ok: false, message: "Selecione um avaliado da lista." };
  }

  if (submissionId && !SUBMISSION_ID_PATTERN.test(submissionId)) {
    return { ok: false, message: "Identificador de envio inválido." };
  }

  // As assessorias respondem só até "Compromisso com resultados": o total
  // esperado depende de quem foi escolhido no campo do avaliado.
  const expectedCount = dimensionCountFor(leaderName);

  if (!Array.isArray(input.answers) || input.answers.length !== expectedCount) {
    return {
      ok: false,
      message: `A pesquisa deve conter exatamente ${expectedCount} respostas de dimensões.`,
    };
  }

  const normalizedAnswers: AssessmentAnswerInput[] = [];
  const seenDimensions = new Set<number>();

  for (const rawAnswer of input.answers) {
    if (!rawAnswer || typeof rawAnswer !== "object") {
      return { ok: false, message: "Uma das respostas está em formato inválido." };
    }

    const answer = rawAnswer as Partial<AssessmentAnswerInput>;
    const dimension = Number(answer.dimension);
    const score = Number(answer.score);
    const comment = typeof answer.comment === "string" ? answer.comment.trim() : "";

    if (!Number.isInteger(dimension) || dimension < 1 || dimension > expectedCount) {
      return { ok: false, message: "Uma das dimensões informadas é inválida." };
    }

    if (seenDimensions.has(dimension)) {
      return { ok: false, message: "A pesquisa contém uma dimensão duplicada." };
    }

    if (!Number.isInteger(score) || score < 1 || score > 5) {
      return { ok: false, message: `A nota da dimensão ${dimension} deve estar entre 1 e 5.` };
    }

    if (comment.length > COMMENT_MAX_LENGTH) {
      return {
        ok: false,
        message: `O comentário da dimensão ${dimension} excede ${COMMENT_MAX_LENGTH.toLocaleString("pt-BR")} caracteres.`,
      };
    }

    seenDimensions.add(dimension);
    normalizedAnswers.push({ dimension, score, comment });
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

export function normalizeAssessment(input: AssessmentSubmissionInput): NormalizedAssessment {
  const result = calculateAssessmentResult(input.answers.map((answer) => answer.score));

  return {
    submissionId: input.submissionId ?? crypto.randomUUID(),
    leaderName: input.leaderName,
    completedAt: new Date(),
    answers: input.answers.map((answer) => {
      const dimension = dimensions[answer.dimension - 1];
      return {
        ...answer,
        title: dimension.title,
        level: levels[answer.score - 1],
        selectedOption: dimension.options[answer.score - 1],
      };
    }),
    result,
  };
}
