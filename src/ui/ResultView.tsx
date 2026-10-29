import { formatValue, type Inputs, type Report, type Value } from "../core/index.ts"

const showInputs = (inputs: Inputs): string =>
  Object.entries(inputs)
    .map(([k, v]) => `${k} = ${Array.isArray(v) ? v.map(formatValue).join("; ") : formatValue(v as Value)}`)
    .join(", ")

const showValues = (values: readonly Value[]): string => (values.length === 0 ? "нічого" : values.map(formatValue).join(" "))

/** "Перевірити": which tests passed and what went wrong. */
export const ResultView = ({ report }: { readonly report: Report }) => {
  const passed = report.tests.filter((t) => t.passed).length
  return (
    <section className={report.passed ? "edu-fc-panel edu-fc-result edu-fc-ok" : "edu-fc-panel edu-fc-result"} aria-live="polite">
      <p className="edu-fc-verdict">
        {report.passed
          ? "Правильно!"
          : report.issues.length > 0
            ? "Спершу виправ блок-схему"
            : `Правильно ${passed} з ${report.tests.length}`}
      </p>
      {report.issues.length > 0 && (
        <ul className="edu-fc-issues">
          {report.issues.map((i, k) => (
            <li key={k}>{i.message}</li>
          ))}
        </ul>
      )}
      {report.tests.length > 0 && (
        <ul className="edu-fc-tests">
          {report.tests.map((t, k) => (
            <li key={k} className={t.passed ? "edu-fc-test-ok" : "edu-fc-test-bad"}>
              <span aria-hidden="true">{t.passed ? "✓" : "✗"}</span>{" "}
              {Object.keys(t.inputs).length > 0 && <>{showInputs(t.inputs)}: </>}
              {report.mode === "trace" ? (
                // The right answer is not shown: the student tries again.
                t.actual.length === 0 ? (
                  "немає відповіді"
                ) : (
                  <>
                    твоя відповідь <b>{showValues(t.actual)}</b>
                    {t.passed ? "" : ", неправильно"}
                  </>
                )
              ) : (
                <>
                  очікували <b>{showValues(t.expected)}</b>
                  {!t.passed && (
                    <>
                      , отримали <b>{t.error ? t.error.message : showValues(t.actual)}</b>
                    </>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
