import { StrictMode, useState } from "react"
import { createRoot } from "react-dom/client"
import { quests, tasks, type QuestProgress, type QuestReport, type Report } from "../core/index.ts"
import { FlowchartQuest } from "../ui/FlowchartQuest.tsx"
import { FlowchartTrainer } from "../ui/FlowchartTrainer.tsx"
import "./demo.css"

const firstTask = tasks[0]
const firstQuest = quests[0]
if (!firstTask || !firstQuest) throw new Error("Немає жодної задачі")

const params = new URLSearchParams(window.location.search)
/** ?embed=1 hides the demo header and sends the result to the parent page (iframe). */
const embedded = params.get("embed") === "1"
const large = params.get("large") === "1"
const QUEST = "quest"
const STORAGE = `edu-flowchart:${firstQuest.id}`

const loadProgress = (): QuestProgress | undefined => {
  try {
    const raw = localStorage.getItem(STORAGE)
    return raw ? (JSON.parse(raw) as QuestProgress) : undefined
  } catch {
    return undefined
  }
}

const saveProgress = (p: QuestProgress) => {
  try {
    localStorage.setItem(STORAGE, JSON.stringify(p))
  } catch {
    // Private mode: progress lives only in this tab.
  }
}

/**
 * In an iframe the host page listens: window.addEventListener("message", e => …).
 * A task sends "edu-flowchart:result", the quest sends "edu-flowchart:quest".
 */
const sendToParent = (type: string, report: Report | QuestReport) => {
  if (window.parent !== window) window.parent.postMessage({ type, report }, "*")
}

/** Demo page: the story quest or any single task. */
const Demo = () => {
  const [id, setId] = useState(params.get("task") ?? QUEST)
  const [last, setLast] = useState<Report | QuestReport>()
  const task = tasks.find((t) => t.id === id) ?? firstTask
  const onComplete = (report: Report) => {
    setLast(report)
    sendToParent("edu-flowchart:result", report)
  }
  const onStepSolved = (report: QuestReport) => {
    setLast({ ...report, progress: undefined } as unknown as QuestReport)
    sendToParent("edu-flowchart:quest", report)
  }
  const trainer =
    id === QUEST ? (
      <FlowchartQuest quest={firstQuest} large={large} initialProgress={loadProgress()} onChange={saveProgress} onStepSolved={onStepSolved} />
    ) : (
      <FlowchartTrainer key={task.id} task={task} large={large} onComplete={onComplete} />
    )
  if (embedded) return trainer
  return (
    <div className="demo">
      <header className="demo-head">
        <strong>Тренажер блок-схем</strong>
        <label>
          <span className="demo-visually-hidden">Задача</span>
          <select
            value={id === QUEST ? QUEST : task.id}
            onChange={(e) => {
              setId(e.target.value)
              setLast(undefined)
            }}
          >
            <option value={QUEST}>🚀 Місія · {firstQuest.title}</option>
            <optgroup label="Окремі задачі">
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.mode === "trace" ? "Виконай" : "Склади"} · {t.title}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
      </header>
      <main className="demo-main">
        {trainer}
        {last && (
          <details className="demo-report">
            <summary>Що отримає EduProstir</summary>
            <pre>{JSON.stringify(last, null, 2)}</pre>
          </details>
        )}
      </main>
    </div>
  )
}

const rootEl = document.getElementById("root")
if (!rootEl) throw new Error("Немає #root")
createRoot(rootEl).render(
  <StrictMode>
    <Demo />
  </StrictMode>
)
