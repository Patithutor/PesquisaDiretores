"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { dimensions, levels } from "./survey-data";
import { directorates, isKnownDirectorate } from "./directorates";

const STORAGE_KEY = "sebraeExpectativaDiretoria";
const REVIEW_STEP = dimensions.length + 1;
const DONE_STEP = REVIEW_STEP + 1;
const PROGRESS_STEPS = REVIEW_STEP + 1;
const NAME_MAX_LENGTH = 120;
const ROLE_MAX_LENGTH = 120;

type Identity = {
  respondentName: string;
  respondentRole: string;
  directorate: string;
};

/** Nível esperado (1 a 5) escolhido em cada dimensão, indexado pelo número da dimensão. */
type Expectations = Record<string, number>;

type SavedDraft = Identity & {
  expectations: Expectations;
};

type SubmissionResponse = {
  ok: boolean;
  message?: string;
  stored?: boolean;
  emailSent?: boolean;
  savedLocally?: boolean;
};

const EMPTY_IDENTITY: Identity = { respondentName: "", respondentRole: "", directorate: "" };

function readSavedDraft(): SavedDraft | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;

    const parsed = JSON.parse(saved);
    if (typeof parsed?.respondentName !== "string") return null;

    return {
      respondentName: parsed.respondentName.slice(0, NAME_MAX_LENGTH),
      respondentRole: typeof parsed.respondentRole === "string" ? parsed.respondentRole.slice(0, ROLE_MAX_LENGTH) : "",
      // Uma instância que saiu da estrutura não seleciona mais nada no campo:
      // melhor limpar do que deixar o rascunho travar no envio.
      directorate: isKnownDirectorate(parsed.directorate) ? parsed.directorate : "",
      expectations: parsed.expectations ?? {},
    };
  } catch {
    return null;
  }
}

