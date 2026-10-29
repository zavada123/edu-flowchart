import { describe, expect, test } from "vitest"
import { allBlocks, findBlock, insertBlock, newBlock, removeBlock, setText } from "./edit.ts"
import type { Program } from "./types.ts"

const base: Program = {
  blocks: [
    { id: "a", kind: "process", text: "x = 1" },
    { id: "if", kind: "if", text: "x > 0", yes: [], no: [{ id: "n", kind: "output", text: "x" }] },
    { id: "w", kind: "while", text: "x < 5", body: [] }
  ]
}

describe("edit", () => {
  test("inserts into the main sequence, a branch and a loop body", () => {
    let p = insertBlock(base, { branch: "main", index: 0 }, newBlock("input", "x", "i"))
    p = insertBlock(p, { parent: "if", branch: "yes", index: 0 }, newBlock("process", "y = 1", "y"))
    p = insertBlock(p, { parent: "w", branch: "body", index: 0 }, newBlock("process", "x = x + 1", "b"))
    expect(allBlocks(p.blocks).map((b) => b.id)).toEqual(["i", "a", "if", "y", "n", "w", "b"])
  })

  test("never mutates the program", () => {
    const copy = structuredClone(base)
    insertBlock(base, { parent: "if", branch: "no", index: 1 }, newBlock("process"))
    setText(base, "n", "y")
    removeBlock(base, "if")
    expect(base).toEqual(copy)
  })

  test("sets text and removes a block with its contents", () => {
    expect(findBlock(setText(base, "n", "x, y"), "n")?.text).toBe("x, y")
    expect(allBlocks(removeBlock(base, "if").blocks).map((b) => b.id)).toEqual(["a", "w"])
  })

  test("new blocks get unique ids and empty branches", () => {
    const a = newBlock("if")
    const b = newBlock("if")
    expect(a.id).not.toBe(b.id)
    expect(a).toMatchObject({ kind: "if", text: "", yes: [], no: [] })
  })
})
