import { useEffect, useMemo, useState } from "react"
import {
  allBlocks,
  answer,
  checkBuild,
  checkTrace,
  compile,
  findBlock,
  insertBlock,
  layout,
  newBlock,
  parseInputValue,
  parseNames,
  removeBlock,
  setText,
  start,
  step,
  type BlockKind,
  type Compiled,
  type Inputs,
  type Issue,
  type Program,
  type Report,
  type RunState,
  type Slot,
  type Task
} from "../core/index.ts"
import { Chart } from "./Chart.tsx"
import { ALL_KINDS, BlockEditor, Palette } from "./Editor.tsx"
import { BulbIcon, CheckIcon, PauseIcon, PlayIcon, StepIcon, StopIcon } from "./Icons.tsx"
import { ResultView } from "./ResultView.tsx"
import { FullScreenButton, useFullScreen } from "./fullscreen.tsx"
import { RunPanel } from "./RunPanel.tsx"
import "./tokens.css"
import "./flowchart.css"

interface Props {
  readonly task: Task
  /** After every "Перевірити": the score and the student's flowchart or answers. */
  readonly onComplete?: (report: Report) => void
  /** After every edit, to keep a draft. */
  readonly onChange?: (program: Program) => void
  /** A saved draft to continue (build tasks). */
  readonly initialProgram?: Program | undefined
  /** Saved answers to continue (trace tasks). */
  readonly initialAnswers?: readonly string[] | undefined
  /** Bigger text and buttons for grades 3–5. */
  readonly large?: boolean
  /** False hides the title, text and hint: a host such as the quest shows the task itself. */
  readonly showHeader?: boolean
}

const AUTO_STEP_MS = 700
const EMPTY: Program = { blocks: [] }

/** Names from all Input blocks, for the input fields; broken blocks are skipped. */
const inputNames = (program: Program): string[] => {
  const names = allBlocks(program.blocks).flatMap((b) => {
    if (b.kind !== "input") return []
    try {
      return parseNames(b.text)
    } catch {
      return []
    }
  })
  return [...new Set(names)]
}

/** "4; 0; 8" is a list: an Input block inside a loop reads one value per run. */
const toValue = (text: string) => (text.includes(";") ? text.split(";").filter((t) => t.trim() !== "").map(parseInputValue) : parseInputValue(text))

const toInputs = (texts: Readonly<Record<string, string>>, names: readonly string[]): Inputs =>
  Object.fromEntries(names.filter((n) => (texts[n] ?? "").trim() !== "").map((n) => [n, toValue(texts[n] ?? "")]))

const MODE_NAMES: Readonly<Record<Task["mode"], string>> = { build: "Склади блок-схему", trace: "Виконай блок-схему" }

interface Run {
  readonly compiled: Compiled
  readonly state: RunState
  readonly inputs: Inputs
}

