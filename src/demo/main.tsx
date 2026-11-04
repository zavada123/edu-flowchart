import { StrictMode, useState } from "react"
import { createRoot } from "react-dom/client"
import { decodeShare, quests, tasks, type QuestProgress, type QuestReport, type Report } from "../core/index.ts"
import { FlowchartQuest } from "../ui/FlowchartQuest.tsx"
import { FlowchartSandbox } from "../ui/FlowchartSandbox.tsx"
import { FlowchartTrainer } from "../ui/FlowchartTrainer.tsx"
import { TaskCatalog } from "../ui/TaskCatalog.tsx"
import "./demo.css"

const firstTask = tasks[0]
const firstQuest = quests[0]
if (!firstTask || !firstQuest) throw new Error("Немає жодної задачі")

const params = new URLSearchParams(window.location.search)
/** ?embed=1 hides the demo header and sends the result to the parent page (iframe). */
const embedded = params.get("embed") === "1"
const large = params.get("large") === "1"
const QUEST = "quest"
const FREE = "free"
const TASKS = "tasks"
/** A chart shared with a link: #fc=<code>. */
const sharedCode = new URLSearchParams(window.location.hash.slice(1)).get("fc")
const shared = sharedCode ? decodeShare(sharedCode) : undefined
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

/** Demo page: the story quest, the single tasks or the free mode. */
const Demo = () => {
  const [mode, setMode] = useState(shared ? FREE : params.get("task") ? TASKS : (params.get("mode") ?? QUEST))
  const [id, setId] = useState(params.get("task") ?? firstTask.id)
  const [solved, setSolved] = useState<readonly string[]>([])
  const [last, setLast] = useState<Report | QuestReport>()
  const task = tasks.find((t) => t.id === id) ?? firstTask
  const onComplete = (report: Report) => {
    setLast(report)
    if (report.passed && !solved.includes(report.taskId)) setSolved([...solved, report.taskId])
    sendToParent("edu-flowchart:result", report)
  }
  const onStepSolved = (report: QuestReport) => {
    setLast({ ...report, progress: undefined } as unknown as QuestReport)
    sendToParent("edu-flowchart:quest", report)
  }
  const trainer =
    mode === QUEST ? (
      <FlowchartQuest quest={firstQuest} large={large} initialProgress={loadProgress()} onChange={saveProgress} onStepSolved={onStepSolved} />
    ) : mode === FREE ? (
      <FlowchartSandbox initialChart={shared} fromLink={shared !== undefined} large={large} />
    ) : (
      <div className="demo-tasks">
        {!embedded && <TaskCatalog tasks={tasks} solved={solved} current={task.id} onPick={(t) => { setId(t); setLast(undefined) }} />}
        <FlowchartTrainer key={task.id} task={task} large={large} onComplete={onComplete} />
      </div>
    )
  if (embedded) return trainer
  return (
    <div className="demo">
      <header className="demo-head">
        <strong>Тренажер блок-схем</strong>
        <nav className="demo-tabs" aria-label="Режим">
          {[
            [QUEST, "🚀 Місія"],
            [TASKS, "📚 Задачі"],
            [FREE, "✏️ Вільна схема"]
          ].map(([m, label]) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => { setMode(m ?? QUEST); setLast(undefined) }}>
              {label}
            </button>
          ))}
        </nav>
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
