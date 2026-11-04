import { describe, expect, test } from "vitest"
import { decodeShare, encodeShare, MAX_SHARE_CODE } from "./share.ts"
import type { Block, Program } from "./types.ts"

/** Ids are new after decoding; compare the rest. */
const shape = (blocks: readonly Block[]): unknown =>
  blocks.map((b) =>
    b.kind === "if" ? [b.kind, b.text, shape(b.yes), shape(b.no)] : "body" in b ? [b.kind, b.text, shape(b.body)] : [b.kind, b.text]
  )

const chart: Program = {
  blocks: [
    { id: "1", kind: "input", text: "n" },
    { id: "2", kind: "if", text: "n > 0?", yes: [{ id: "3", kind: "output", text: '"Додатне"' }], no: [] },
    { id: "4", kind: "repeat", text: "3", body: [{ id: "5", kind: "process", text: "Підстрибни 🐸" }] },
    { id: "6", kind: "while", text: "n < 10", body: [{ id: "7", kind: "doWhile", text: "n < 5", body: [] }] }
  ]
}

describe("share links", () => {
  test("a chart comes back the same, with Ukrainian text and emoji", () => {
    const code = encodeShare({ title: "Моя схема", program: chart })
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/)
    const back = decodeShare(code)
    expect(back?.title).toBe("Моя схема")
    expect(shape(back?.program.blocks ?? [])).toEqual(shape(chart.blocks))
  })

  test("an empty chart is fine", () => {
    expect(decodeShare(encodeShare({ title: "", program: { blocks: [] } }))).toEqual({ title: "", program: { blocks: [] } })
  })

  test("broken codes give undefined", () => {
    expect(decodeShare("")).toBeUndefined()
    expect(decodeShare("не код")).toBeUndefined()
    expect(decodeShare("abc")).toBeUndefined()
    expect(decodeShare(btoa(JSON.stringify({ v: 1, t: "x", b: [["z", "?"]] })).replace(/=+$/, ""))).toBeUndefined()
    expect(decodeShare(btoa(JSON.stringify({ v: 2, t: "x", b: [] })).replace(/=+$/, ""))).toBeUndefined()
    expect(decodeShare("a".repeat(MAX_SHARE_CODE + 1))).toBeUndefined()
  })
})
