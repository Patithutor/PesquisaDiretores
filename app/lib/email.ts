import "server-only";

import nodemailer from "nodemailer";
import type { NormalizedExpectation } from "./expectation";
import type { GeneratedReports, ReportAttachment } from "./reports";

type EmailProvider = "smtp" | "resend";

type EmailSettings = {
  enabled: boolean;
  provider: EmailProvider;
  from: string;
  recipients: string[];
  subjectPrefix: string;
};

export type EmailDeliveryResult = {
  sent: boolean;
  provider: EmailProvider | "disabled";
  messageId?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`A variável de ambiente ${name} não foi configurada.`);
  return value;
}

function parseRecipients(value: string | undefined) {
  const recipients = (value ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (recipients.length === 0) {
    throw new Error("EMAIL_RECIPIENTS deve conter pelo menos um endereço.");
  }

  const invalid = recipients.find((email) => !EMAIL_PATTERN.test(email));
  if (invalid) throw new Error(`Destinatário inválido em EMAIL_RECIPIENTS: ${invalid}`);

  return [...new Set(recipients)];
}

function getEmailSettings(): EmailSettings {
  const enabled = process.env.EMAIL_SEND_ENABLED === "true";
  const rawProvider = (process.env.EMAIL_PROVIDER ?? "smtp").trim().toLowerCase();
  if (rawProvider !== "smtp" && rawProvider !== "resend") {
    throw new Error("EMAIL_PROVIDER deve ser smtp ou resend.");
  }

  if (!enabled) {
    return {
      enabled,
      provider: rawProvider,
      from: process.env.EMAIL_FROM?.trim() || "Sebrae / MT <no-reply@example.com>",
      recipients: [],
      subjectPrefix: process.env.EMAIL_SUBJECT_PREFIX?.trim() || "[Expectativa Diretoria Sebrae / MT]",
    };
  }

  return {
    enabled,
    provider: rawProvider,
    from: requiredEnv("EMAIL_FROM"),
    recipients: parseRecipients(process.env.EMAIL_RECIPIENTS),
    subjectPrefix: process.env.EMAIL_SUBJECT_PREFIX?.trim() || "[Expectativa Diretoria Sebrae / MT]",
  };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character];
  });
}

function buildMessage(expectation: NormalizedExpectation, settings: EmailSettings) {
  const score = expectation.result.average.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const safeLeaderName = escapeHtml(expectation.leaderName);
  const safeClassification = escapeHtml(expectation.result.classification);
  const subject = `${settings.subjectPrefix} ${expectation.leaderName} - ${score} (${expectation.result.classification})`;
  const text = [
    "Expectativa da Diretoria sobre a Liderança - Sebrae / MT",
    "",
    `Avaliado: ${expectation.leaderName}`,
    `Nível esperado médio nesta resposta: ${score}`,
    `Classificação: ${expectation.result.classification}`,
    "",
    "Resposta anônima de um membro da Diretoria. Consolide com as demais antes de qualquer devolutiva.",
    `O PDF e a planilha Excel com o detalhamento das ${expectation.answers.length} dimensões estão anexados.`,
  ].join("\n");
  const html = `
    <!doctype html>
    <html lang="pt-BR">
      <body style="margin:0;background:#eff3ee;font-family:Arial,sans-serif;color:#111827">
        <div style="max-width:640px;margin:0 auto;padding:28px 18px">
          <div style="height:8px;background:linear-gradient(90deg,#2a4fda 0 64%,#65b7fb 64% 82%,#9ff0bd 82%)"></div>
          <div style="background:#ffffff;padding:28px;border-radius:0 0 10px 10px">
            <p style="margin:0 0 8px;color:#2a4fda;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em">Sebrae / MT</p>
            <h1 style="margin:0 0 18px;color:#0b2574;font-size:24px;line-height:1.2">Nova expectativa da Diretoria</h1>
            <p style="margin:0 0 22px;color:#536172;line-height:1.6">Expectativa anônima recebida. Os relatórios completos foram gerados e seguem anexados em PDF e Excel.</p>
            <div style="background:#0b2574;color:#ffffff;padding:22px;border-radius:8px">
              <div style="font-size:12px;color:#9ff0bd;text-transform:uppercase;font-weight:700">Expectativa desta resposta</div>
              <div style="display:flex;gap:28px;align-items:flex-end;margin-top:10px">
                <div><div style="font-size:34px;font-weight:800">${score}</div><div style="font-size:12px;color:#dbe7ff">Nível esperado médio</div></div>
                <div><div style="font-size:20px;font-weight:800">${safeClassification}</div><div style="font-size:12px;color:#dbe7ff">Classificação</div></div>
              </div>
            </div>
            <table role="presentation" style="width:100%;margin-top:24px;border-collapse:collapse;font-size:14px">
              <tr><td style="padding:8px 0;color:#536172;width:120px">Avaliado</td><td style="padding:8px 0;font-weight:700">${safeLeaderName}</td></tr>
              <tr><td style="padding:8px 0;color:#536172">Respondente</td><td style="padding:8px 0">Anônimo</td></tr>
            </table>
            <p style="margin:22px 0 0;color:#536172;font-size:13px;line-height:1.6">Esta é a expectativa de uma pessoa: o nível esperado só se fecha depois de consolidar toda a Diretoria.</p>
          </div>
        </div>
      </body>
    </html>`;

  return { subject, text, html };
}

