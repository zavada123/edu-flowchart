import type { Block, BlockKind, Program } from "./types.ts"

/** Which sequence: the main one, a branch of an If, or a loop body. */
export type Branch = "main" | "yes" | "no" | "body"

/** A place between blocks where a new block goes ("+" on an arrow). */
export interface Slot {
  /** The If or loop that owns the sequence; undefined for the main sequence. */
  readonly parent?: string
  readonly branch: Branch
  readonly index: number
}

let counter = 0
/** Unique enough within one program; ids only link blocks to the picture and to issues. */
export const newId = (): string => {
  counter += 1
  return `b${Date.now().toString(36)}${counter.toString(36)}`
}

export const newBlock = (kind: BlockKind, text = "", id = newId()): Block => {
  if (kind === "if") return { id, kind, text, yes: [], no: [] }
  if (kind === "while" || kind === "doWhile" || kind === "repeat") return { id, kind, text, body: [] }
  return { id, kind, text }
}

type Seq = readonly Block[]

/** Applies f to the sequence at (parent, branch), returning new blocks; nothing is mutated. */
const mapSeq = (blocks: Seq, parent: string | undefined, branch: Branch, f: (s: Seq) => Seq): Seq => {
  if (parent === undefined) return branch === "main" ? f(blocks) : blocks
  return blocks.map((b) => {
    if (b.kind === "if") {
      if (b.id === parent && (branch === "yes" || branch === "no")) return { ...b, [branch]: f(b[branch]) }
      return { ...b, yes: mapSeq(b.yes, parent, branch, f), no: mapSeq(b.no, parent, branch, f) }
    }
    if (b.kind === "while" || b.kind === "doWhile" || b.kind === "repeat") {
      if (b.id === parent && branch === "body") return { ...b, body: f(b.body) }
      return { ...b, body: mapSeq(b.body, parent, branch, f) }
    }
    return b
  })
}

export const insertBlock = (program: Program, slot: Slot, block: Block): Program => ({
  blocks: mapSeq(program.blocks, slot.parent, slot.branch, (s) => [...s.slice(0, slot.index), block, ...s.slice(slot.index)])
})

const mapBlocks = (blocks: Seq, f: (b: Block) => Block | undefined): Seq =>
  blocks.flatMap((b) => {
    const inner: Block =
      b.kind === "if"
        ? { ...b, yes: mapBlocks(b.yes, f), no: mapBlocks(b.no, f) }
        : b.kind === "while" || b.kind === "doWhile" || b.kind === "repeat"
          ? { ...b, body: mapBlocks(b.body, f) }
          : b
    const out = f(inner)
    return out === undefined ? [] : [out]
  })

export const setText = (program: Program, id: string, text: string): Program => ({
  blocks: mapBlocks(program.blocks, (b) => (b.id === id ? { ...b, text } : b))
})

/** Removes the block with everything inside it. */
export const removeBlock = (program: Program, id: string): Program => ({
  blocks: mapBlocks(program.blocks, (b) => (b.id === id ? undefined : b))
})

/** All blocks, depth first, in drawing order. */
export const allBlocks = (blocks: Seq): Block[] =>
  blocks.flatMap((b) => [
    b,
    ...(b.kind === "if" ? [...allBlocks(b.yes), ...allBlocks(b.no)] : "body" in b ? allBlocks(b.body) : [])
  ])

export const findBlock = (program: Program, id: string): Block | undefined => allBlocks(program.blocks).find((b) => b.id === id)
