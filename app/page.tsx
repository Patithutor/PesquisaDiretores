"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { dimensions, levels } from "./survey-data";
import { dimensionCountFor, isKnownLeader } from "./leaders";
import LeaderCombobox from "./leader-combobox";

const STORAGE_KEY = "sebraeAvaliacaoDiretoria";
const COMMENT_MAX_LENGTH = 2_000;

type Answer = {
  /** Nível de maturidade observado, de 1 a 5. */
  score: number;
  comment: string;
};

/** Resposta de cada dimensão, indexada pelo número da dimensão. */
type Answers = Record<string, Answer>;

type SavedDraft = {
  leaderName: string;
  answers: Answers;
};

type SubmissionResponse = {
  ok: boolean;
  message?: string;
  stored?: boolean;
  emailSent?: boolean;
  savedLocally?: boolean;
};

function readSavedDraft(): SavedDraft | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;

    const parsed = JSON.parse(saved);
    if (typeof parsed?.leaderName === "string") {
      // Um líder que saiu do lotacionograma não seleciona mais nada no campo:
      // melhor limpar do que deixar o rascunho travar no envio.
      const leaderName = isKnownLeader(parsed.leaderName) ? parsed.leaderName : "";
      return { leaderName, answers: parsed.answers ?? {} };
    }
  } catch {
    return null;
  }

  return null;
}

