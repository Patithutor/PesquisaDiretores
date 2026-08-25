import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, PDFPage, PDFFont, PageSizes, StandardFonts, rgb } from "pdf-lib";
import * as XLSX from "xlsx";
import { levels } from "../survey-data";
import type { NormalizedExpectation } from "./expectation";

const BRAND = {
  blue: rgb(42 / 255, 79 / 255, 218 / 255),
  atlantic: rgb(11 / 255, 37 / 255, 116 / 255),
  sky: rgb(101 / 255, 183 / 255, 251 / 255),
  offWhite: rgb(239 / 255, 243 / 255, 238 / 255),
  mint: rgb(159 / 255, 240 / 255, 189 / 255),
  canary: rgb(251 / 255, 236 / 255, 118 / 255),
  ink: rgb(17 / 255, 24 / 255, 39 / 255),
  muted: rgb(83 / 255, 97 / 255, 114 / 255),
  line: rgb(216 / 255, 223 / 255, 236 / 255),
  white: rgb(1, 1, 1),
};

export type ReportAttachment = {
  filename: string;
  content: Buffer;
  contentType: string;
};

export type GeneratedReports = {
  pdf: ReportAttachment;
  spreadsheet: ReportAttachment;
};

function normalizePdfText(value: string) {
  return value
    .replace(/[–—]/g, "-")
    .replace(/•/g, "-")
    .replace(/…/g, "...")
    .replace(/\u00a0/g, " ");
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "lider";
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Cuiaba",
  }).format(date);
}

function formatScore(value: number) {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const paragraphs = normalizePdfText(text).split(/\r?\n/);
  const lines: string[] = [];

  function splitWord(word: string) {
    if (font.widthOfTextAtSize(word, size) <= maxWidth) return [word];

    const chunks: string[] = [];
    let chunk = "";
    for (const character of word) {
      const candidate = `${chunk}${character}`;
      if (chunk && font.widthOfTextAtSize(candidate, size) > maxWidth) {
        chunks.push(chunk);
        chunk = character;
      } else {
        chunk = candidate;
      }
    }
    if (chunk) chunks.push(chunk);
    return chunks;
  }

  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean).flatMap(splitWord);
    if (words.length === 0) {
      lines.push("");
      continue;
    }

    let line = words[0];
    for (const word of words.slice(1)) {
      const candidate = `${line} ${word}`;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
      } else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }

  return lines;
}

function drawTextLines(
  page: PDFPage,
  lines: string[],
  options: { x: number; y: number; font: PDFFont; size: number; lineHeight: number; color: ReturnType<typeof rgb> },
) {
  lines.forEach((line, index) => {
    page.drawText(line, {
      x: options.x,
      y: options.y - index * options.lineHeight,
      font: options.font,
      size: options.size,
      color: options.color,
    });
  });
  return options.y - lines.length * options.lineHeight;
}

async function readLogoPath() {
  const svg = await readFile(path.join(process.cwd(), "public", "sebrae-logo.svg"), "utf8");
  const match = svg.match(/<path[^>]*\sd="([^"]+)"[^>]*fill="#2A4FDA"/i);
  return match?.[1] ?? null;
}

function drawBrandBars(page: PDFPage, width: number, height: number) {
  page.drawRectangle({ x: 0, y: height - 8, width: width * 0.64, height: 8, color: BRAND.blue });
  page.drawRectangle({ x: width * 0.64, y: height - 8, width: width * 0.18, height: 8, color: BRAND.sky });
  page.drawRectangle({ x: width * 0.82, y: height - 8, width: width * 0.18, height: 8, color: BRAND.mint });
}

function drawHeader(page: PDFPage, bold: PDFFont, logoPath: string | null, label: string) {
  const { width, height } = page.getSize();
  page.drawRectangle({ x: 0, y: 0, width, height, color: BRAND.offWhite });
  page.drawRectangle({ x: 0, y: height - 86, width, height: 86, color: BRAND.white });
  drawBrandBars(page, width, height);

  if (logoPath) {
    page.drawSvgPath(logoPath, { x: 42, y: height - 36, scale: 0.62, color: BRAND.blue });
  } else {
    page.drawText("sebrae", { x: 42, y: height - 54, size: 22, font: bold, color: BRAND.blue });
  }

  page.drawText("MT", { x: 99, y: height - 53, size: 7.5, font: bold, color: BRAND.atlantic });
  page.drawText(label, {
    x: width - 42 - bold.widthOfTextAtSize(label, 8.5),
    y: height - 51,
    size: 8.5,
    font: bold,
    color: BRAND.atlantic,
  });
}

