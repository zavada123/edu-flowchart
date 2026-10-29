import type { KeyboardEvent } from "react"
import type { Layout, Shape, Slot } from "../core/index.ts"

interface Props {
  readonly layout: Layout
  /** Block being edited. */
  readonly selected?: string | undefined
  /** Block the run goes to next. */
  readonly active?: string | undefined
  /** Blocks with a problem. */
  readonly broken: ReadonlySet<string>
  /** Slot whose palette is open. */
  readonly openSlot?: Slot | undefined
  readonly editable: boolean
  readonly onBlock: (id: string) => void
  readonly onSlot: (slot: Slot) => void
}

const SKEW = 12
const HEX = 14
const SLOT_R = 11
const LINE_H = 18

const outline = (s: Shape): string => {
  const l = s.x - s.w / 2
  const r = s.x + s.w / 2
  const t = s.y - s.h / 2
  const b = s.y + s.h / 2
  switch (s.kind) {
    case "io": return `${l + SKEW},${t} ${r},${t} ${r - SKEW},${b} ${l},${b}`
    case "decision": return `${s.x},${t} ${r},${s.y} ${s.x},${b} ${l},${s.y}`
    case "loop": return `${l + HEX},${t} ${r - HEX},${t} ${r},${s.y} ${r - HEX},${b} ${l + HEX},${b} ${l},${s.y}`
    default: return ""
  }
}

const sameSlot = (a: Slot | undefined, b: Slot): boolean =>
  a !== undefined && a.parent === b.parent && a.branch === b.branch && a.index === b.index

const onEnter = (f: () => void) => (e: KeyboardEvent) => {
  if (e.key !== "Enter" && e.key !== " ") return
  e.preventDefault()
  f()
}

const ShapeView = ({ s }: { readonly s: Shape }) => {
  if (s.kind === "terminal" || s.kind === "process") {
    const rx = s.kind === "terminal" ? s.h / 2 : 4
    return <rect className="edu-fc-outline" x={s.x - s.w / 2} y={s.y - s.h / 2} width={s.w} height={s.h} rx={rx} />
  }
  return <polygon className="edu-fc-outline" points={outline(s)} />
}

/** The flowchart as SVG: tap a block to edit it, tap "+" to add a block there. */
export const Chart = ({ layout, selected, active, broken, openSlot, editable, onBlock, onSlot }: Props) => (
  <svg
    className="edu-fc-chart"
    viewBox={`0 0 ${layout.width} ${layout.height}`}
    width={layout.width}
    height={layout.height}
    role="img"
    aria-label="Блок-схема"
  >
    <defs>
      <marker id="edu-fc-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" className="edu-fc-arrowhead" />
      </marker>
    </defs>
    {layout.edges.map((e, i) => (
      <polyline
        key={i}
        className="edu-fc-edge"
        points={e.points.map(([x, y]) => `${x},${y}`).join(" ")}
        markerEnd={e.arrow ? "url(#edu-fc-arrow)" : undefined}
      />
    ))}
    {layout.labels.map((l, i) => (
      <text key={i} className="edu-fc-label" x={l.x} y={l.y} textAnchor={l.anchor}>
        {l.text}
      </text>
    ))}
    {layout.shapes.map((s) => {
      const isBlock = s.block !== undefined
      const cls = [
        "edu-fc-shape",
        `edu-fc-${s.block ?? s.kind}`,
        s.id === selected ? "edu-fc-selected" : "",
        s.id === active ? "edu-fc-active" : "",
        broken.has(s.id) ? "edu-fc-broken" : ""
      ].join(" ")
      const top = s.y - ((s.lines.length - 1) * LINE_H) / 2
      const text = (
        <text className="edu-fc-text" x={s.x} y={top} textAnchor="middle" dominantBaseline="central">
          {s.lines.map((line, i) => (
            <tspan key={i} x={s.x} y={top + i * LINE_H}>
              {line}
            </tspan>
          ))}
        </text>
      )
      if (!isBlock || !editable) {
        return (
          <g key={s.id} className={cls}>
            <ShapeView s={s} />
            {text}
          </g>
        )
      }
      return (
        <g
          key={s.id}
          className={cls + " edu-fc-clickable"}
          role="button"
          tabIndex={0}
          aria-label={`Змінити блок: ${s.lines.join(" ")}`}
          onClick={() => onBlock(s.id)}
          onKeyDown={onEnter(() => onBlock(s.id))}
        >
          <ShapeView s={s} />
          {text}
        </g>
      )
    })}
    {editable &&
      layout.slots.map((p) => (
        <g
          key={`${p.slot.parent ?? "main"}-${p.slot.branch}-${p.slot.index}`}
          className={sameSlot(openSlot, p.slot) ? "edu-fc-slot edu-fc-slot-open" : "edu-fc-slot"}
          role="button"
          tabIndex={0}
          aria-label="Додати блок сюди"
          onClick={() => onSlot(p.slot)}
          onKeyDown={onEnter(() => onSlot(p.slot))}
        >
          {/* A bigger invisible circle: easier to hit with a finger. */}
          <circle cx={p.x} cy={p.y} r={SLOT_R * 2} className="edu-fc-slot-hit" />
          <circle cx={p.x} cy={p.y} r={SLOT_R} />
          <path d={`M${p.x - 5},${p.y} h10 M${p.x},${p.y - 5} v10`} />
        </g>
      ))}
  </svg>
)