export default function SurveyPage() {
  const [current, setCurrent] = useState(0);
  const [leaderName, setLeaderName] = useState("");
  const [answers, setAnswers] = useState<Answers>({});
  const [identityError, setIdentityError] = useState(false);
  const [answerError, setAnswerError] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submission, setSubmission] = useState<SubmissionResponse | null>(null);
  const [hydrated, setHydrated] = useState(false);
  // Assessorias respondem só até "Compromisso com resultados", então o número
  // de etapas depende do líder escolhido na primeira tela.
  const dimensionCount = dimensionCountFor(leaderName);
  const activeDimensions = useMemo(() => dimensions.slice(0, dimensionCount), [dimensionCount]);
  const reviewStep = dimensionCount + 1;
  const doneStep = reviewStep + 1;
  const progressSteps = reviewStep + 1;

  const panelRef = useRef<HTMLDivElement>(null);
  const websiteRef = useRef<HTMLInputElement>(null);
  const submissionIdRef = useRef<string | null>(null);

  useEffect(() => {
    const draft = readSavedDraft();
    if (draft) {
      setLeaderName(draft.leaderName);
      setAnswers(draft.answers);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ leaderName, answers }));
  }, [answers, hydrated, leaderName]);

  const progressLabel =
    current === 0
      ? "Início"
      : current === reviewStep
        ? "Revisão"
        : `Dimensão ${current} de ${dimensionCount}`;
  const progressPercent = ((Math.min(current, reviewStep) + 1) / progressSteps) * 100;
  const activeDimension = current >= 1 && current <= dimensionCount ? activeDimensions[current - 1] : null;

  const completedAnswers = useMemo(
    () => activeDimensions.filter((_, index) => answers[String(index + 1)]?.score).length,
    [activeDimensions, answers],
  );

  function goTo(step: number) {
    setCurrent(step);
    setIdentityError(false);
    setAnswerError(false);
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      panelRef.current?.focus({ preventScroll: true });
    });
  }

  function continueSurvey() {
    if (current === 0) {
      const valid = isKnownLeader(leaderName);
      setIdentityError(!valid);
      if (!valid) return;
    }

    if (current >= 1 && current <= dimensionCount && !answers[String(current)]?.score) {
      setAnswerError(true);
      return;
    }

    goTo(current + 1);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (current !== reviewStep || submitting) return;

    setSubmitting(true);
    setSubmitError("");
    submissionIdRef.current ??= crypto.randomUUID();

    try {
      const response = await fetch("/api/avaliacao-diretoria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: submissionIdRef.current,
          leaderName: leaderName.trim(),
          website: websiteRef.current?.value ?? "",
          // Só as dimensões que valem para este líder: trocar de um gerente
          // para uma assessoria pode ter deixado respostas de sobra no rascunho.
          answers: activeDimensions.map((_, index) => ({
            dimension: index + 1,
            score: answers[String(index + 1)]?.score,
            comment: answers[String(index + 1)]?.comment ?? "",
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
      goTo(doneStep);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Não foi possível enviar a pesquisa.");
    } finally {
      setSubmitting(false);
    }
  }

  function setScore(score: number) {
    submissionIdRef.current = null;
    setSubmitError("");
    setAnswers((previous) => ({
      ...previous,
      [String(current)]: { score, comment: previous[String(current)]?.comment ?? "" },
    }));
    setAnswerError(false);
  }

  function setComment(comment: string) {
    submissionIdRef.current = null;
    setSubmitError("");
    setAnswers((previous) => ({
      ...previous,
      [String(current)]: { score: previous[String(current)]?.score ?? 0, comment },
    }));
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
              <b>Avaliação da Diretoria sobre a Liderança</b>
              <span>Régua de maturidade da liderança</span>
            </div>
          </div>
          <div className="save-state">
            <span className="save-dot" aria-hidden="true" />
            Resposta anônima, salva neste dispositivo
          </div>
        </header>

        {current !== doneStep && (
          <div className="progress-wrap">
            <div className="progress-meta">
              <div>
                <span className="progress-kicker">Seu progresso</span>
                <span>{progressLabel}</span>
              </div>
              <span>
                Etapa {Math.min(current + 1, progressSteps)} de {progressSteps}
              </span>
            </div>
            <div
              className="track"
              role="progressbar"
              aria-label="Progresso"
              aria-valuemin={1}
              aria-valuemax={progressSteps}
              aria-valuenow={Math.min(current + 1, progressSteps)}
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
                <h1>Qual o nível de maturidade do avaliado?</h1>
                <h2 className="section-title">Como responder</h2>
                <p className="lead">
                  Em cada uma das dimensões, leia atentamente as 5 descrições e selecione aquela que melhor
                  representa o nível de maturidade do avaliado, considerando sua atuação e os comportamentos
                  demonstrados nos últimos 6 meses. Para responder, leve em conta a frequência, a consistência e a
                  forma como esses comportamentos se manifestaram no período.
                </p>
                <div className="fields fields-single">
                  <div className="field">
                    <label htmlFor="leaderName">Avaliado <span className="required">*</span></label>
                    <LeaderCombobox
                      value={leaderName}
                      onChange={(name) => {
                        submissionIdRef.current = null;
                        setSubmitError("");
                        setLeaderName(name);
                        setIdentityError(false);
                      }}
                    />
                  </div>
                </div>
                <p className="lead privacy-note">
                  Esta pesquisa é anônima: não pedimos o seu nome nem o seu e-mail. Suas respostas serão
                  consolidadas com as dos demais membros da Diretoria e apresentadas apenas de forma agregada.
                </p>
                <p className={`error ${identityError ? "show" : ""}`} role="alert">
                  Selecione o avaliado para continuar.
                </p>
              </section>
            )}

            {activeDimension && (
              <section>
                <div className="question-title">
                  <div className="number">{current}</div>
                  <div>
                    <p className="eyebrow">Dimensão {current} de {dimensionCount}</p>
                    <h1>{activeDimension.title}</h1>
                  </div>
                </div>
                <p className="instruction">
                  Qual destas descrições melhor representa a atuação do avaliado nesta dimensão? Escolha apenas
                  uma opção.
                </p>
                <div className="options">
                  {activeDimension.options.map((option, index) => (
                    <label className="option" key={option}>
                      <input
                        type="radio"
                        name={`d${current}`}
                        value={index + 1}
                        checked={answers[String(current)]?.score === index + 1}
                        onChange={() => setScore(index + 1)}
                      />
                      <span className="option-copy">{option}</span>
                      <span className="choice-check" aria-hidden="true">✓</span>
                    </label>
                  ))}
                </div>
                <div className="evidence">
                  <label htmlFor={`c${current}`}>
                    Comentário <span className="optional">(opcional)</span>
                  </label>
                  <textarea
                    id={`c${current}`}
                    name={`c${current}`}
                    placeholder="Descreva um exemplo concreto que ilustra sua resposta."
                    maxLength={COMMENT_MAX_LENGTH}
                    value={answers[String(current)]?.comment ?? ""}
                    onChange={(event) => setComment(event.target.value)}
                  />
                  <small>
                    Evite informações sensíveis ou nomes de terceiros.{" "}
                    {answers[String(current)]?.comment?.length ?? 0}
                    /{COMMENT_MAX_LENGTH.toLocaleString("pt-BR")}
                  </small>
                </div>
                <p className={`error ${answerError ? "show" : ""}`} role="alert">
                  Selecione uma alternativa para continuar.
                </p>
              </section>
            )}

            {current === reviewStep && (
              <section>
                <p className="eyebrow">Revisão</p>
                <h1>Confira suas respostas</h1>
                <p className="lead">Você pode voltar para ajustar qualquer resposta antes de concluir.</p>
                <div className="review">
                  <div className="review-item review-person">
                    <span className="review-number" aria-hidden="true">ID</span>
                    <div className="review-content">
                      <b>Avaliado</b>
                      <p>{leaderName}</p>
                    </div>
                  </div>
                  {activeDimensions.map((dimension, index) => {
                    const score = answers[String(index + 1)]?.score;
                    return (
                      <div className="review-item" key={dimension.title}>
                        <span className="review-number" aria-hidden="true">{index + 1}</span>
                        <div className="review-content">
                          <b>
                            {dimension.title} · nível {score} ({levels[score - 1]})
                          </b>
                          <p>{dimension.options[score - 1] ?? "Resposta não encontrada"}</p>
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

            {current === doneStep && (
              <section className="done">
                <div className="done-icon" aria-hidden="true">✓</div>
                <p className="eyebrow">Concluído</p>
                <h1>Avaliação enviada</h1>
                <p className="lead">
                  Sua resposta foi registrada de forma anônima e será consolidada com a dos demais membros da
                  Diretoria.
                  {submission?.emailSent
                    ? " Os relatórios em PDF e Excel também foram enviados aos responsáveis pela pesquisa."
                    : ""}
                </p>
              </section>
            )}
          </div>

          {current !== doneStep && (
            <nav className="actions" aria-label="Navegação da pesquisa">
              {current > 0 ? (
                <button className="btn btn-secondary" type="button" onClick={() => goTo(current - 1)}>
                  Voltar
                </button>
              ) : <span />}
              <div className="right-actions">
                {current === reviewStep ? (
                  <button className="btn btn-primary" type="submit" disabled={submitting}>
                    {submitting ? "Gerando e enviando…" : "Enviar respostas"}
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
            Responda com sinceridade e baseie sua escolha em comportamentos observáveis.
            {completedAnswers > 0 && current !== doneStep ? ` ${completedAnswers} de ${dimensionCount} dimensões definidas.` : ""}
          </span>
        </footer>
      </div>
    </main>
  );
}
