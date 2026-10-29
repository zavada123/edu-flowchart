import type { Branch, Slot } from "./edit.ts"
import type { Block, BlockKind, IfBlock, LoopBlock, Program } from "./types.ts"

/**
 * Places a structured flowchart on a plane, top to bottom, as in textbooks:
 * branch Так to the left and Ні to the right, a loop body under its condition.
 * Pure geometry, no DOM: the same layout serves the SVG and the tests.
 */
export type ShapeKind = "terminal" | "process" | "io" | "decision" | "loop"

export interface Shape {
  /** Block id, or "$start" / "$end". */
  readonly id: string
  readonly kind: ShapeKind
  readonly block?: BlockKind
  /** Centre. */
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
  readonly lines: readonly string[]
}

export type Point = readonly [number, number]

export interface Edge {
  readonly points: readonly Point[]
  readonly arrow: boolean
}

export interface Label {
  readonly text: string
  readonly x: number
  readonly y: number
  readonly anchor: "start" | "end"
}

export interface SlotPoint {
  readonly slot: Slot
  readonly x: number
  readonly y: number
}

export interface Layout {
  readonly shapes: readonly Shape[]
  readonly edges: readonly Edge[]
  readonly labels: readonly Label[]
  readonly slots: readonly SlotPoint[]
  readonly width: number
  readonly height: number
}

/** Vertical gap between blocks; the "+" button sits in its middle. */
export const GAP = 48
const BRANCH_GAP = 24
const LOOP_MARGIN = 22
const LOOP_EXIT = 18
const JOIN = 10
const PAD = 16
const LINE_H = 18
const CHAR_W = 7.6
const MAX_CHARS = 26

/** Words to lines of at most MAX_CHARS; a longer word stays whole. */
export const wrap = (text: string, max = MAX_CHARS): string[] => {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ["…"]
  return words.reduce<string[]>((lines, w) => {
    const last = lines[lines.length - 1]
    if (last !== undefined && (last + " " + w).length <= max) return [...lines.slice(0, -1), last + " " + w]
    return [...lines, w]
  }, [])
}

const textWidth = (lines: readonly string[]): number => Math.max(...lines.map((l) => l.length)) * CHAR_W

/** A part of the chart around its own axis x = 0; entry at (0, 0), exit at (0, height). */
interface Box {
  readonly left: number
  readonly right: number
  readonly height: number
  readonly shapes: readonly Shape[]
  readonly edges: readonly Edge[]
  readonly labels: readonly Label[]
  readonly slots: readonly SlotPoint[]
  /** Starts with a line of its own (a postcondition loop), so the line above needs no arrow. */
  readonly opensWithLine?: boolean
}

const EMPTY: Box = { left: 0, right: 0, height: 0, shapes: [], edges: [], labels: [], slots: [] }

const move = (b: Box, dx: number, dy: number): Box => ({
  ...b,
  shapes: b.shapes.map((s) => ({ ...s, x: s.x + dx, y: s.y + dy })),
  edges: b.edges.map((e) => ({ ...e, points: e.points.map(([x, y]): Point => [x + dx, y + dy]) })),
  labels: b.labels.map((l) => ({ ...l, x: l.x + dx, y: l.y + dy })),
  slots: b.slots.map((s) => ({ ...s, x: s.x + dx, y: s.y + dy }))
})

const merge = (...boxes: readonly Box[]): Omit<Box, "left" | "right" | "height"> => ({
  shapes: boxes.flatMap((b) => b.shapes),
  edges: boxes.flatMap((b) => b.edges),
  labels: boxes.flatMap((b) => b.labels),
  slots: boxes.flatMap((b) => b.slots)
})

const line = (points: readonly Point[], arrow = false): Edge => ({ points, arrow })

const SHAPE_OF: Readonly<Record<BlockKind, ShapeKind>> = {
  process: "process",
  input: "io",
  output: "io",
  if: "decision",
  while: "decision",
  doWhile: "decision",
  repeat: "loop"
}

