import { describe, expect, test } from "vitest"
import { allSteps, checkQuest, currentStep, emptyProgress, makeReport, markSolved, type QuestProgress } from "./quest.ts"
import { lostRover } from "./quests/lost-rover.ts"
import type { Program } from "./types.ts"

const steps = allSteps(lostRover)
const first = steps[0]
const second = steps[1]
if (!first || !second) throw new Error("the quest needs two steps")

const timeSolution: Program = {
  blocks: [
    { id: "1", kind: "input", text: "d, v" },
    { id: "2", kind: "process", text: "t = d / v" },
    { id: "3", kind: "output", text: "t" }
  ]
}

describe("quest progress", () => {
  test("starts at the first step", () => {
    expect(currentStep(lostRover, emptyProgress(lostRover))?.id).toBe(first.id)
  })

  test("a solved step moves to the next one and keeps the answers", () => {
    const next = markSolved(emptyProgress(lostRover), first, ["7", "13", "17"])
    expect(next.solved).toEqual([first.id])
    expect(next.answers[first.id]).toEqual(["7", "13", "17"])
    expect(currentStep(lostRover, next)?.id).toBe(second.id)
  })

  test("solving a step twice does not count it twice", () => {
    const once = markSolved(emptyProgress(lostRover), first, ["7", "13", "17"])
    expect(markSolved(once, first, ["7", "13", "17"]).solved).toEqual([first.id])
  })

  test("the score takes 0.25 per hint, but at least 0.5 per step", () => {
    const solved = markSolved(emptyProgress(lostRover), first, ["7", "13", "17"])
    const total = steps.length
    expect(makeReport(lostRover, solved, first.id).score).toBeCloseTo(1 / total)
    expect(makeReport(lostRover, { ...solved, hintsUsed: { [first.id]: 1 } }, first.id).score).toBeCloseTo(0.75 / total)
    expect(makeReport(lostRover, { ...solved, hintsUsed: { [first.id]: 5 } }, first.id).score).toBeCloseTo(0.5 / total)
  })

  test("the report says when the quest is finished", () => {
    const all: QuestProgress = { ...emptyProgress(lostRover), solved: steps.map((s) => s.id) }
    expect(makeReport(lostRover, all, "x")).toMatchObject({ finished: true, solvedSteps: total(), totalSteps: total() })
  })
})

const total = () => steps.length

describe("checkQuest", () => {
  test("keeps steps whose saved flowchart and answers pass", () => {
    const progress = markSolved(markSolved(emptyProgress(lostRover), first, ["7", "13", "17"]), second, timeSolution)
    expect(checkQuest(lostRover, progress).solved).toEqual([first.id, second.id])
  })

  test("drops steps the browser marked solved without a passing solution", () => {
    const forged: QuestProgress = { ...emptyProgress(lostRover), solved: [first.id, second.id, "no-such-step"], answers: { [first.id]: ["1", "2", "3"] } }
    expect(checkQuest(lostRover, forged).solved).toEqual([])
  })

  test("progress of another quest starts over", () => {
    expect(checkQuest(lostRover, { ...emptyProgress(lostRover), questId: "other", solved: [first.id] }).solved).toEqual([])
  })
})
