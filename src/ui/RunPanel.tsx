import { formatValue, type RunState } from "../core/index.ts"

interface Props {
  readonly state?: RunState | undefined
  readonly onAnswer: (yes: boolean) => void
}

const STATUS_CLASS: Readonly<Record<RunState["status"], string>> = {
  running: "is-running",
  ask: "is-ask",
  done: "is-done",
  error: "is-error"
}

/** Variables, output and the question a running flowchart asks. */
export const RunPanel = ({ state, onAnswer }: Props) => {
  if (!state) return null
  const vars = Object.entries(state.vars)
  return (
    <section className={`edu-fc-panel edu-fc-run ${STATUS_CLASS[state.status]}`} aria-label="Виконання" aria-live="polite">
      <p className="edu-fc-status">
        <span className="edu-fc-status-dot" aria-hidden="true" />
        <span>
          {state.status === "done" && "Кінець. Алгоритм виконано."}
          {state.status === "running" && "Наступний блок підсвічено на схемі."}
          {state.status === "error" && state.error?.message}
          {state.status === "ask" && `${state.question}?`}
        </span>
        <span className="edu-fc-steps">крок {state.steps}</span>
      </p>
      {state.status === "ask" && (
        <div className="edu-fc-row">
          <button type="button" className="edu-fc-button edu-fc-primary" onClick={() => onAnswer(true)}>
            Так
          </button>
          <button type="button" className="edu-fc-button" onClick={() => onAnswer(false)}>
            Ні
          </button>
        </div>
      )}
      <p className="edu-fc-panel-title">Змінні</p>
      {vars.length === 0 ? (
        <p className="edu-fc-muted">поки немає</p>
      ) : (
        <ul className="edu-fc-vars">
          {vars.map(([k, v]) => (
            <li key={k}>
              <span>{k}</span>
              <b>{formatValue(v)}</b>
            </li>
          ))}
        </ul>
      )}
      <p className="edu-fc-panel-title">Виведено</p>
      <pre className="edu-fc-output">
        {state.output.length === 0 ? <span className="edu-fc-output-empty">поки нічого</span> : state.output.map((line) => line.map(formatValue).join(" ")).join("\n")}
      </pre>
    </section>
  )
}