/** What a block shows: Input and Output blocks get their verb, as in the textbook. */
const caption = (b: Block): string => {
  if (b.kind === "input") return `Введення ${b.text}`
  if (b.kind === "output") return `Виведення ${b.text}`
  if (b.kind === "repeat") return `Повторити ${b.text} раз`
  return b.text
}

const shapeOf = (id: string, kind: ShapeKind, text: string, block?: BlockKind): Shape => {
  const lines = wrap(text)
  const tw = textWidth(lines)
  const th = lines.length * LINE_H
  const size: Record<ShapeKind, [number, number]> = {
    terminal: [Math.max(110, tw + 40), 44],
    process: [Math.max(120, tw + 32), Math.max(48, th + 22)],
    io: [Math.max(130, tw + 56), Math.max(48, th + 22)],
    decision: [Math.max(130, tw * 1.5 + 40), Math.max(64, th * 1.6 + 30)],
    loop: [Math.max(140, tw + 56), Math.max(48, th + 22)]
  }
  const [w, h] = size[kind]
  return block === undefined ? { id, kind, x: 0, y: h / 2, w, h, lines } : { id, kind, block, x: 0, y: h / 2, w, h, lines }
}

const single = (s: Shape): Box => ({ ...EMPTY, left: s.w / 2, right: s.w / 2, height: s.h, shapes: [s] })

/** Blocks one under another, a "+" in every gap. */
const sequence = (blocks: readonly Block[], parent: string | undefined, branch: Branch): Box => {
  const slotAt = (index: number, y: number): SlotPoint => ({
    slot: parent === undefined ? { branch, index } : { parent, branch, index },
    x: 0,
    y
  })
  const boxes = blocks.map(blockBox)
  const arrowInto = (i: number): boolean => boxes[i] !== undefined && boxes[i]?.opensWithLine !== true
  let y = GAP
  let left = 0
  let right = 0
  const parts: Box[] = [{ ...EMPTY, edges: [line([[0, 0], [0, GAP]], arrowInto(0))], slots: [slotAt(0, GAP / 2)] }]
  boxes.forEach((box, i) => {
    parts.push(move(box, 0, y))
    left = Math.max(left, box.left)
    right = Math.max(right, box.right)
    y += box.height
    parts.push({ ...EMPTY, edges: [line([[0, y], [0, y + GAP]], arrowInto(i + 1))], slots: [slotAt(i + 1, y + GAP / 2)] })
    y += GAP
  })
  return { ...merge(...parts), left, right, height: y }
}

const ifBox = (b: IfBlock): Box => {
  const d = shapeOf(b.id, "decision", b.text, b.kind)
  const mid = d.h / 2
  const yes = sequence(b.yes, b.id, "yes")
  const no = sequence(b.no, b.id, "no")
  const xL = Math.min(-(BRANCH_GAP / 2 + yes.right), -d.w / 2)
  const xR = Math.max(BRANCH_GAP / 2 + no.left, d.w / 2)
  const bottom = mid + Math.max(yes.height, no.height)
  const parts = merge(single(d), move(yes, xL, mid), move(no, xR, mid))
  return {
    ...parts,
    edges: [
      ...parts.edges,
      line([[-d.w / 2, mid], [xL, mid]]),
      line([[d.w / 2, mid], [xR, mid]]),
      line([[xL, mid + yes.height], [xL, bottom], [xR, bottom], [xR, mid + no.height]])
    ],
    labels: [
      ...parts.labels,
      { text: "Так", x: -d.w / 2 - 4, y: mid - 6, anchor: "end" },
      { text: "Ні", x: d.w / 2 + 4, y: mid - 6, anchor: "start" }
    ],
    left: Math.max(d.w / 2, -xL + yes.left),
    right: Math.max(d.w / 2, xR + no.right),
    height: bottom
  }
}