function drawFooter(page: PDFPage, regular: PDFFont, pageNumber: number, pageCount: number) {
  const { width } = page.getSize();
  page.drawLine({ start: { x: 42, y: 34 }, end: { x: width - 42, y: 34 }, thickness: 0.7, color: BRAND.line });
  page.drawText("Instrumento de desenvolvimento | Sebrae / MT", {
    x: 42,
    y: 20,
    size: 7.5,
    font: regular,
    color: BRAND.muted,
  });
  const pageLabel = `${pageNumber} / ${pageCount}`;
  page.drawText(pageLabel, {
    x: width - 42 - regular.widthOfTextAtSize(pageLabel, 7.5),
    y: 20,
    size: 7.5,
    font: regular,
    color: BRAND.muted,
  });
}

export function generateSpreadsheetReport(expectation: NormalizedExpectation): Buffer {
  const answerRows = expectation.answers.map((answer) => [
    answer.dimension,
    answer.title,
    answer.expectedLevel,
    answer.levelName,
    answer.expectedOption,
    answer.comment || "Não informado",
  ]);

  const responses = XLSX.utils.aoa_to_sheet([
    ["Nº", "Dimensão", "Nível esperado", "Classificação", "Descrição do nível esperado", "Comentário"],
    ...answerRows,
  ]);
  responses["!cols"] = [{ wch: 6 }, { wch: 34 }, { wch: 15 }, { wch: 20 }, { wch: 92 }, { wch: 55 }];
  responses["!rows"] = [{ hpt: 24 }, ...expectation.answers.map(() => ({ hpt: 58 }))];
  responses["!autofilter"] = { ref: `A1:F${expectation.answers.length + 1}` };
  for (let row = 2; row <= expectation.answers.length + 1; row += 1) {
    responses[`C${row}`].z = "0";
  }

  const classificationFormula =
    'IF(B8<1.8,"Inércia",IF(B8<2.6,"Acreditar",IF(B8<3.4,"Praticar",IF(B8<4.2,"Melhorar","Compartilhar"))))';
  const summary = XLSX.utils.aoa_to_sheet([
    ["EXPECTATIVA DA DIRETORIA SOBRE A LIDERANÇA | SEBRAE / MT"],
    [],
    ["Avaliado", expectation.leaderName],
    ["Respondente", "Anônimo"],
    ["Respondida em", expectation.completedAt],
    [],
    ["EXPECTATIVA DECLARADA"],
    ["Nível esperado médio", expectation.result.average],
    ["Classificação", expectation.result.classification],
    [],
    ["Faixa", "Classificação"],
    ["1,00 a 1,79", "Inércia"],
    ["1,80 a 2,59", "Acreditar"],
    ["2,60 a 3,39", "Praticar"],
    ["3,40 a 4,19", "Melhorar"],
    ["4,20 a 5,00", "Compartilhar"],
  ]);
  summary["!merges"] = [XLSX.utils.decode_range("A1:D1"), XLSX.utils.decode_range("A7:D7")];
  summary["!cols"] = [{ wch: 24 }, { wch: 46 }, { wch: 18 }, { wch: 18 }];
  summary.B5.z = "dd/mm/yyyy hh:mm";
  summary.B8 = {
    t: "n",
    v: expectation.result.average,
    f: `ROUND(AVERAGE('Respostas'!C2:C${expectation.answers.length + 1}),2)`,
    z: "0.00",
  };
  summary.B9 = { t: "s", v: expectation.result.classification, f: classificationFormula };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, summary, "Resumo");
  XLSX.utils.book_append_sheet(workbook, responses, "Respostas");
  workbook.Props = {
    Title: "Expectativa da Diretoria sobre a liderança",
    Subject: `Expectativa definida para ${expectation.leaderName}`,
    Author: "Sebrae / MT",
    CreatedDate: expectation.completedAt,
  };
  workbook.Workbook = workbook.Workbook ?? {};
  (workbook.Workbook as { CalcPr?: { calcMode: string } }).CalcPr = { calcMode: "auto" };

  return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx", compression: true }));
}

