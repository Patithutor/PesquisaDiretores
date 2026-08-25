import * as XLSX from "xlsx";
import { dimensions, levels } from "../survey-data";
import { classifyAverage } from "./expectation";
import type { StoredSubmission } from "./storage";

function average(values: number[]) {
  if (values.length === 0) return null;
  return Math.round((values.reduce((total, value) => total + value, 0) / values.length) * 100) / 100;
}

function expectedLevelFor(submission: StoredSubmission, dimensionNumber: number) {
  return submission.answers.find((answer) => answer.dimension === dimensionNumber)?.expectedLevel ?? null;
}

function respondentLabel(submission: StoredSubmission) {
  return submission.respondentRole
    ? `${submission.respondentName} (${submission.respondentRole})`
    : submission.respondentName;
}

/**
 * Monta a planilha consolidada no formato da aba "Diretoria" da Régua de
 * Maturidade: uma linha por dimensão, uma coluna por respondente e o nível
 * esperado de consenso — a média das expectativas arredondada para a régua de
 * 1 a 5. A amplitude entre o menor e o maior nível mostra onde a Diretoria
 * ainda não convergiu e precisa fechar a validação.
 */
export function buildConsolidatedWorkbook(submissions: StoredSubmission[], generatedAt: Date): Buffer {
  const ordered = [...submissions].sort((a, b) =>
    a.respondentName.localeCompare(b.respondentName, "pt-BR"),
  );
  const workbook = XLSX.utils.book_new();

  const overallAverage = average(ordered.map((submission) => submission.average));
  const overview = XLSX.utils.aoa_to_sheet([
    ["EXPECTATIVA INSTITUCIONAL DA LIDERANÇA | SEBRAE / MT"],
    [],
    ["Exportado em", generatedAt],
    ["Respostas recebidas", ordered.length],
    ["Nível esperado médio", overallAverage],
    ["Classificação", overallAverage === null ? "Sem respostas" : classifyAverage(overallAverage)],
    [],
    ["Respondente", "Cargo", "Diretoria / instância", "Respondida em", "Nível esperado médio", "Classificação"],
    ...ordered.map((submission) => [
      submission.respondentName,
      submission.respondentRole || "Não informado",
      submission.directorate,
      new Date(submission.completedAt),
      submission.average,
      submission.classification,
    ]),
  ]);
  overview["!cols"] = [{ wch: 38 }, { wch: 34 }, { wch: 42 }, { wch: 20 }, { wch: 22 }, { wch: 18 }];
  overview["!merges"] = [XLSX.utils.decode_range("A1:F1")];
  if (overview.B3) overview.B3.z = "dd/mm/yyyy hh:mm";
  if (overview.B5) overview.B5.z = "0.00";
  for (let row = 9; row <= ordered.length + 8; row += 1) {
    if (overview[`D${row}`]) overview[`D${row}`].z = "dd/mm/yyyy hh:mm";
    if (overview[`E${row}`]) overview[`E${row}`].z = "0.00";
  }
  XLSX.utils.book_append_sheet(workbook, overview, "Resumo");

  // Layout da aba "Diretoria" da régua: dimensões nas linhas, expectativa de
  // cada respondente nas colunas e o nível esperado consolidado ao final.
  const respondentColumns = ordered.map(respondentLabel);
  const expectationRows = dimensions.map((dimension, index) => {
    const dimensionNumber = index + 1;
    const expected = ordered.map((submission) => expectedLevelFor(submission, dimensionNumber));
    const present = expected.filter((level): level is number => level !== null);
    const dimensionAverage = average(present);
    return [
      dimensionNumber,
      dimension.title,
      ...expected,
      dimensionAverage,
      dimensionAverage === null ? null : Math.round(dimensionAverage),
      dimensionAverage === null ? "" : levels[Math.round(dimensionAverage) - 1],
      present.length === 0 ? null : Math.min(...present),
      present.length === 0 ? null : Math.max(...present),
      present.length === 0 ? null : Math.max(...present) - Math.min(...present),
    ];
  });

  const expectation = XLSX.utils.aoa_to_sheet([
    ["EXPECTATIVA INSTITUCIONAL (DIRETORIA)"],
    ["Nível de maturidade esperado para a liderança do Sebrae/MT em cada dimensão."],
    [`Respondentes: ${ordered.length}`],
    [],
    [
      "Nº",
      "Dimensão",
      ...respondentColumns,
      "Média",
      "Nível esperado (1 a 5)",
      "Classificação",
      "Menor",
      "Maior",
      "Amplitude",
    ],
    ...expectationRows,
  ]);
  expectation["!cols"] = [
    { wch: 5 },
    { wch: 34 },
    ...respondentColumns.map(() => ({ wch: 18 })),
    { wch: 10 },
    { wch: 22 },
    { wch: 18 },
    { wch: 8 },
    { wch: 8 },
    { wch: 11 },
  ];
  const averageColumn = XLSX.utils.encode_col(2 + respondentColumns.length);
  for (let row = 6; row <= expectationRows.length + 5; row += 1) {
    const cell = expectation[`${averageColumn}${row}`];
    if (cell) cell.z = "0.00";
  }
  XLSX.utils.book_append_sheet(workbook, expectation, "Expectativa institucional");

  const answerRows = ordered.flatMap((submission) =>
    submission.answers.map((answer) => [
      submission.respondentName,
      submission.respondentRole || "Não informado",
      submission.directorate,
      submission.submissionId,
      new Date(submission.completedAt),
      answer.dimension,
      answer.title,
      answer.expectedLevel,
      answer.levelName,
      answer.expectedOption,
    ]),
  );
  const detail = XLSX.utils.aoa_to_sheet([
    [
      "Respondente",
      "Cargo",
      "Diretoria / instância",
      "ID da resposta",
      "Respondida em",
      "Nº",
      "Dimensão",
      "Nível esperado",
      "Classificação",
      "Descrição do nível esperado",
    ],
    ...answerRows,
  ]);
  detail["!cols"] = [
    { wch: 30 },
    { wch: 30 },
    { wch: 42 },
    { wch: 38 },
    { wch: 20 },
    { wch: 5 },
    { wch: 30 },
    { wch: 15 },
    { wch: 16 },
    { wch: 90 },
  ];
  detail["!autofilter"] = { ref: `A1:J${answerRows.length + 1}` };
  for (let row = 2; row <= answerRows.length + 1; row += 1) {
    if (detail[`E${row}`]) detail[`E${row}`].z = "dd/mm/yyyy hh:mm";
  }
  XLSX.utils.book_append_sheet(workbook, detail, "Respostas");

  const scaleSheet = XLSX.utils.aoa_to_sheet([
    ["Escala"],
    ...levels.map((level, index) => [index + 1, level]),
    [],
    ["Faixa", "Classificação"],
    ["1,00 a 1,79", "Inércia"],
    ["1,80 a 2,59", "Acreditar"],
    ["2,60 a 3,39", "Praticar"],
    ["3,40 a 4,19", "Melhorar"],
    ["4,20 a 5,00", "Compartilhar"],
  ]);
  scaleSheet["!cols"] = [{ wch: 16 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(workbook, scaleSheet, "Escala");

  workbook.Props = {
    Title: "Expectativa institucional da liderança - consolidado",
    Author: "Sebrae / MT",
    CreatedDate: generatedAt,
  };

  return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx", compression: true }));
}