/** Precondition and "repeat N": check on top, body below, back arrow on the left, exit on the right. */
const loopBox = (b: LoopBlock): Box => {
  const d = shapeOf(b.id, SHAPE_OF[b.kind], caption(b), b.kind)
  const body = move(sequence(b.body, b.id, "body"), 0, d.h)
  const end = d.h + body.height
  const xB = -(Math.max(body.left, d.w / 2) + LOOP_MARGIN)
  const xE = Math.max(body.right, d.w / 2) + LOOP_MARGIN
  const out = end + LOOP_EXIT
  const condition = b.kind === "while"
  return {
    ...merge(single(d), body),
    edges: [
      ...body.edges,
      line([[0, end], [xB, end], [xB, -JOIN], [0, -JOIN]], true),
      line([[d.w / 2, d.h / 2], [xE, d.h / 2], [xE, out], [0, out]], true)
    ],
    labels: [
      ...body.labels,
      ...(condition
        ? [
            { text: "Так", x: 6, y: d.h + 14, anchor: "start" } as const,
            { text: "Ні", x: d.w / 2 + 4, y: d.h / 2 - 6, anchor: "start" } as const
          ]
        : [])
    ],
    left: -xB,
    right: xE,
    height: out
  }
}

/** Postcondition: body first, then the check; Так goes back up, Ні goes on. */
const doWhileBox = (b: LoopBlock): Box => {
  const body = sequence(b.body, b.id, "body")
  const d = shapeOf(b.id, "decision", b.text, b.kind)
  const top = body.height
  const mid = top + d.h / 2
  const xB = -(Math.max(body.left, d.w / 2) + LOOP_MARGIN)
  return {
    ...merge(body, move(single(d), 0, top)),
    edges: [...body.edges, line([[-d.w / 2, mid], [xB, mid], [xB, JOIN], [0, JOIN]], true)],
    labels: [
      ...body.labels,
      { text: "Так", x: -d.w / 2 - 4, y: mid - 6, anchor: "end" },
      { text: "Ні", x: 6, y: top + d.h + 14, anchor: "start" }
    ],
    left: -xB,
    right: Math.max(body.right, d.w / 2),
    height: top + d.h,
    opensWithLine: true
  }
}

const blockBox = (b: Block): Box => {
  switch (b.kind) {
    case "if": return ifBox(b)
    case "while":
    case "repeat": return loopBox(b)
    case "doWhile": return doWhileBox(b)
    default: return single(shapeOf(b.id, SHAPE_OF[b.kind], caption(b), b.kind))
  }
}

export const START_ID = "$start"
export const END_ID = "$end"

export const layout = (program: Program): Layout => {
  const startShape = single(shapeOf(START_ID, "terminal", "Початок"))
  const main = sequence(program.blocks, undefined, "main")
  const endShape = single(shapeOf(END_ID, "terminal", "Кінець"))
  const endY = startShape.height + main.height
  const body = merge(startShape, move(main, 0, startShape.height), move(endShape, 0, endY))
  // The last gap of the main sequence points into Кінець, so it gets an arrow.
  const edges = body.edges.map((e) => {
    const last = e.points[e.points.length - 1]
    return e.points.length === 2 && last?.[0] === 0 && last[1] === endY ? { ...e, arrow: true } : e
  })
  const LABEL_W = 30
  const xs = [
    ...body.shapes.flatMap((s) => [s.x - s.w / 2, s.x + s.w / 2]),
    ...edges.flatMap((e) => e.points.map(([x]) => x)),
    ...body.labels.map((l) => (l.anchor === "end" ? l.x - LABEL_W : l.x + LABEL_W))
  ]
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(0, ...edges.flatMap((e) => e.points.map(([, y]) => y)))
  const placed = move({ ...EMPTY, ...body, edges }, PAD - minX, PAD - minY)
  return { ...placed, width: maxX - minX + 2 * PAD, height: endY + endShape.height - minY + 2 * PAD }
}