export async function generatePdfReport(expectation: NormalizedExpectation): Promise<Buffer> {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const logoPath = await readLogoPath();
  const [pageWidth, pageHeight] = PageSizes.A4;

  const cover = document.addPage(PageSizes.A4);
  drawHeader(cover, bold, logoPath, "EXPECTATIVA DA DIRETORIA");

  cover.drawText("Régua de maturidade da liderança", { x: 42, y: 686, size: 10, font: bold, color: BRAND.blue });
  cover.drawText("Expectativa da Diretoria", { x: 42, y: 646, size: 28, font: bold, color: BRAND.ink });
  const introLines = wrapText(
    `Este relatório registra o nível de maturidade que a Diretoria espera deste líder nas ${expectation.answers.length} dimensões da régua que se aplicam a ele. É uma resposta anônima: consolide com as demais antes de qualquer devolutiva.`,
    regular,
    11,
    500,
  );
  drawTextLines(cover, introLines, { x: 42, y: 620, font: regular, size: 11, lineHeight: 16, color: BRAND.muted });

  cover.drawRectangle({ x: 42, y: 405, width: pageWidth - 84, height: 164, color: BRAND.atlantic });
  cover.drawRectangle({ x: 42, y: 557, width: pageWidth - 84, height: 12, color: BRAND.mint });
  cover.drawText("NÍVEL ESPERADO MÉDIO", { x: 68, y: 527, size: 9, font: bold, color: BRAND.mint });
  cover.drawText(formatScore(expectation.result.average), { x: 68, y: 464, size: 48, font: bold, color: BRAND.white });
  cover.drawText("CLASSIFICAÇÃO", { x: 300, y: 527, size: 9, font: bold, color: BRAND.sky });
  cover.drawText(expectation.result.classification, { x: 300, y: 486, size: 23, font: bold, color: BRAND.white });
  cover.drawText("Escala de maturidade: 1,00 a 5,00", { x: 300, y: 458, size: 9.5, font: regular, color: BRAND.white });

  const scaleLabels = [...levels];
  const scaleColors = [BRAND.line, BRAND.sky, BRAND.canary, BRAND.blue, BRAND.mint];
  const scaleY = 335;
  const segmentWidth = (pageWidth - 84 - 16) / 5;
  const activeIndex = scaleLabels.indexOf(expectation.result.classification);
  scaleLabels.forEach((label, index) => {
    const x = 42 + index * segmentWidth;
    cover.drawRectangle({
      x,
      y: scaleY,
      width: segmentWidth - 4,
      height: index === activeIndex ? 20 : 12,
      color: scaleColors[index],
      opacity: index === activeIndex ? 1 : 0.55,
    });
    const labelLines = wrapText(label, regular, 7.5, segmentWidth - 6);
    drawTextLines(cover, labelLines, {
      x,
      y: scaleY - 14,
      font: index === activeIndex ? bold : regular,
      size: 7.5,
      lineHeight: 9,
      color: index === activeIndex ? BRAND.atlantic : BRAND.muted,
    });
  });

  cover.drawText("Avaliado", { x: 42, y: 236, size: 8, font: bold, color: BRAND.blue });
  const leaderLines = wrapText(expectation.leaderName, bold, 12, 248).slice(0, 2);
  drawTextLines(cover, leaderLines, {
    x: 42,
    y: 216,
    size: 12,
    lineHeight: 14,
    font: bold,
    color: BRAND.ink,
  });
  drawTextLines(cover, ["Resposta anônima de um membro da Diretoria"], {
    x: 42,
    y: 184,
    size: 9.5,
    lineHeight: 12,
    font: regular,
    color: BRAND.muted,
  });
  cover.drawText("Respondida em", { x: 324, y: 236, size: 8, font: bold, color: BRAND.blue });
  cover.drawText(normalizePdfText(formatDate(expectation.completedAt)), {
    x: 324,
    y: 216,
    size: 9.5,
    font: regular,
    color: BRAND.ink,
  });

  let page = document.addPage(PageSizes.A4);
  drawHeader(page, bold, logoPath, "DETALHAMENTO DAS DIMENSÕES");
  let y = pageHeight - 116;
  let cardsOnPage = 0;

  for (const answer of expectation.answers) {
    const optionLines = wrapText(answer.expectedOption, regular, 9.2, pageWidth - 132);
    const commentLines = wrapText(answer.comment || "Não informado.", regular, 8.7, pageWidth - 132);
    const cardHeight = 83 + optionLines.length * 12 + commentLines.length * 11;

    if (y - cardHeight < 54 || cardsOnPage >= 4) {
      page = document.addPage(PageSizes.A4);
      drawHeader(page, bold, logoPath, "DETALHAMENTO DAS DIMENSÕES");
      y = pageHeight - 116;
      cardsOnPage = 0;
    }

    page.drawRectangle({ x: 42, y: y - cardHeight, width: pageWidth - 84, height: cardHeight, color: BRAND.white });
    page.drawRectangle({ x: 42, y: y - cardHeight, width: 5, height: cardHeight, color: BRAND.blue });
    page.drawRectangle({ x: 58, y: y - 35, width: 30, height: 25, color: BRAND.blue });
    const numberLabel = String(answer.dimension);
    page.drawText(numberLabel, {
      x: 73 - bold.widthOfTextAtSize(numberLabel, 9) / 2,
      y: y - 27,
      size: 9,
      font: bold,
      color: BRAND.white,
    });
    page.drawText(normalizePdfText(answer.title), { x: 100, y: y - 24, size: 12, font: bold, color: BRAND.ink });

    const levelLabel = `${answer.expectedLevel} | ${answer.levelName}`;
    const levelWidth = bold.widthOfTextAtSize(levelLabel, 8.2) + 18;
    page.drawRectangle({ x: pageWidth - 58 - levelWidth, y: y - 34, width: levelWidth, height: 24, color: BRAND.mint });
    page.drawText(levelLabel, {
      x: pageWidth - 49 - levelWidth,
      y: y - 27,
      size: 8.2,
      font: bold,
      color: BRAND.atlantic,
    });

    page.drawText("NÍVEL ESPERADO", { x: 58, y: y - 54, size: 7.2, font: bold, color: BRAND.blue });
    let contentY = drawTextLines(page, optionLines, {
      x: 58,
      y: y - 69,
      font: regular,
      size: 9.2,
      lineHeight: 12,
      color: BRAND.ink,
    });
    contentY -= 4;
    page.drawText("COMENTÁRIO", { x: 58, y: contentY, size: 7.2, font: bold, color: BRAND.blue });
    drawTextLines(page, commentLines, {
      x: 58,
      y: contentY - 14,
      font: regular,
      size: 8.7,
      lineHeight: 11,
      color: BRAND.muted,
    });

    y -= cardHeight + 12;
    cardsOnPage += 1;
  }

  const pages = document.getPages();
  pages.forEach((currentPage, index) => drawFooter(currentPage, regular, index + 1, pages.length));

  document.setTitle(`Expectativa da Diretoria - ${expectation.leaderName}`);
  document.setAuthor("Sebrae / MT");
  document.setSubject(
    `Nível esperado: ${expectation.result.classification} (${formatScore(expectation.result.average)})`,
  );
  document.setCreationDate(expectation.completedAt);

  return Buffer.from(await document.save());
}