/** Flowchart exercise: build or read a flowchart, run it step by step, check it. */
export const FlowchartTrainer = ({ task, onComplete, onChange, initialProgram, initialAnswers, large = false, showHeader = true }: Props) => {
  const editable = task.mode === "build"
  const [program, setProgram] = useState<Program>(() => (task.mode === "trace" ? task.program : initialProgram ?? task.start ?? EMPTY))
  const [selected, setSelected] = useState<string>()
  const [openSlot, setOpenSlot] = useState<Slot>()
  const [run, setRun] = useState<Run>()
  const [auto, setAuto] = useState(false)
  const [issues, setIssues] = useState<readonly Issue[]>([])
  const [inputTexts, setInputTexts] = useState<Readonly<Record<string, string>>>({})
  const [question, setQuestion] = useState(0)
  const [answers, setAnswers] = useState<readonly string[]>(() => (task.mode === "trace" ? task.questions.map((_, i) => initialAnswers?.[i] ?? "") : []))
  const [report, setReport] = useState<Report>()

  const screen = useFullScreen()
  const picture = useMemo(() => layout(program), [program])
  const names = useMemo(() => inputNames(program), [program])
  const live = useMemo(() => compile(program).issues, [program])

  useEffect(() => {
    if (!auto || !run || run.state.status !== "running") return undefined
    const id = window.setTimeout(() => setRun({ ...run, state: step(run.compiled, run.state, run.inputs) }), AUTO_STEP_MS)
    return () => window.clearTimeout(id)
  }, [auto, run])

  const change = (next: Program) => {
    setProgram(next)
    setRun(undefined)
    setAuto(false)
    setReport(undefined)
    setIssues([])
    onChange?.(next)
  }

  const add = (kind: BlockKind) => {
    if (!openSlot) return
    const block = newBlock(kind)
    change(insertBlock(program, openSlot, block))
    setOpenSlot(undefined)
    setSelected(block.id)
  }

  const currentInputs = (): Inputs =>
    task.mode === "trace" ? (task.questions[question]?.inputs ?? {}) : toInputs(inputTexts, names)

  /** Starts a new run, or returns the one going on. */
  const ensureRun = (fresh = false, inputs = currentInputs()): Run | undefined => {
    if (!fresh && run && run.state.status !== "done" && run.state.status !== "error") return run
    const { compiled, issues: found } = compile(program)
    setIssues(found)
    if (!compiled) return undefined
    setSelected(undefined)
    setOpenSlot(undefined)
    return { compiled, state: start(compiled), inputs }
  }

  const play = () => {
    const r = ensureRun()
    if (!r) return
    setRun(r)
    setAuto(true)
  }

  /** Trace tasks: run the chart with the inputs of question i. */
  const playQuestion = (i: number) => {
    if (task.mode !== "trace") return
    setQuestion(i)
    const r = ensureRun(true, task.questions[i]?.inputs ?? {})
    if (!r) return
    setRun(r)
    setAuto(true)
  }

  const stepOnce = () => {
    const r = ensureRun()
    if (!r) return
    setAuto(false)
    setRun({ ...r, state: step(r.compiled, r.state, r.inputs) })
  }

  const stop = () => {
    setAuto(false)
    setRun(undefined)
  }

  const check = () => {
    const r = task.mode === "build" ? checkBuild(task, program) : checkTrace(task, answers)
    setReport(r)
    setIssues(r.issues)
    onComplete?.(r)
  }

  const block = selected === undefined ? undefined : findBlock(program, selected)
  const broken = new Set([...issues.map((i) => i.blockId), ...(run?.state.error ? [run.state.error.blockId] : [])])
  const running = run !== undefined && run.state.status !== "done" && run.state.status !== "error"
  const canCheck = task.mode === "trace" || task.tests.length > 0

  return (
    <div className={`edu-fc${large ? " edu-fc-large" : ""}${screen.full ? " edu-fc-full" : ""}`}>
      {showHeader && (
        <header className="edu-fc-head">
          <div className="edu-fc-head-row">
            <span className={`edu-fc-mode edu-fc-mode-${task.mode}`}>{MODE_NAMES[task.mode]}</span>
            <FullScreenButton full={screen.full} onToggle={screen.toggle} className="edu-fc-fullbtn" />
          </div>
          <h3 className="edu-fc-title">{task.title}</h3>
          <p>{task.text}</p>
          {task.hint !== undefined && (
            <details className="edu-fc-hint">
              <summary>
                <BulbIcon /> Підказка
              </summary>
              <p>{task.hint}</p>
            </details>
          )}
        </header>
      )}

      <div className="edu-fc-layout">
        <div className="edu-fc-canvas">
          <div className="edu-fc-legend" aria-hidden="true">
            {editable && !running ? "Торкнись «+», щоб додати блок, або блоку, щоб змінити його" : running ? "Виконання: підсвічено наступний блок" : "Блок-схема"}
          </div>
          <div className="edu-fc-scroll">
            <Chart
              layout={picture}
              selected={selected}
              active={running ? run.state.at : undefined}
              broken={broken}
              openSlot={openSlot}
              editable={editable && !running}
              onBlock={(id) => {
                setOpenSlot(undefined)
                setSelected(id === selected ? undefined : id)
              }}
              onSlot={(slot) => {
                setSelected(undefined)
                setOpenSlot(slot)
              }}
            />
          </div>
        </div>

        <div className="edu-fc-side">
          {openSlot && (
            <Palette
              kinds={task.mode === "build" ? (task.blocks ?? ALL_KINDS) : []}
              onPick={add}
              onCancel={() => setOpenSlot(undefined)}
            />
          )}
          {block && (
            <BlockEditor
              block={block}
              problem={live.find((i) => i.blockId === block.id)?.message}
              onText={(text) => change(setText(program, block.id, text))}
              onDelete={() => {
                change(removeBlock(program, block.id))
                setSelected(undefined)
              }}
              onClose={() => setSelected(undefined)}
            />
          )}
          {editable && program.blocks.length === 0 && !openSlot && (
            <p className="edu-fc-empty">Натисни «+» під блоком «Початок», щоб додати перший блок.</p>
          )}

          {task.mode === "build" && names.length > 0 && (
            <section className="edu-fc-panel" aria-label="Вхідні дані">
              <p className="edu-fc-panel-title">Вхідні дані для запуску</p>
              <div className="edu-fc-inputs">
                {names.map((n) => (
                  <label key={n}>
                    <span>{n} =</span>
                    <input
                      inputMode="decimal"
                      value={inputTexts[n] ?? ""}
                      placeholder="?"
                      onChange={(e) => {
                        setInputTexts({ ...inputTexts, [n]: e.target.value })
                        stop()
                      }}
                    />
                  </label>
                ))}
              </div>
            </section>
          )}

          {task.mode === "trace" && (
            <section className="edu-fc-panel" aria-label="Запитання">
              <p className="edu-fc-panel-title">Твої відповіді</p>
              {task.questions.map((q, i) => (
                <div key={i} className={question === i ? "edu-fc-answer is-on" : "edu-fc-answer"}>
                  <label htmlFor={`edu-fc-a-${task.id}-${i}`}>
                    Якщо <code>{Object.entries(q.inputs).map(([k, v]) => `${k} = ${String(v)}`).join(", ")}</code>, то <code>{q.ask}</code> =
                  </label>
                  <input
                    id={`edu-fc-a-${task.id}-${i}`}
                    inputMode="decimal"
                    value={answers[i] ?? ""}
                    placeholder="?"
                    onChange={(e) => {
                      setAnswers(answers.map((a, k) => (k === i ? e.target.value : a)))
                      setReport(undefined)
                    }}
                  />
                  <button
                    type="button"
                    className="edu-fc-chip"
                    aria-pressed={question === i}
                    aria-label="Виконати схему з цими даними"
                    title="Виконати схему з цими даними"
                    onClick={() => playQuestion(i)}
                  >
                    <PlayIcon />
                  </button>
                </div>
              ))}
            </section>
          )}

          <div className="edu-fc-controls">
            <div className="edu-fc-group" role="group" aria-label="Виконання">
              <button type="button" className="edu-fc-button" onClick={auto && running ? () => setAuto(false) : play}>
                {auto && running ? <PauseIcon /> : <PlayIcon />}
                {auto && running ? "Пауза" : "Виконати"}
              </button>
              <button type="button" className="edu-fc-button" onClick={stepOnce} disabled={run?.state.status === "ask"}>
                <StepIcon /> Крок
              </button>
              <button type="button" className="edu-fc-button" onClick={stop} disabled={!run} aria-label="Скинути">
                <StopIcon />
              </button>
            </div>
            {canCheck && (
              <button type="button" className="edu-fc-button edu-fc-primary edu-fc-check" onClick={check}>
                <CheckIcon /> Перевірити
              </button>
            )}
          </div>

          {!report && issues.length > 0 && (
            <ul className="edu-fc-panel edu-fc-issues">
              {issues.map((i, k) => (
                <li key={k}>{i.message}</li>
              ))}
            </ul>
          )}
          <RunPanel state={run?.state} onAnswer={(yes) => run && setRun({ ...run, state: answer(run.compiled, run.state, yes) })} />
          {report && <ResultView report={report} />}
        </div>
      </div>
    </div>
  )
}
