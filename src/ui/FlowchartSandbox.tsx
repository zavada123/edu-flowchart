import { useRef, useState } from "react"
import { encodeShare, type BuildTask, type Program, type SharedChart } from "../core/index.ts"
import { FlowchartTrainer } from "./FlowchartTrainer.tsx"
import { FullScreenButton, useFullScreen } from "./fullscreen.tsx"
import "./tokens.css"
import "./sandbox.css"

interface Props {
  /** A chart to start from: a saved draft or one opened from a shared link. */
  readonly initialChart?: SharedChart | undefined
  /** True when `initialChart` came from somebody's link: the page says so. */
  readonly fromLink?: boolean
  /** After every change of the chart or its title, to keep a draft. */
  readonly onChange?: (chart: SharedChart) => void
  /** The link for a share code. By default this page with `#fc=<code>`. */
  readonly shareUrl?: (code: string) => string
  readonly large?: boolean
}

const FREE_TASK: BuildTask = {
  id: "free",
  mode: "build",
  title: "Вільна блок-схема",
  text: "Склади будь-який алгоритм.",
  tests: []
}

const EMPTY: Program = { blocks: [] }

const defaultUrl = (code: string): string => `${window.location.origin}${window.location.pathname}${window.location.search}#fc=${code}`

type Shared = { readonly kind: "none" } | { readonly kind: "copied"; readonly url: string } | { readonly kind: "show"; readonly url: string }

/** Free mode: the student draws any flowchart, runs it and shares it with a link. Nothing is checked. */
export const FlowchartSandbox = ({ initialChart, fromLink = false, onChange, shareUrl = defaultUrl, large = false }: Props) => {
  const [title, setTitle] = useState(initialChart?.title ?? "")
  const program = useRef<Program>(initialChart?.program ?? EMPTY)
  // A new key starts the trainer again: "Нова схема" clears the chart.
  const [round, setRound] = useState(0)
  const [start, setStart] = useState<Program>(initialChart?.program ?? EMPTY)
  const [shared, setShared] = useState<Shared>({ kind: "none" })
  const [note, setNote] = useState(fromLink)
  const screen = useFullScreen()

  const changed = (next: SharedChart) => {
    setShared({ kind: "none" })
    onChange?.(next)
  }

  const share = async () => {
    const url = shareUrl(encodeShare({ title: title.trim(), program: program.current }))
    try {
      await navigator.clipboard.writeText(url)
      setShared({ kind: "copied", url })
    } catch {
      // No clipboard (an old browser, an iframe without permission): show the link to copy by hand.
      setShared({ kind: "show", url })
    }
  }

  const fresh = () => {
    program.current = EMPTY
    setStart(EMPTY)
    setTitle("")
    setRound(round + 1)
    setNote(false)
    changed({ title: "", program: EMPTY })
  }

  return (
    <div className={`edu-fs${screen.full ? " edu-fs-full" : ""}`}>
      <header className="edu-fs-head">
        <div className="edu-fs-head-text">
          <span className="edu-fs-badge">Вільний режим</span>
          <input
            className="edu-fs-title"
            value={title}
            maxLength={80}
            placeholder="Назва твоєї блок-схеми"
            aria-label="Назва блок-схеми"
            onChange={(e) => {
              setTitle(e.target.value)
              changed({ title: e.target.value, program: program.current })
            }}
          />
          <p>Склади будь-який алгоритм: рецепт, гру, ранок школяра чи обчислення. Запусти його кроками, а потім поділися посиланням з другом або вчителем.</p>
        </div>
        <div className="edu-fs-actions">
          <button type="button" className="edu-fs-btn edu-fs-primary" onClick={() => void share()}>
            🔗 Поділитися
          </button>
          <button type="button" className="edu-fs-btn" onClick={fresh}>
            ＋ Нова схема
          </button>
          <FullScreenButton full={screen.full} onToggle={screen.toggle} className="edu-fs-btn" />
        </div>
      </header>

      {note && (
        <p className="edu-fs-note" role="status">
          <span aria-hidden="true">📬</span> З тобою поділилися цією блок-схемою. Запускай її, змінюй і надсилай свою версію.
        </p>
      )}
      {shared.kind !== "none" && (
        <div className="edu-fs-link" role="status">
          <strong>{shared.kind === "copied" ? "✓ Посилання скопійовано. Надішли його, і людина побачить твою схему." : "Скопіюй посилання й надішли його:"}</strong>
          <input readOnly value={shared.url} aria-label="Посилання на блок-схему" onFocus={(e) => e.target.select()} />
        </div>
      )}

      <FlowchartTrainer
        key={round}
        task={FREE_TASK}
        showHeader={false}
        large={large}
        initialProgram={start}
        onChange={(next) => {
          program.current = next
          changed({ title, program: next })
        }}
      />
    </div>
  )
}
