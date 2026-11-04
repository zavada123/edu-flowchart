import { newId } from "./edit.ts"
import type { Block, BlockKind, Program } from "./types.ts"

/**
 * A free flowchart as a short text for a link (`…#fc=<code>`): no server, the chart lives in the link itself.
 * The code is base64url of compact JSON: `{ v: 1, t: title, b: blocks }`, each block `[kind, text, ...branches]`.
 */
export interface SharedChart {
  readonly title: string
  readonly program: Program
}

const VERSION = 1
/** Longer codes are refused: a link stays usable and a broken paste cannot hang the page. */
export const MAX_SHARE_CODE = 12000
const MAX_TITLE = 80
const MAX_TEXT = 200
const MAX_BLOCKS = 200

const CODES: Readonly<Record<BlockKind, string>> = { process: "p", input: "i", output: "o", if: "f", while: "w", doWhile: "d", repeat: "r" }
const KINDS: Readonly<Record<string, BlockKind>> = Object.fromEntries(Object.entries(CODES).map(([k, c]) => [c, k as BlockKind]))

type Compact = readonly unknown[]

const pack = (b: Block): Compact => {
  if (b.kind === "if") return [CODES.if, b.text, b.yes.map(pack), b.no.map(pack)]
  if ("body" in b) return [CODES[b.kind], b.text, b.body.map(pack)]
  return [CODES[b.kind], b.text]
}

const toBase64Url = (text: string): string => {
  const bytes = new TextEncoder().encode(text)
  let bin = ""
  bytes.forEach((x) => {
    bin += String.fromCharCode(x)
  })
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

const fromBase64Url = (code: string): string => {
  const b64 = code.replace(/-/g, "+").replace(/_/g, "/")
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4))
  return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}

export const encodeShare = (chart: SharedChart): string =>
  toBase64Url(JSON.stringify({ v: VERSION, t: chart.title.slice(0, MAX_TITLE), b: chart.program.blocks.map(pack) }))

class BadCode extends Error {}

/** Builds blocks back with new ids; throws BadCode on anything unexpected. */
const unpack = (raw: unknown, count: { n: number }): Block => {
  if (!Array.isArray(raw) || typeof raw[0] !== "string" || typeof raw[1] !== "string") throw new BadCode()
  const kind = KINDS[raw[0]]
  if (kind === undefined || raw[1].length > MAX_TEXT) throw new BadCode()
  count.n += 1
  if (count.n > MAX_BLOCKS) throw new BadCode()
  const seq = (x: unknown): Block[] => {
    if (!Array.isArray(x)) throw new BadCode()
    return x.map((y) => unpack(y, count))
  }
  const id = newId()
  if (kind === "if") return { id, kind, text: raw[1], yes: seq(raw[2]), no: seq(raw[3]) }
  if (kind === "while" || kind === "doWhile" || kind === "repeat") return { id, kind, text: raw[1], body: seq(raw[2]) }
  return { id, kind, text: raw[1] }
}

/** The chart of a shared link, or undefined when the code is broken or too long. */
export const decodeShare = (code: string): SharedChart | undefined => {
  if (code.length === 0 || code.length > MAX_SHARE_CODE || !/^[A-Za-z0-9_-]+$/.test(code)) return undefined
  try {
    const data: unknown = JSON.parse(fromBase64Url(code))
    if (typeof data !== "object" || data === null) return undefined
    const { v, t, b } = data as { v?: unknown; t?: unknown; b?: unknown }
    if (v !== VERSION || typeof t !== "string" || !Array.isArray(b)) return undefined
    const count = { n: 0 }
    return { title: t.slice(0, MAX_TITLE), program: { blocks: b.map((x) => unpack(x, count)) } }
  } catch {
    return undefined
  }
}
