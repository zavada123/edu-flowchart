import { describe, expect, test } from "vitest"
import { checkBuild, checkTrace, sameValue, type BuildTask, type TraceTask } from "./check.ts"
import { tasks } from "./tasks.ts"
import type { Block, Program } from "./types.ts"

const act = (id: string, text: string): Block => ({ id, kind: "process", text })
const inp = (id: string, text: string): Block => ({ id, kind: "input", text })
const out = (id: string, text: string): Block => ({ id, kind: "output", text })
const p = (...blocks: Block[]): Program => ({ blocks })

/** Reference solutions stay in the tests, not in the bundle the student downloads. */
const SOLUTIONS: Readonly<Record<string, Program>> = {
  "inf5-average": p(inp("1", "a, b, c"), act("2", "S = a + b + c"), act("3", "Sr = S : 3"), out("4", "Sr")),
  "inf5-triangle": p(inp("1", "a, b"), act("2", "S = a * b / 2"), out("3", "S")),
  "inf5-book": p(inp("1", "p, n"), { id: "2", kind: "if", text: "p <= n?", yes: [out("3", '"Книжка і сувенір."')], no: [out("4", "«книжка»")] }),
  "inf4-mushrooms": p(
    inp("1", "x, y"),
    act("2", "s = x + y"),
    { id: "3", kind: "if", text: "s > 7", yes: [act("4", "s = s - 5")], no: [act("5", "s = s - 1")] },
    out("6", "s")
  ),
  "inf8-sum5": p(act("1", "a = 7"), act("2", "p = 0"), { id: "3", kind: "repeat", text: "5", body: [act("4", "p = p + a"), act("5", "a = a + 3")] }, out("6", "p")),
  "inf8-product": p(
    inp("1", "n"),
    act("2", "d = 1"),
    act("3", "i = 1"),
    { id: "4", kind: "while", text: "i <= n", body: [act("5", "d = d * i"), act("6", "i = i + 1")] },
    out("7", "d")
  ),
  "inf8-digits": p(
    inp("1", "x"),
    act("2", "k = 0"),
    { id: "3", kind: "doWhile", text: "x > 0", body: [act("4", "x = x // 10"), act("5", "k = k + 1")] },
    out("6", "k")
  )
}

const buildTasks = tasks.filter((t): t is BuildTask => t.mode === "build" && t.tests.length > 0)
const traceTasks = tasks.filter((t): t is TraceTask => t.mode === "trace")

describe("tasks", () => {
  test("ids are unique", () => {
    expect(new Set(tasks.map((t) => t.id)).size).toBe(tasks.length)
  })

  test.each(buildTasks.map((t) => [t.id, t] as const))("%s: the reference solution passes", (id, task) => {
    const solution = SOLUTIONS[id]
    expect(solution, `no reference solution for ${id}`).toBeDefined()
    const report = checkBuild(task, solution as Program)
    expect(report.issues).toEqual([])
    expect(report.tests.filter((t) => !t.passed)).toEqual([])
    expect(report).toMatchObject({ passed: true, score: 1 })
  })

  test.each(traceTasks.map((t) => [t.id, t] as const))("%s: the given flowchart runs", (_, task) => {
    expect(checkTrace(task, []).tests).toHaveLength(task.questions.length)
  })
})

describe("checkBuild", () => {
  const task = tasks.find((t) => t.id === "inf8-product") as BuildTask

  test("counts passed tests", () => {
    // Off by one: multiplies up to n - 1.
    const wrong = p(inp("1", "n"), act("2", "d = 1"), act("3", "i = 1"), { id: "4", kind: "while", text: "i < n", body: [act("5", "d = d * i"), act("6", "i = i + 1")] }, out("7", "d"))
    const r = checkBuild(task, wrong)
    expect(r.passed).toBe(false)
    expect(r.score).toBeCloseTo(1 / 3)
    expect(r.tests[0]).toMatchObject({ passed: false, expected: [24], actual: [6] })
  })

  test("a required loop is missing", () => {
    const r = checkBuild(task, p(inp("1", "n"), out("2", "24")))
    expect(r.issues).toEqual([{ blockId: "", message: "У цій задачі потрібен цикл" }])
    expect(r.score).toBe(0)
  })

  test("broken blocks give no tests and score 0", () => {
    const r = checkBuild(task, p(act("1", "d = ")))
    expect(r.tests).toEqual([])
    expect(r.issues[0]?.blockId).toBe("1")
    expect(r.score).toBe(0)
  })

  test("run errors are reported per test", () => {
    const r = checkBuild(task, p(act("1", "d = n"), { id: "w", kind: "while", text: "i < 1", body: [] }, out("2", "d")))
    expect(r.tests[0]?.error?.message).toContain("«n»")
  })
})

describe("checkTrace", () => {
  const task = tasks.find((t) => t.id === "inf5-trace-loop") as TraceTask

  test("compares answers with the real run", () => {
    const r = checkTrace(task, ["10", "10", "10"])
    expect(r.tests.map((t) => t.passed)).toEqual([true, true, false])
    expect(r.tests[2]?.expected).toEqual([11])
    expect(r.score).toBeCloseTo(2 / 3)
  })

  test("an empty answer is wrong", () => {
    expect(checkTrace(task, ["10", "", "11"]).tests[1]?.passed).toBe(false)
  })
})

describe("sameValue", () => {
  test("numbers with tolerance, text without case and end punctuation", () => {
    expect(sameValue(0.1 + 0.2, 0.3)).toBe(true)
    expect(sameValue("11", 11)).toBe(true)
    expect(sameValue("Книжка.", "книжка")).toBe(true)
    expect(sameValue("книжка", "книжка і сувенір")).toBe(false)
    expect(sameValue(true, true)).toBe(true)
  })
})