export default function ExpectationPage() {
  const [current, setCurrent] = useState(0);
  const [identity, setIdentity] = useState<Identity>(EMPTY_IDENTITY);
  const [expectations, setExpectations] = useState<Expectations>({});
  const [identityError, setIdentityError] = useState("");
  const [answerError, setAnswerError] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submission, setSubmission] = useState<SubmissionResponse | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const websiteRef = useRef<HTMLInputElement>(null);
  const submissionIdRef = useRef<string | null>(null);

  useEffect(() => {
    const draft = readSavedDraft();
    if (draft) {
      const { expectations: savedExpectations, ...savedIdentity } = draft;
      setIdentity(savedIdentity);
      setExpectations(savedExpectations);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...identity, expectations }));
  }, [expectations, hydrated, identity]);

  const progressLabel =
    current === 0
      ? "Início"
      : current === REVIEW_STEP
        ? "Revisão"
        : `Dimensão ${current} de ${dimensions.length}`;
  const progressPercent = ((Math.min(current, REVIEW_STEP) + 1) / PROGRESS_STEPS) * 100;
  const activeDimension = current >= 1 && current <= dimensions.length ? dimensions[current - 1] : null;

  const completedAnswers = useMemo(
    () => dimensions.filter((_, index) => expectations[String(index + 1)]).length,
    [expectations],
  );

  function goTo(step: number) {
    setCurrent(step);
    setIdentityError("");
    setAnswerError(false);
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      panelRef.current?.focus({ preventScroll: true });
    });
  }

  function updateIdentity(patch: Partial<Identity>) {
    submissionIdRef.current = null;
    setSubmitError("");
    setIdentityError("");
    setIdentity((previous) => ({ ...previous, ...patch }));
  }

  function continueSurvey() {
    if (current === 0) {
      if (identity.respondentName.trim().length < 3) {
        setIdentityError("Informe o seu nome completo para continuar.");
        return;
      }
      if (!isKnownDirectorate(identity.directorate)) {
        setIdentityError("Selecione a sua diretoria ou instância para continuar.");
        return;
      }
    }

    if (current >= 1 && current <= dimensions.length && !expectations[String(current)]) {
      setAnswerError(true);
      return;
    }

    goTo(current + 1);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (current !== REVIEW_STEP || submitting) return;

    setSubmitting(true);
    setSubmitError("");
    submissionIdRef.current ??= crypto.randomUUID();

    try {
      const response = await fetch("/api/expectativa-diretoria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: submissionIdRef.current,
          respondentName: identity.respondentName.trim(),
          respondentRole: identity.respondentRole.trim(),
          directorate: identity.directorate,
          website: websiteRef.current?.value ?? "",
          answers: dimensions.map((_, index) => ({
            dimension: index + 1,
            expectedLevel: expectations[String(index + 1)],
          })),
        }),
      });
      const result = (await response.json().catch(() => ({
        ok: false,
        message: "Não foi possível interpretar a resposta do servidor.",
      }))) as SubmissionResponse;

      if (!response.ok || !result.ok) {
        throw new Error(result.message || "Não foi possível enviar a pesquisa.");
      }

      setSubmission(result);
      localStorage.removeItem(STORAGE_KEY);
      goTo(DONE_STEP);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Não foi possível enviar a pesquisa.");
    } finally {
      setSubmitting(false);
    }
  }

  function setExpectedLevel(expectedLevel: number) {
    submissionIdRef.current = null;
    setSubmitError("");
    setExpectations((previous) => ({ ...previous, [String(current)]: expectedLevel }));
    setAnswerError(false);
  }

  return (
    <main className="page-frame">
      <div className="brand-grid" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className="shell">
        <header className="topbar">
          <div className="brand">
            <a className="brand-logo" href="https://sebrae.com.br/mt" aria-label="Sebrae / MT">
              <Image src="/sebrae-logo.svg" alt="Sebrae" width={75} height={40} priority />
              <span className="brand-state">MT</span>
            </a>
            <div className="brand-product">
              <b>Expectativa Institucional da Liderança</b>
              <span>Régua de maturidade da liderança</span>
            </div>
          </div>
          <div className="save-state">
            <span className="save-dot" aria-hidden="true" />
            Rascunho salvo neste dispositivo
          </div>
        </header>

        {current !== DONE_STEP && (
          <div className="progress-wrap">
            <div className="progress-meta">
              <div>
                <span className="progress-kicker">Seu progresso</span>
                <span>{progressLabel}</span>
              </div>
              <span>
                Etapa {Math.min(current + 1, PROGRESS_STEPS)} de {PROGRESS_STEPS}
              </span>
            </div>
            <div
              className="track"
              role="progressbar"
              aria-label="Progresso"
              aria-valuemin={1}
              aria-valuemax={PROGRESS_STEPS}
              aria-valuenow={Math.min(current + 1, PROGRESS_STEPS)}
            >
              <div className="bar" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        )}

        <form className="panel" onSubmit={handleSubmit} noValidate>
          <div className="panel-accent" aria-hidden="true" />
          <div className="bot-field" aria-hidden="true">
            <label htmlFor="website">Website</label>
            <input id="website" ref={websiteRef} name="website" tabIndex={-1} autoComplete="off" />
          </div>
          <div ref={panelRef} tabIndex={-1} className="step active">
            {current === 0 && (
              <section>
                <p className="eyebrow">Etapa inicial</p>
                <h1>Que nível de maturidade o Sebrae/MT espera da sua liderança?</h1>
                <p className="lead">
                  Em cada uma das {dimensions.length} dimensões, leia as 5 descrições e escolha a que representa o
                  nível que a instituição deve esperar da sua liderança. Não se trata de avaliar um gestor
                  específico nem a prática de hoje: é a régua que a Diretoria assume como expectativa.
                </p>
                <div className="fields fields-single">
                  <div className="field">
                    <label htmlFor="respondentName">Nome completo <span className="required">*</span></label>
                    <input
                      id="respondentName"
                      name="respondentName"
                      autoComplete="name"
                      maxLength={NAME_MAX_LENGTH}
                      value={identity.respondentName}
                      onChange={(event) => updateIdentity({ respondentName: event.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="directorate">Diretoria / instância <span className="required">*</span></label>
                    <select
                      id="directorate"
                      name="directorate"
                      value={identity.directorate}
                      onChange={(event) => updateIdentity({ directorate: event.target.value })}
                    >
                      <option value="">Selecione…</option>
                      {directorates.map((directorate) => (
                        <option key={directorate} value={directorate}>
                          {directorate}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="respondentRole">
                      Cargo <span className="optional-label">(opcional)</span>
                    </label>
                    <input
                      id="respondentRole"
                      name="respondentRole"
                      maxLength={ROLE_MAX_LENGTH}
                      value={identity.respondentRole}
                      onChange={(event) => updateIdentity({ respondentRole: event.target.value })}
                    />
                  </div>
                </div>
                <p className="lead privacy-note">
                  Esta pesquisa não é anônima: a expectativa institucional é uma posição assumida, e sua resposta
                  será consolidada com a dos demais membros da Diretoria para fechar o nível esperado de cada
                  dimensão.
                </p>
                <p className={`error ${identityError ? "show" : ""}`} role="alert">
                  {identityError}
                </p>
              </section>
            )}

            {activeDimension && (
              <section>
                <div className="question-title">
                  <div className="number">{current}</div>
                  <div>
                    <p className="eyebrow">Dimensão {current} de {dimensions.length}</p>
                    <h1>{activeDimension.title}</h1>
                  </div>
                </div>
                <p className="instruction">
                  Qual destes níveis o Sebrae/MT deve esperar da sua liderança nesta dimensão? Escolha apenas uma
                  opção.
                </p>
                <div className="options">
                  {activeDimension.options.map((option, index) => (
                    <label className="option" key={option}>
                      <input
                        type="radio"
                        name={`d${current}`}
                        value={index + 1}
                        checked={expectations[String(current)] === index + 1}
                        onChange={() => setExpectedLevel(index + 1)}
                      />
                      <span className="option-copy">{option}</span>
                      <span className="choice-check" aria-hidden="true">✓</span>
                    </label>
                  ))}
                </div>
                <p className="expectation-note">
                  <span className="note-icon" aria-hidden="true">!</span>
                  <span>
                    Responda pela <b>expectativa</b>, não pela prática observada. Os níveis crescem de{" "}
                    <b>{levels[0]}</b> a <b>{levels[levels.length - 1]}</b> e descrevem graus de maturidade
                    comportamental — o mais alto nem sempre é o exigível de toda a liderança.
                  </span>
                </p>
                <p className={`error ${answerError ? "show" : ""}`} role="alert">
                  Selecione uma alternativa para continuar.
                </p>
              </section>
            )}

            {current === REVIEW_STEP && (
              <section>
                <p className="eyebrow">Revisão</p>
                <h1>Confira a expectativa que você definiu</h1>
                <p className="lead">Você pode voltar para ajustar qualquer dimensão antes de concluir.</p>
                <div className="review">
                  <div className="review-item review-person">
                    <span className="review-number" aria-hidden="true">ID</span>
                    <div className="review-content">
                      <b>{identity.respondentName.trim()}</b>
                      <p>
                        {identity.respondentRole.trim()
                          ? `${identity.respondentRole.trim()} — ${identity.directorate}`
                          : identity.directorate}
                      </p>
                    </div>
                  </div>
                  {dimensions.map((dimension, index) => {
                    const expectedLevel = expectations[String(index + 1)];
                    return (
                      <div className="review-item" key={dimension.title}>
                        <span className="review-number" aria-hidden="true">{index + 1}</span>
                        <div className="review-content">
                          <b>
                            {dimension.title} · nível {expectedLevel} ({levels[expectedLevel - 1]})
                          </b>
                          <p>{dimension.options[expectedLevel - 1] ?? "Resposta não encontrada"}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className={`error ${submitError ? "show" : ""}`} role="alert">
                  {submitError}
                </p>
              </section>
            )}

            {current === DONE_STEP && (
              <section className="done">
                <div className="done-icon" aria-hidden="true">✓</div>
                <p className="eyebrow">Concluído</p>
                <h1>Expectativa registrada</h1>
                <p className="lead">
                  Sua expectativa foi registrada e será consolidada com a dos demais membros da Diretoria para
                  fechar o nível esperado de cada dimensão.
                  {submission?.emailSent
                    ? " Os relatórios em PDF e Excel também foram enviados aos responsáveis pela pesquisa."
                    : ""}
                </p>
              </section>
            )}
          </div>

          {current !== DONE_STEP && (
            <nav className="actions" aria-label="Navegação da pesquisa">
              {current > 0 ? (
                <button className="btn btn-secondary" type="button" onClick={() => goTo(current - 1)}>
                  Voltar
                </button>
              ) : <span />}
              <div className="right-actions">
                {current === REVIEW_STEP ? (
                  <button className="btn btn-primary" type="submit" disabled={submitting}>
                    {submitting ? "Gerando e enviando…" : "Enviar expectativa"}
                  </button>
                ) : (
                  <button className="btn btn-primary" type="button" onClick={continueSurvey}>Continuar</button>
                )}
              </div>
            </nav>
          )}
        </form>

        <footer className="privacy">
          <span>Instrumento de desenvolvimento • Sebrae / MT</span>
          <span>
            Defina a expectativa pensando na liderança como um todo, não em pessoas específicas.
            {completedAnswers > 0 && current !== DONE_STEP ? ` ${completedAnswers} de ${dimensions.length} dimensões definidas.` : ""}
          </span>
        </footer>
      </div>
    </main>
  );
}
