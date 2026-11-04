import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import {
  allSteps,
  currentStep,
  emptyProgress,
  makeReport,
  markSolved,
  type Quest,
  type QuestProgress,
  type QuestReport,
  type QuestStep,
  type Report
} from "../core/index.ts"
import { FlowchartTrainer } from "./FlowchartTrainer.tsx"
import { BulbIcon } from "./Icons.tsx"
import { MissionLog, QuestStory } from "./QuestStory.tsx"
import { Rover } from "./Rover.tsx"
import { FullScreenButton, useFullScreen } from "./fullscreen.tsx"
import "./quest.css"

interface Props {
  readonly quest: Quest
  /** Saved progress to continue. */
  readonly initialProgress?: QuestProgress | undefined
  /** After every change of progress (a solved step, a hint, a draft), to save it. */
  readonly onChange?: (progress: QuestProgress) => void
  /** After every solved step. `report.finished` is true when the quest is complete. */
  readonly onStepSolved?: (report: QuestReport) => void
  /** Shown on the final screen under the stats, for example a certificate of the host app. */
  readonly endExtra?: ReactNode
  /** Bigger text and buttons for younger students. */
  readonly large?: boolean
}

const END = "end"

/** A story quest: chapters of flowchart tasks with a rover guide and a mission log. */
export const FlowchartQuest = ({ quest, initialProgress, onChange, onStepSolved, endExtra, large = false }: Props) => {
  const [progress, setProgress] = useState<QuestProgress>(() =>
    initialProgress?.questId === quest.id ? initialProgress : emptyProgress(quest)
  )
  const [viewing, setViewing] = useState<string>(() => currentStep(quest, progress)?.id ?? END)
  const [justSolved, setJustSolved] = useState(false)
  const successRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLDivElement>(null)

  const screen = useFullScreen()
  const steps = useMemo(() => allSteps(quest), [quest])
  const step: QuestStep | undefined = steps.find((s) => s.id === viewing)
  const solved = step !== undefined && progress.solved.includes(step.id)
  const hintsShown = step ? (progress.hintsUsed[step.id] ?? 0) : 0
  const current = currentStep(quest, progress)

  useEffect(() => {
    if (justSolved) successRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [justSolved])

  const update = (next: QuestProgress) => {
    setProgress(next)
    onChange?.(next)
  }

  const open = (id: string) => {
    setViewing(id)
    setJustSolved(false)
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const onComplete = (report: Report) => {
    if (!step || !report.passed || solved) return
    const next = markSolved(progress, step, report.mode === "trace" ? (report.answers ?? []) : (report.program ?? { blocks: [] }))
    update(next)
    setJustSolved(true)
    onStepSolved?.(makeReport(quest, next, step.id))
  }

  const restart = () => {
    update(emptyProgress(quest))
    open(steps[0]?.id ?? END)
  }

  const clues = steps.filter((s) => progress.solved.includes(s.id)).map((s) => s.clue)
  const total = steps.length
  const done = progress.solved.length
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)
  const report = makeReport(quest, progress, "")
  const chapter = quest.chapters.find((ch) => ch.steps.some((s) => s.id === viewing))
  const stepNumber = step ? steps.indexOf(step) + 1 : 0

  return (
    <div className={`edu-fq${large ? " edu-fq-large" : ""}${screen.full ? " edu-fq-full" : ""}`} ref={topRef}>
      <header className="edu-fq-head">
        <div className="edu-fq-head-top">
          <div className="edu-fq-planet" aria-hidden="true" />
          <div className="edu-fq-head-text">
            <p className="edu-fq-kicker">Місія · {quest.grades} клас</p>
            <h2 className="edu-fq-title">{quest.title}</h2>
          </div>
          <div className="edu-fq-meter" aria-label={`Виконано ${done} з ${total}`}>
            <div className="edu-fq-meter-num">
              <strong>{done}</strong>/{total}
            </div>
            <div className="edu-fq-meter-bar">
              <span style={{ width: `${percent}%` }} />
            </div>
          </div>
          <FullScreenButton full={screen.full} onToggle={screen.toggle} className="edu-fq-fullbtn" />
        </div>
        <nav className="edu-fq-map" aria-label="Розділи місії">
          {quest.chapters.map((ch, i) => {
            const chDone = ch.steps.every((s) => progress.solved.includes(s.id))
            const active = ch.steps.some((s) => s.id === viewing)
            return (
              <div key={ch.id} className={`edu-fq-chapter${chDone ? " is-done" : ""}${active ? " is-active" : ""}`}>
                <span className="edu-fq-chapter-title">
                  <span className="edu-fq-chapter-num">{chDone ? "✓" : i + 1}</span>
                  <span>{ch.title}</span>
                </span>
                <span className="edu-fq-chapter-topics">{ch.topics}</span>
                <span className="edu-fq-dots">
                  {ch.steps.map((s) => {
                    const isSolved = progress.solved.includes(s.id)
                    const reachable = isSolved || s.id === current?.id
                    return (
                      <button
                        key={s.id}
                        type="button"
                        disabled={!reachable}
                        onClick={() => open(s.id)}
                        className={`edu-fq-dot${isSolved ? " is-done" : ""}${s.id === viewing ? " is-here" : ""}`}
                        aria-label={`${s.task.title}${isSolved ? " (виконано)" : reachable ? " (поточне завдання)" : " (ще закрито)"}`}
                        title={s.task.title}
                      />
                    )
                  })}
                </span>
              </div>
            )
          })}
        </nav>
      </header>

      {step === undefined ? (
        <section className="edu-fq-end">
          <div className="edu-fq-stamp" aria-hidden="true">
            Місію
            <br />
            виконано
          </div>
          <Rover size={84} mood="happy" />
          <QuestStory lines={quest.ending} />
          <dl className="edu-fq-stats">
            <div>
              <dt>Завдань</dt>
              <dd>
                {report.solvedSteps}/{report.totalSteps}
              </dd>
            </div>
            <div>
              <dt>Підказок</dt>
              <dd>{Object.values(progress.hintsUsed).reduce((a, b) => a + b, 0)}</dd>
            </div>
            <div>
              <dt>Оцінка</dt>
              <dd>{Math.round(report.score * 100)}%</dd>
            </div>
          </dl>
          {endExtra}
          <MissionLog clues={clues} open={endExtra === undefined} />
          <button type="button" className="edu-fq-btn edu-fq-btn-ghost" onClick={restart}>
            ↺ Пройти місію знову
          </button>
        </section>
      ) : (
        <div className="edu-fq-body">
          <section className="edu-fq-brief" aria-label="Завдання">
            <p className="edu-fq-step-label">
              {chapter?.title} · завдання {stepNumber} з {total}
            </p>
            <h3 className="edu-fq-step-title">{step.task.title}</h3>
            <QuestStory lines={step.story} />
            <div className="edu-fq-task">
              <span className="edu-fq-task-icon" aria-hidden="true">
                {step.task.mode === "build" ? "🛠️" : "🔍"}
              </span>
              <div>
                <strong>{step.task.mode === "build" ? "Склади блок-схему" : "Виконай блок-схему"}</strong>
                <p>{step.task.text}</p>
              </div>
            </div>
            {!solved && step.hints.length > 0 && (
              <div className="edu-fq-hints">
                {step.hints.slice(0, hintsShown).map((h, i) => (
                  <p key={i} className="edu-fq-hint">
                    <BulbIcon /> {h}
                  </p>
                ))}
                {hintsShown < step.hints.length && (
                  <button
                    type="button"
                    className="edu-fq-link"
                    onClick={() => update({ ...progress, hintsUsed: { ...progress.hintsUsed, [step.id]: hintsShown + 1 } })}
                  >
                    {hintsShown === 0 ? "Потрібна підказка" : "Ще одна підказка"} ({hintsShown + 1}/{step.hints.length})
                  </button>
                )}
              </div>
            )}
          </section>

          {solved && (
            <div ref={successRef} className={`edu-fq-success${justSolved ? " is-new" : ""}`} role="status">
              <Rover size={52} mood="happy" />
              <div>
                <strong>{justSolved ? "Новий запис у бортовому журналі!" : "Запис у бортовому журналі"}</strong>
                <p>{step.clue}</p>
              </div>
              <button type="button" className="edu-fq-btn" onClick={() => open(current?.id ?? END)}>
                {current ? "Далі →" : "До фіналу →"}
              </button>
            </div>
          )}

          <FlowchartTrainer
            key={step.id}
            task={step.task}
            showHeader={false}
            large={large}
            initialProgram={progress.programs[step.id]}
            initialAnswers={progress.answers[step.id]}
            onChange={(program) => solved || update({ ...progress, programs: { ...progress.programs, [step.id]: program } })}
            onComplete={onComplete}
          />

          <MissionLog clues={clues} open={false} />
        </div>
      )}
    </div>
  )
}
