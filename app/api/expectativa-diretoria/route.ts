import { deliverExpectationEmail } from "../../lib/email";
import { normalizeExpectation, validateExpectationSubmission } from "../../lib/expectation";
import { generateReports, saveReportsLocally } from "../../lib/reports";
import { saveSubmission } from "../../lib/storage";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_REQUEST_BYTES = 100_000;

function positiveIntegerEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

const RATE_LIMIT_WINDOW_MS = positiveIntegerEnv("RATE_LIMIT_WINDOW_MINUTES", 15) * 60 * 1_000;
const RATE_LIMIT_MAX_REQUESTS = positiveIntegerEnv("RATE_LIMIT_MAX_REQUESTS", 30);

type RateLimitEntry = { count: number; expiresAt: number };

const globalRateLimit = globalThis as typeof globalThis & {
  expectationRateLimit?: Map<string, RateLimitEntry>;
};
const rateLimit = globalRateLimit.expectationRateLimit ?? new Map<string, RateLimitEntry>();
globalRateLimit.expectationRateLimit = rateLimit;

function json(body: object, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function getClientAddress(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

function consumeRateLimit(key: string) {
  const now = Date.now();

  if (rateLimit.size > 1_000) {
    for (const [storedKey, entry] of rateLimit) {
      if (entry.expiresAt <= now) rateLimit.delete(storedKey);
    }
  }

  const current = rateLimit.get(key);
  if (!current || current.expiresAt <= now) {
    rateLimit.set(key, { count: 1, expiresAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) return false;
  current.count += 1;
  return true;
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return json({ ok: false, message: "O conteúdo enviado excede o limite permitido." }, 413);
  }

  // Proteção contra envio de outra origem. Compara com o host que o navegador
  // realmente acessou: request.url é normalizado para localhost pelo Next e
  // não serve de referência. Atrás do proxy da Vercel o host público chega em
  // x-forwarded-host.
  const origin = request.headers.get("origin");
  if (origin) {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    try {
      if (!host || new URL(origin).host !== host) {
        return json({ ok: false, message: "Origem da solicitação não permitida." }, 403);
      }
    } catch {
      return json({ ok: false, message: "Origem da solicitação não permitida." }, 403);
    }
  }

  let payload: unknown;
  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > MAX_REQUEST_BYTES) {
      return json({ ok: false, message: "O conteúdo enviado excede o limite permitido." }, 413);
    }
    payload = JSON.parse(rawBody);
  } catch {
    return json({ ok: false, message: "Não foi possível interpretar os dados enviados." }, 400);
  }

  const validation = validateExpectationSubmission(payload);
  if (!validation.ok) return json({ ok: false, message: validation.message }, 400);

  if (validation.value.website) {
    return json({
      ok: true,
      emailSent: true,
      savedLocally: false,
    });
  }

  if (!consumeRateLimit(getClientAddress(request))) {
    return json({ ok: false, message: "Muitas tentativas de envio. Aguarde alguns minutos e tente novamente." }, 429);
  }

  const expectation = normalizeExpectation(validation.value);

  // O Blob é o registro definitivo da resposta: grava antes dos relatórios,
  // para que uma falha no PDF ou no e-mail não descarte a expectativa enviada.
  let storedPath: string | null = null;
  try {
    storedPath = await saveSubmission(expectation);
  } catch (error) {
    console.error("Falha ao gravar resposta no Blob", {
      submissionId: expectation.submissionId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    const reports = await generateReports(expectation);
    const localDirectory = await saveReportsLocally(reports);
    const delivery = await deliverExpectationEmail(expectation, reports);

    if (!storedPath && !delivery.sent && !localDirectory) {
      throw new Error("Nenhum destino de resposta está habilitado.");
    }

    return json({
      ok: true,
      stored: Boolean(storedPath),
      emailSent: delivery.sent,
      savedLocally: Boolean(localDirectory),
    });
  } catch (error) {
    console.error("Falha ao processar resposta da pesquisa", {
      submissionId: expectation.submissionId,
      stored: Boolean(storedPath),
      error: error instanceof Error ? error.message : String(error),
    });

    // A resposta já está registrada: confirmar o envio evita que o respondente
    // preencha tudo de novo por causa de uma falha de relatório ou de e-mail.
    if (storedPath) {
      return json({ ok: true, stored: true, emailSent: false, savedLocally: false });
    }

    return json(
      {
        ok: false,
        message: "Não foi possível registrar sua resposta. Tente novamente em alguns instantes.",
      },
      500,
    );
  }
}
