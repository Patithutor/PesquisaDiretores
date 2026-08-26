import * as XLSX from "xlsx";
import { dimensions, levels } from "../survey-data";
import { classifyAverage } from "./assessment";
import type { StoredSubmission } from "./storage";

type LeaderGroup = {
  leaderName: string;
  submissions: StoredSubmission[];
};

function groupByLeader(submissions: StoredSubmission[]): LeaderGroup[] {
  const groups = new Map<string, LeaderGroup>();

  for (const submission of submissions) {
    const key = submission.leaderName.trim().toLocaleLowerCase("pt-BR");
    const group = groups.get(key);
    if (group) {
      group.submissions.push(submission);
    } else {
      groups.set(key, { leaderName: submission.leaderName.trim(), submissions: [submission] });
    }
  }

  return [...groups.values()].sort((a, b) => a.leaderName.localeCompare(b.leaderName, "pt-BR"));
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return Math.round((values.reduce((total, value) => total + value, 0) / values.length) * 100) / 100;
}

function scoreFor(submission: StoredSubmission, dimensionNumber: number) {
  return submission.answers.find((answer) => answer.dimension === dimensionNumber)?.score ?? null;
}

/**
 * Monta a planilha consolidada no formato da aba "Diretoria" da Régua de
 * Maturidade: uma aba por avaliado, com as dimensões nas linhas, a nota de
 * cada respondente nas colunas e o nível de consenso — a média arredondada
 * para a régua de 1 a 5. A amplitude entre a menor e a maior nota mostra onde
 * a Diretoria ainda não convergiu sobre aquela pessoa.
 */
