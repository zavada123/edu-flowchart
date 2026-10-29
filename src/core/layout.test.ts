import { describe, expect, test } from "vitest"
import { allBlocks } from "./edit.ts"
import { END_ID, GAP, layout, START_ID, wrap, type Shape } from "./layout.ts"
import { tasks } from "./tasks.ts"
import type { Program } from "./types.ts"

const overlap = (a: Shape, b: Shape): boolean =>
  Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2

const nested: Program = {
  blocks: [
    { id: "i", kind: "input", text: "x" },
    {
      id: "if",
      kind: "if",
      text: "x > 0",
      yes: [{ id: "w", kind: "while", text: "x > 10", body: [{ id: "a", kind: "process", text: "x = x - 10" }] }],
      no: [{ id: "d", kind: "doWhile", text: "x < 0", body: [{ id: "b", kind: "process", text: "x = x + 1" }] }]
    },
    { id: "r", kind: "repeat", text: "3", body: [{ id: "o", kind: "output", text: "x" }] }
  ]
}

describe("layout", () => {
  test("draws Початок, every block and Кінець, top to bottom", () => {
    const l = layout(nested)
    const ids = l.shapes.map((s) => s.id)
    expect(ids).toEqual(expect.arrayContaining([START_ID, END_ID, ...allBlocks(nested.blocks).map((b) => b.id)]))
    const start = l.shapes.find((s) => s.id === START_ID) as Shape
    const end = l.shapes.find((s) => s.id === END_ID) as Shape
    expect(start.y).toBeLessThan(end.y)
  })

  test("Так goes left, Ні goes right", () => {
    const l = layout(nested)
    const at = (id: string) => l.shapes.find((s) => s.id === id) as Shape
    expect(at("w").x).toBeLessThan(at("if").x)
    expect(at("d").x).toBeGreaterThan(at("if").x)
  })

  test("no shapes overlap and everything is inside the picture", () => {
    for (const program of [nested, ...tasks.flatMap((t) => (t.mode === "trace" ? [t.program] : t.start ? [t.start] : []))]) {
      const l = layout(program)
      l.shapes.forEach((a, i) => l.shapes.slice(i + 1).forEach((b) => expect(overlap(a, b), `${a.id} and ${b.id}`).toBe(false)))
      for (const s of l.shapes) {
        expect(s.x - s.w / 2).toBeGreaterThanOrEqual(0)
        expect(s.x + s.w / 2).toBeLessThanOrEqual(l.width)
        expect(s.y + s.h / 2).toBeLessThanOrEqual(l.height)
      }
    }
  })

  test("has a + in every gap: one per block plus one per sequence", () => {
    const l = layout(nested)
    // 8 blocks; sequences: main, yes, no, 3 loop bodies.
    expect(l.slots).toHaveLength(8 + 6)
    const empty = layout({ blocks: [] })
    expect(empty.slots).toEqual([{ slot: { branch: "main", index: 0 }, x: expect.any(Number), y: expect.any(Number) }])
    expect(empty.height).toBeGreaterThan(GAP)
  })

  test("wraps long text into lines", () => {
    expect(wrap("Зірви яблуко та поклади до кошика")).toEqual(["Зірви яблуко та поклади до", "кошика"])
    expect(wrap("")).toEqual(["…"])
  })
})
