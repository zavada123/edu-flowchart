import { StrictMode, useState } from "react"
import { createRoot } from "react-dom/client"
import { tasks, type Report } from "../core/index.ts"
import { FlowchartTrainer } from "../ui/FlowchartTrainer.tsx"
import "./demo.css"

const firstTask = tasks[0]
if (!firstTask) throw new Error("Немає жодної задачі")

const params = new URLSearchParams(window.location.search)
/** ?embed=1 hides the demo header and sends the result to the parent page (iframe). */
const embedded = params.get("embed") === "1"
const large = params.get("large") === "1"

/** In an iframe the host page listens: window.addEventListener("message", e => e.data.type === "edu-flowchart:result"). */
const sendToParent = (report: Report) => {
  if (window.parent !== window) window.parent.postMessage({ type: "edu-flowchart:result", report }, "*")
}

/** Demo page: pick a task and try the trainer. */
const Demo = () => {
  const [id, setId] = useState(params.get("task") ?? firstTask.id)
  const [last, setLast] = useState<Report>()
  const task = tasks.find((t) => t.id === id) ?? firstTask
  const onComplete = (report: Report) => {
    setLast(report)
    sendToParent(report)
  }
  if (embedded) return <FlowchartTrainer task={task} large={large} onComplete={onComplete} />
  return (
    <div className="demo">
      <header className="demo-head">
        <strong>Тренажер блок-схем</strong>
        <label>
          <span className="demo-visually-hidden">Задача</span>
          <select
            value={task.id}
            onChange={(e) => {
              setId(e.target.value)
              setLast(undefined)
            }}
          >
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.mode === "trace" ? "Виконай" : "Склади"} · {t.title}
              </option>
            ))}
          </select>
        </label>
      </header>
      <main className="demo-main">
        <FlowchartTrainer key={task.id} task={task} large={large} onComplete={onComplete} />
        {last && (
          <details className="demo-report">
            <summary>Що отримає EduProstir (onComplete)</summary>
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
