import { timingSafeEqual } from "node:crypto";
import { buildConsolidatedWorkbook } from "../../lib/consolidation";
import { isBlobConfigured, loadSubmissions } from "../../lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function json(body: object, status: number) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function matchesExportToken(provided: string, expected: string) {
  const providedBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(expected);
  // timingSafeEqual exige buffers do mesmo tamanho.
  if (providedBytes.length !== expectedBytes.length) return false;
  return timingSafeEqual(providedBytes, expectedBytes);
}

// Abre a rota sem token. Precisa ser ligado explicitamente: qualquer outro
// valor (ou a variável ausente) mantém a exigência do EXPORT_TOKEN.
function isOpenAccessEnabled() {
  return process.env.EXPORT_PUBLIC?.trim().toLowerCase() === "true";
}

function isAuthorized(request: Request) {
  const expected = process.env.EXPORT_TOKEN?.trim();
  // Sem token configurado a rota permanece fechada: nunca cai em modo aberto
  // por descuido — abrir exige EXPORT_PUBLIC=true.
  if (!expected) return false;

  const header = request.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const query = new URL(request.url).searchParams.get("token")?.trim() ?? "";
  const provided = bearer || query;

  return Boolean(provided) && matchesExportToken(provided, expected);
}

export async function GET(request: Request) {
  const openAccess = isOpenAccessEnabled();

  if (openAccess) {
    console.warn(
      "Exportação de respostas servida SEM autenticação (EXPORT_PUBLIC=true). " +
        "Qualquer pessoa com a URL baixa todas as respostas.",
    );
  } else {
    if (!process.env.EXPORT_TOKEN?.trim()) {
      return json({ ok: false, message: "A exportação não está configurada." }, 503);
    }

    if (!isAuthorized(request)) {
      return json({ ok: false, message: "Não autorizado." }, 401);
    }
  }

  if (!isBlobConfigured()) {
    return json({ ok: false, message: "O armazenamento de respostas não está configurado." }, 503);
  }

  try {
    const submissions = await loadSubmissions();
    if (submissions.length === 0) {
      return json({ ok: false, message: "Nenhuma resposta registrada até o momento." }, 404);
    }

    const generatedAt = new Date();
    const workbook = buildConsolidatedWorkbook(submissions, generatedAt);
    const filename = `expectativa-institucional-consolidado-${generatedAt.toISOString().slice(0, 10)}.xlsx`;

    return new Response(new Uint8Array(workbook), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch (error) {
    console.error("Falha ao exportar respostas", {
      error: error instanceof Error ? error.message : String(error),
    });
    return json({ ok: false, message: "Não foi possível gerar a exportação." }, 500);
  }
}