export async function generateReports(expectation: NormalizedExpectation): Promise<GeneratedReports> {
  const baseName = `expectativa-diretoria-${slugify(expectation.leaderName)}-${expectation.submissionId.slice(0, 8)}`;
  const [pdfContent, spreadsheetContent] = await Promise.all([
    generatePdfReport(expectation),
    Promise.resolve(generateSpreadsheetReport(expectation)),
  ]);

  return {
    pdf: { filename: `${baseName}.pdf`, content: pdfContent, contentType: "application/pdf" },
    spreadsheet: {
      filename: `${baseName}.xlsx`,
      content: spreadsheetContent,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  };
}

export async function saveReportsLocally(reports: GeneratedReports) {
  if (process.env.SAVE_LOCAL_REPORTS !== "true") return null;

  const configuredDirectory = process.env.LOCAL_REPORTS_DIR?.trim() || ".tmp/reports";
  const outputDirectory = path.isAbsolute(configuredDirectory)
    ? configuredDirectory
    : path.resolve(process.cwd(), configuredDirectory);

  await mkdir(outputDirectory, { recursive: true });
  await Promise.all([
    writeFile(path.join(outputDirectory, reports.pdf.filename), reports.pdf.content),
    writeFile(path.join(outputDirectory, reports.spreadsheet.filename), reports.spreadsheet.content),
  ]);

  return outputDirectory;
}