function toNodemailerAttachment(attachment: ReportAttachment) {
  return {
    filename: attachment.filename,
    content: attachment.content,
    contentType: attachment.contentType,
  };
}

async function sendWithSmtp(
  expectation: NormalizedExpectation,
  reports: GeneratedReports,
  settings: EmailSettings,
): Promise<EmailDeliveryResult> {
  const port = Number(requiredEnv("SMTP_PORT"));
  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    throw new Error("SMTP_PORT deve ser uma porta válida.");
  }

  const transporter = nodemailer.createTransport({
    host: requiredEnv("SMTP_HOST"),
    port,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: requiredEnv("SMTP_USER"),
      pass: requiredEnv("SMTP_PASS"),
    },
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  const message = buildMessage(expectation, settings);
  const result = await transporter.sendMail({
    messageId: `<${expectation.submissionId}@pesquisa-diretores.sebraemt.local>`,
    from: settings.from,
    to: settings.recipients,
    subject: message.subject,
    text: message.text,
    html: message.html,
    headers: { "X-Submission-ID": expectation.submissionId },
    attachments: [toNodemailerAttachment(reports.pdf), toNodemailerAttachment(reports.spreadsheet)],
  });

  return { sent: true, provider: "smtp", messageId: result.messageId };
}

async function sendWithResend(
  expectation: NormalizedExpectation,
  reports: GeneratedReports,
  settings: EmailSettings,
): Promise<EmailDeliveryResult> {
  const message = buildMessage(expectation, settings);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requiredEnv("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
      "Idempotency-Key": expectation.submissionId,
    },
    body: JSON.stringify({
      from: settings.from,
      to: settings.recipients,
      subject: message.subject,
      text: message.text,
      html: message.html,
      attachments: [reports.pdf, reports.spreadsheet].map((attachment) => ({
        filename: attachment.filename,
        content: attachment.content.toString("base64"),
      })),
    }),
  });

  const body = (await response.json().catch(() => null)) as { id?: string; message?: string } | null;
  if (!response.ok) {
    throw new Error(`Resend recusou o envio (${response.status}): ${body?.message ?? "erro não informado"}`);
  }

  return { sent: true, provider: "resend", messageId: body?.id };
}

export async function deliverExpectationEmail(
  expectation: NormalizedExpectation,
  reports: GeneratedReports,
): Promise<EmailDeliveryResult> {
  const settings = getEmailSettings();
  if (!settings.enabled) return { sent: false, provider: "disabled" };

  return settings.provider === "smtp"
    ? sendWithSmtp(expectation, reports, settings)
    : sendWithResend(expectation, reports, settings);
}
