import { describe, expect, test } from "vitest"
import { checkBuild, traceAnswers, type BuildTask, type TraceTask } from "../check.ts"
import { allSteps } from "../quest.ts"
import type { Block, Program } from "../types.ts"
import { lostRover } from "./lost-rover.ts"

const act = (id: string, text: string): Block => ({ id, kind: "process", text })
const inp = (id: string, text: string): Block => ({ id, kind: "input", text })
const out = (id: string, text: string): Block => ({ id, kind: "output", text })
const p = (...blocks: Block[]): Program => ({ blocks })

/** Reference solutions stay in the tests, not in the bundle the student downloads. */
const SOLUTIONS: Readonly<Record<string, Program>> = {
  "rover-time": p(inp("1", "d, v"), act("2", "t = d / v"), out("3", "t")),
  "rover-battery": p(inp("1", "z, h"), act("2", "r = z - 9 * h"), out("3", "r")),
  "rover-frost": p(inp("1", "t"), { id: "2", kind: "if", text: "t < -60", yes: [out("3", '"обігрів"')], no: [out("4", '"рух"')] }),
  "rover-storm": p(inp("1", "v"), {
    id: "2",
    kind: "if",
    text: "v < 10",
    yes: [out("3", '"їхати"')],
    no: [{ id: "4", kind: "if", text: "v < 20", yes: [out("5", '"повільно"')], no: [out("6", '"сховатися"')] }]
  }),
  "rover-samples": p(inp("1", "n"), act("2", "s = 0"), { id: "3", kind: "repeat", text: "n", body: [inp("4", "m"), act("5", "s = s + m")] }, out("6", "s")),
  "rover-descent": p(inp("1", "h"), act("2", "k = 0"), { id: "3", kind: "while", text: "h > 0", body: [act("4", "h = h - 3"), act("5", "k = k + 1")] }, out("6", "k")),
  "rover-charge": p(inp("1", "z"), act("2", "k = 0"), { id: "3", kind: "while", text: "z < 100?", body: [act("4", "z = z + 15"), act("5", "k = k + 1")] }, out("6", "k"))
}

const steps = allSteps(lostRover)
const build = steps.map((s) => s.task).filter((t): t is BuildTask => t.mode === "build")
const trace = steps.map((s) => s.task).filter((t): t is TraceTask => t.mode === "trace")
const step = (id: string) => steps.find((s) => s.id === id)

describe("lost rover quest", () => {
  test("step ids are unique and equal their task ids", () => {
    expect(new Set(steps.map((s) => s.id)).size).toBe(steps.length)
    for (const s of steps) expect(s.task.id).toBe(s.id)
  })

  test("every step has hints and a clue", () => {
    for (const s of steps) {
      expect(s.hints.length).toBeGreaterThan(0)
      expect(s.clue.trim()).not.toBe("")
    }
  })

  test.each(build.map((t) => [t.id, t] as const))("%s: the reference solution passes", (id, task) => {
    const report = checkBuild(task, SOLUTIONS[id] as Program)
    expect(report.issues).toEqual([])
    expect(report.tests.filter((t) => !t.passed)).toEqual([])
    expect(report.passed).toBe(true)
  })

  test("the buggy start of the charge step fails, so there is something to fix", () => {
    const task = step("rover-charge")?.task as BuildTask
    expect(task.start).toBeDefined()
    expect(checkBuild(task, task.start as Program).passed).toBe(false)
  })

  test.each(trace.map((t) => [t.id, t] as const))("%s: the given flowchart runs", (_, task) => {
    expect(traceAnswers(task)).toHaveLength(task.questions.length)
  })

  test("the clues tell the same numbers as the flowcharts", () => {
    expect(traceAnswers(step("rover-decode")?.task as TraceTask)).toEqual([7, 13, 17])
    expect(traceAnswers(step("rover-route")?.task as TraceTask)).toEqual([3, 1, 2])
    expect(traceAnswers(step("rover-search")?.task as TraceTask)).toEqual([96, 56, 52])
  })
})
