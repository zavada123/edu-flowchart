import type { StoryLine } from "../core/index.ts"
import { Rover } from "./Rover.tsx"

/** Story lines: the rover speaks in chat bubbles, the radio crackles, the narrator sets the scene. */
export const QuestStory = ({ lines }: { readonly lines: readonly StoryLine[] }) => (
  <div className="edu-fq-story">
    {lines.map((line, i) => {
      const delay = { animationDelay: `${i * 90}ms` }
      if (line.speaker === "rover") {
        return (
          <div key={i} className="edu-fq-say" style={delay}>
            <Rover size={44} />
            <div className="edu-fq-bubble">
              <span className="edu-fq-who">Іскра · марсохід</span>
              <p>{line.text}</p>
            </div>
          </div>
        )
      }
      if (line.speaker === "radio") {
        return (
          <p key={i} className="edu-fq-radio" style={delay}>
            <span aria-hidden="true">📡</span> {line.text}
          </p>
        )
      }
      return (
        <p key={i} className="edu-fq-narrator" style={delay}>
          {line.text}
        </p>
      )
    })}
  </div>
)

/** The mission log: every solved step adds an entry. */
export const MissionLog = ({ clues, open }: { readonly clues: readonly string[]; readonly open: boolean }) =>
  clues.length === 0 ? null : (
    <details className="edu-fq-log" open={open}>
      <summary>
        <span aria-hidden="true">🛰️</span> Бортовий журнал <span className="edu-fq-badge">{clues.length}</span>
      </summary>
      <ol>
        {clues.map((c, i) => (
          <li key={i}>
            <span className="edu-fq-log-num">{String(i + 1).padStart(2, "0")}</span>
            <span>{c}</span>
          </li>
        ))}
      </ol>
    </details>
  )
