import { formatValue, type RunState } from "../core/index.ts"

interface Props {
  readonly state?: RunState | undefined
  readonly onAnswer: (yes: boolean) => void
}

/** Variables, output and the question a running flowchart asks. */
export const RunPanel = ({ state, onAnswer }: Props) => {
  if (!state) return null
  const vars = Object.entries(state.vars)
  return (
    <section className="edu-fc-panel edu-fc-run" aria-label="Виконання" aria-live="polite">
      <p className="edu-fc-status">
        {state.status === "done" && "Кінець. Алгоритм виконано."}
        {state.status === "running" && `Крок ${state.steps}. Наступний блок виділено.`}
        {state.status === "error" && state.error?.message}
        {state.status === "ask" && `${state.question}?`}
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
      <div className="edu-fc-run-grid">
        <div>
          <p className="edu-fc-panel-title">Змінні</p>
          {vars.length === 0 ? (
            <p className="edu-fc-muted">поки немає</p>
          ) : (
            <table className="edu-fc-vars">
              <tbody>
                {vars.map(([k, v]) => (
                  <tr key={k}>
                    <th>{k}</th>
                    <td>{formatValue(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div>
          <p className="edu-fc-panel-title">Виведено</p>
          {state.output.length === 0 ? (
            <p className="edu-fc-muted">поки нічого</p>
          ) : (
            <pre className="edu-fc-output">{state.output.map((line) => line.map(formatValue).join(" ")).join("\n")}</pre>
          )}
        </div>
      </div>
    </section>
  )
}
