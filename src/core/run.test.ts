import { describe, expect, test } from "vitest"
import { answer, compile, END, runAll, start, step, type Compiled, type RunState } from "./run.ts"
import type { Block, Program } from "./types.ts"

const p = (...blocks: Block[]): Program => ({ blocks })
const act = (id: string, text: string): Block => ({ id, kind: "process", text })

const compiled = (program: Program): Compiled => {
  const { compiled: c, issues } = compile(program)
  if (!c) throw new Error(issues.map((i) => i.message).join("; "))
  return c
}

describe("compile", () => {
  test("reports every broken block, in drawing order", () => {
    const { compiled: c, issues } = compile(
      p(act("a", "x = "), { id: "b", kind: "if", text: "", yes: [act("c", "y = (")], no: [] })
    )
    expect(c).toBeUndefined()
    expect(issues.map((i) => i.blockId)).toEqual(["a", "b", "c"])
    expect(issues[1]?.message).toBe("Напиши умову")
  })

  test("an empty program is done at once", () => {
    expect(start(compiled(p())).status).toBe("done")
  })
})

describe("run", () => {
  test("linear: average of three numbers (textbook 5, fig. 19.3)", () => {
    const c = compiled(
      p({ id: "i", kind: "input", text: "a, b, c" }, act("s", "S = a + b + c"), act("r", "Sr = S : 3"), { id: "o", kind: "output", text: "Sr" })
    )
    const s = runAll(c, { a: 12, b: 7, c: 14 })
    expect(s.status).toBe("done")
    expect(s.output).toEqual([[11]])
    expect(s.steps).toBe(4)
  })

  test("goes block by block and does not mutate the previous state", () => {
    const c = compiled(p(act("a", "x = 1"), act("b", "x = x + 1")))
    const s0 = start(c)
    const s1 = step(c, s0)
    const s2 = step(c, s1)
    expect([s0.at, s1.at, s2.at]).toEqual(["a", "b", END])
    expect(s0.vars).toEqual({})
    expect(s1.vars).toEqual({ x: 1 })
    expect(s2).toMatchObject({ status: "done", vars: { x: 2 } })
  })

  test("if takes the Так or the Ні branch", () => {
    const c = compiled(p({ id: "i", kind: "input", text: "b" }, { id: "if", kind: "if", text: "b > 6?", yes: [act("y", "c = 5")], no: [act("n", "c = 12")] }))
    expect(runAll(c, { b: 10 }).vars["c"]).toBe(5)
    expect(runAll(c, { b: 6 }).vars["c"]).toBe(12)
  })

  test("while checks first, doWhile runs the body at least once", () => {
    const pre = compiled(p({ id: "w", kind: "while", text: "x < 10", body: [act("b", "x = x + 1")] }))
    const post = compiled(p({ id: "w", kind: "doWhile", text: "x < 10", body: [act("b", "x = x + 1")] }))
    const run = (c: Compiled, x: number) => {
      let r: RunState = { ...start(c), vars: { x } }
      while (r.status === "running") r = step(c, r)
      return r.vars["x"]
    }
    expect([run(pre, 4), run(pre, 10)]).toEqual([10, 10])
    expect([run(post, 4), run(post, 10)]).toEqual([10, 11])
  })

  test("repeat N times, also nested", () => {
    const c = compiled(
      p(act("a", "k = 0"), {
        id: "outer",
        kind: "repeat",
        text: "3",
        body: [{ id: "inner", kind: "repeat", text: "4 рази", body: [act("b", "k = k + 1")] }]
      })
    )
    expect(runAll(c).vars["k"]).toBe(12)
  })

  test("reads array inputs one value per Input run", () => {
    const c = compiled(
      p(act("s", "s = 0"), {
        id: "r",
        kind: "repeat",
        text: "3",
        body: [{ id: "i", kind: "input", text: "x" }, act("a", "s = s + x")]
      })
    )
    expect(runAll(c, { x: [1, 2, 3] }).vars["s"]).toBe(6)
    expect(runAll(c, { x: [1] })).toMatchObject({ status: "error", error: { blockId: "i", message: "Немає вхідного значення для «x»" } })
  })

  test("stops an endless loop", () => {
    const s = runAll(compiled(p({ id: "w", kind: "while", text: "1 = 1", body: [act("a", "x = 1")] })))
    expect(s.status).toBe("error")
    expect(s.error?.message).toContain("цикл ніколи не закінчиться")
  })

  test("a non-boolean condition is an error on that block", () => {
    const s = runAll(compiled(p(act("a", "x = 5"), { id: "if", kind: "if", text: "x + 1", yes: [], no: [] })))
    expect(s.error).toEqual({ blockId: "if", message: "Умова має давати так або ні, а дає 6" })
  })

  test("a question waits for the student, or takes answers from inputs", () => {
    const c = compiled(p({ id: "w", kind: "while", text: "Є яблука?", body: [act("a", "Зірви яблуко")] }))
    const asked = runAll(c)
    expect(asked).toMatchObject({ status: "ask", question: "Є яблука", at: "w" })
    const picked = answer(c, asked, true)
    expect(picked.at).toBe("a")
    const again = step(c, step(c, picked))
    expect(answer(c, again, false).status).toBe("done")
    expect(runAll(c, { "Є яблука": [true, true, false] })).toMatchObject({ status: "done", steps: 5 })
  })
})
