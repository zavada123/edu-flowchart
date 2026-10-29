/** A value a flowchart works with. */
export type Value = number | string | boolean

/** Blocks with one text line and one way out. */
export type SimpleKind = "process" | "input" | "output"
/** Loops: precondition, postcondition, and "repeat N times". */
export type LoopKind = "while" | "doWhile" | "repeat"
export type BlockKind = SimpleKind | "if" | LoopKind

/**
 * "Дія" (process) is either an assignment like `S = a + b` or free text like
 * "Підійди до яблуні", which does nothing when run (everyday algorithms of grades 3–5).
 */
export interface SimpleBlock {
  readonly id: string
  readonly kind: SimpleKind
  readonly text: string
}

export interface IfBlock {
  readonly id: string
  readonly kind: "if"
  /** Condition, e.g. `a > 5` or `a > 5?`. */
  readonly text: string
  readonly yes: readonly Block[]
  readonly no: readonly Block[]
}

export interface LoopBlock {
  readonly id: string
  readonly kind: LoopKind
  /** Condition for while/doWhile (repeat while true), count for repeat. */
  readonly text: string
  readonly body: readonly Block[]
}

export type Block = SimpleBlock | IfBlock | LoopBlock

/** Start and End are implicit: a program is the sequence between them. */
export interface Program {
  readonly blocks: readonly Block[]
}

/** Input values by variable name. An array is read one item per Input block run. */
export type Inputs = Readonly<Record<string, Value | readonly Value[]>>

/** A problem in a block, shown next to it. */
export interface Issue {
  readonly blockId: string
  readonly message: string
}

export const isLoop = (b: Block): b is LoopBlock => b.kind === "while" || b.kind === "doWhile" || b.kind === "repeat"