export function buildConsolidatedWorkbook(submissions: StoredSubmission[], generatedAt: Date): Buffer {
  const groups = groupByLeader(submissions);
  const workbook = XLSX.utils.book_new();

  const overview = XLSX.utils.aoa_to_sheet([
    ["AVALIAÇÃO SOBRE AS LIDERANÇAS E ASSESSORES | SEBRAE / MT"],
    [],
    ["Exportado em", generatedAt],
    ["Avaliados", groups.length],
    ["Respostas recebidas", submissions.length],
    [],
    ["Avaliado", "Respondentes", "Dimensões", "Nota média", "Classificação"],
    ...groups.map((group) => {
      const groupAverage = average(group.submissions.map((submission) => submission.average));
      return [
        group.leaderName,
        group.submissions.length,
        Math.max(
          ...group.submissions.flatMap((submission) => submission.answers.map((answer) => answer.dimension)),
        ),
        groupAverage,
        groupAverage === null ? "Sem respostas" : classifyAverage(groupAverage),
      ];
    }),
  ]);
  overview["!cols"] = [{ wch: 38 }, { wch: 14 }, { wch: 12 }, { wch: 22 }, { wch: 20 }];
  overview["!merges"] = [XLSX.utils.decode_range("A1:E1")];
  if (overview.B3) overview.B3.z = "dd/mm/yyyy hh:mm";
  for (let row = 8; row <= groups.length + 7; row += 1) {
    if (overview[`D${row}`]) overview[`D${row}`].z = "0.00";
  }
  XLSX.utils.book_append_sheet(workbook, overview, "Resumo");

  // Uma aba por líder, no layout da aba "Diretoria" da régua.
  for (const group of groups) {
    const respondentColumns = group.submissions.map((_, index) => `R${index + 1}`);
    // Assessorias respondem uma versão reduzida da régua: a aba mostra só as
    // dimensões que foram efetivamente respondidas para aquele líder.
    const answeredDimensions = Math.max(
      ...group.submissions.flatMap((submission) => submission.answers.map((answer) => answer.dimension)),
    );
    const rows = dimensions.slice(0, answeredDimensions).map((dimension, index) => {
      const dimensionNumber = index + 1;
      const expected = group.submissions.map((submission) => scoreFor(submission, dimensionNumber));
      const present = expected.filter((level): level is number => level !== null);
      const dimensionAverage = average(present);
      return [
        dimensionNumber,
        dimension.title,
        ...expected,
        dimensionAverage,
        dimensionAverage === null ? null : Math.round(dimensionAverage),
        dimensionAverage === null ? "" : levels[Math.round(dimensionAverage) - 1],
        present.length === 0 ? null : Math.max(...present) - Math.min(...present),
      ];
    });

    const sheet = XLSX.utils.aoa_to_sheet([
      [`Avaliado: ${group.leaderName}`],
      [`Respondentes: ${group.submissions.length} (respostas anônimas)`],
      [
        answeredDimensions < dimensions.length
          ? `Nível de maturidade observado nas ${answeredDimensions} dimensões que se aplicam a esta pessoa.`
          : "Nível de maturidade observado em cada dimensão.",
      ],
      [],
      [
        "Nº",
        "Dimensão",
        ...respondentColumns,
        "Média",
        "Nível de consenso (1 a 5)",
        "Classificação",
        "Amplitude",
      ],
      ...rows,
    ]);
    sheet["!cols"] = [
      { wch: 5 },
      { wch: 34 },
      ...respondentColumns.map(() => ({ wch: 6 })),
      { wch: 10 },
      { wch: 22 },
      { wch: 18 },
      { wch: 11 },
    ];
    const averageColumn = XLSX.utils.encode_col(2 + respondentColumns.length);
    for (let row = 6; row <= rows.length + 5; row += 1) {
      const cell = sheet[`${averageColumn}${row}`];
      if (cell) cell.z = "0.00";
    }
    XLSX.utils.book_append_sheet(workbook, sheet, sheetNameFor(group.leaderName, workbook));
  }

  const answerRows = submissions.flatMap((submission) =>
    submission.answers.map((answer) => [
      submission.leaderName,
      submission.submissionId,
      new Date(submission.completedAt),
      answer.dimension,
      answer.title,
      answer.score,
      answer.level,
      answer.selectedOption,
      answer.comment || "",
    ]),
  );
  const detail = XLSX.utils.aoa_to_sheet([
    [
      "Avaliado",
      "ID da resposta",
      "Respondida em",
      "Nº",
      "Dimensão",
      "Nota",
      "Nível",
      "Resposta escolhida",
      "Comentário",
    ],
    ...answerRows,
  ]);
  detail["!cols"] = [
    { wch: 30 },
    { wch: 38 },
    { wch: 20 },
    { wch: 5 },
    { wch: 30 },
    { wch: 15 },
    { wch: 16 },
    { wch: 90 },
    { wch: 60 },
  ];
  detail["!autofilter"] = { ref: `A1:I${answerRows.length + 1}` };
  for (let row = 2; row <= answerRows.length + 1; row += 1) {
    if (detail[`C${row}`]) detail[`C${row}`].z = "dd/mm/yyyy hh:mm";
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
    Title: "Avaliação sobre as lideranças e assessores - consolidado",
    Author: "Sebrae / MT",
    CreatedDate: generatedAt,
  };

  return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx", compression: true }));
}

// Nomes de aba no Excel: até 31 caracteres, sem : \ / ? * [ ] e sem repetição.
function sheetNameFor(leaderName: string, workbook: XLSX.WorkBook) {
  const base = leaderName.replace(/[:\\/?*[\]]/g, " ").trim().slice(0, 31) || "Lider";
  if (!workbook.SheetNames.includes(base)) return base;

  for (let suffix = 2; suffix < 100; suffix += 1) {
    const candidate = `${base.slice(0, 31 - String(suffix).length - 1)} ${suffix}`;
    if (!workbook.SheetNames.includes(candidate)) return candidate;
  }

  return base.slice(0, 28) + String(Math.floor(workbook.SheetNames.length)).padStart(3, "0");
}
