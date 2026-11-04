import { TOPIC_NAMES, type Task, type TaskTopic } from "../core/index.ts"
import { ShapeIcon } from "./Icons.tsx"
import "./tokens.css"
import "./flowchart.css"
import "./catalog.css"

interface Props {
  readonly tasks: readonly Task[]
  /** Ids of solved tasks: they get a check mark. */
  readonly solved: readonly string[]
  /** The open task, highlighted. */
  readonly current?: string | undefined
  readonly onPick: (id: string) => void
}

const ORDER: readonly TaskTopic[] = ["everyday", "linear", "branch", "loop"]
const TOPIC_ICON: Readonly<Record<TaskTopic, "process" | "input" | "if" | "while">> = {
  everyday: "process",
  linear: "input",
  branch: "if",
  loop: "while"
}

/** The single tasks as cards, grouped by topic: type, grade and a check mark for solved ones. */
export const TaskCatalog = ({ tasks, solved, current, onPick }: Props) => {
  const done = tasks.filter((t) => solved.includes(t.id)).length
  const groups = ORDER.map((topic) => ({ topic, items: tasks.filter((t) => (t.topic ?? "linear") === topic) })).filter((g) => g.items.length > 0)
  return (
    <nav className="edu-ft" aria-label="Окремі задачі">
      <div className="edu-ft-top">
        <p className="edu-ft-count" aria-live="polite">
          Виконано <b>{done}</b> з {tasks.length}
        </p>
        <span className="edu-ft-bar" aria-hidden="true">
          <span style={{ width: `${tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100)}%` }} />
        </span>
        <span className="edu-ft-legend">
          <span className="edu-ft-mode edu-ft-mode-build">Склади</span> блок-схему сам ·{" "}
          <span className="edu-ft-mode edu-ft-mode-trace">Виконай</span> готову й знайди відповідь
        </span>
      </div>
      {groups.map((g) => (
        <section key={g.topic} className="edu-ft-group">
          <h3 className="edu-ft-topic">
            <ShapeIcon kind={TOPIC_ICON[g.topic]} /> {TOPIC_NAMES[g.topic]}
          </h3>
          <div className="edu-ft-grid">
            {g.items.map((t) => {
              const isSolved = solved.includes(t.id)
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`edu-ft-card${t.id === current ? " is-current" : ""}${isSolved ? " is-solved" : ""}`}
                  aria-current={t.id === current ? "step" : undefined}
                  onClick={() => onPick(t.id)}
                >
                  <span className="edu-ft-meta">
                    <span className={`edu-ft-mode edu-ft-mode-${t.mode}`}>{t.mode === "build" ? "Склади" : "Виконай"}</span>
                    {t.grade !== undefined && <span className="edu-ft-grade">{t.grade} клас</span>}
                    {isSolved && (
                      <span className="edu-ft-done" aria-label="виконано">
                        ✓
                      </span>
                    )}
                  </span>
                  <b>{t.title}</b>
                  <small>{t.text}</small>
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </nav>
  )
}
