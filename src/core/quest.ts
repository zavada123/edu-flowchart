import { checkBuild, checkTrace, type BuildTask, type Task, type TraceTask } from "./check.ts"
import type { Program } from "./types.ts"

/** Who speaks a story line: the rover that guides the student, the narrator, or the mission control radio. */
export type Speaker = "rover" | "narrator" | "radio"

export interface StoryLine {
  readonly speaker: Speaker
  readonly text: string
}

/** One step of a quest: a story, then a usual flowchart task, then a new entry for the mission log. */
export interface QuestStep {
  readonly id: string
  /** The story before the task. */
  readonly story: readonly StoryLine[]
  /** The task itself. Its `id` is the step id, its `hint` is not used: the step has `hints`. */
  readonly task: BuildTask | TraceTask
  /** Hints from gentle to almost the answer. */
  readonly hints: readonly string[]
  /** A fact for the mission log, shown after the step is solved. */
  readonly clue: string
}

export interface QuestChapter {
  readonly id: string
  readonly title: string
  /** Topics of the chapter, for the teacher, e.g. "розгалуження". */
  readonly topics: string
  readonly steps: readonly QuestStep[]
}

/** A story told by flowchart tasks, like a detective case. */
export interface Quest {
  readonly id: string
  readonly title: string
  /** One paragraph for the quest card. */
  readonly summary: string
  /** Grades the quest is made for, e.g. "5–8". */
  readonly grades: string
  readonly chapters: readonly QuestChapter[]
  /** The story after the last step. */
  readonly ending: readonly StoryLine[]
}

/** Progress in a quest: what the host app saves and sends back to continue. */
export interface QuestProgress {
  readonly questId: string
  /** Ids of solved steps, in the order they were solved. */
  readonly solved: readonly string[]
  /** The student's flowchart of each build step: the accepted one for solved steps, a draft for the others. */
  readonly programs: Readonly<Record<string, Program>>
  /** The accepted answers of each solved trace step. */
  readonly answers: Readonly<Record<string, readonly string[]>>
  readonly hintsUsed: Readonly<Record<string, number>>
}

/** What the trainer reports to the host app after each solved step. */
export interface QuestReport {
  readonly questId: string
  readonly stepId: string
  readonly solvedSteps: number
  readonly totalSteps: number
  /** True when the whole quest is solved. */
  readonly finished: boolean
  /** From 0 to 1: each solved step gives 1, minus 0.25 per hint, but at least 0.5. */
  readonly score: number
  readonly progress: QuestProgress
}

const HINT_COST = 0.25
const MIN_STEP_SCORE = 0.5

export const allSteps = (quest: Quest): readonly QuestStep[] => quest.chapters.flatMap((ch) => ch.steps)

/** The tasks of a quest, for a server that grades tasks one by one. */
export const questTasks = (quest: Quest): readonly Task[] => allSteps(quest).map((s) => s.task)

export const emptyProgress = (quest: Quest): QuestProgress => ({ questId: quest.id, solved: [], programs: {}, answers: {}, hintsUsed: {} })

/** The first step that is not solved yet, or undefined when the quest is solved. */
export const currentStep = (quest: Quest, progress: QuestProgress): QuestStep | undefined =>
  allSteps(quest).find((s) => !progress.solved.includes(s.id))

/** A solved step with the flowchart or the answers that solved it. */
export const markSolved = (progress: QuestProgress, step: QuestStep, solution: Program | readonly string[]): QuestProgress => {
  const solved = progress.solved.includes(step.id) ? progress.solved : [...progress.solved, step.id]
  return Array.isArray(solution)
    ? { ...progress, solved, answers: { ...progress.answers, [step.id]: solution } }
    : { ...progress, solved, programs: { ...progress.programs, [step.id]: solution as Program } }
}

const stepScore = (progress: QuestProgress, id: string): number =>
  progress.solved.includes(id) ? Math.max(MIN_STEP_SCORE, 1 - HINT_COST * (progress.hintsUsed[id] ?? 0)) : 0

export const questScore = (quest: Quest, progress: QuestProgress): number => {
  const steps = allSteps(quest)
  return steps.length === 0 ? 0 : steps.reduce((sum, s) => sum + stepScore(progress, s.id), 0) / steps.length
}

export const makeReport = (quest: Quest, progress: QuestProgress, stepId: string): QuestReport => {
  const total = allSteps(quest).length
  const solvedSteps = allSteps(quest).filter((s) => progress.solved.includes(s.id)).length
  return {
    questId: quest.id,
    stepId,
    solvedSteps,
    totalSteps: total,
    finished: total > 0 && solvedSteps === total,
    score: questScore(quest, progress),
    progress
  }
}

/** Checks one step again with what the progress keeps for it. */
const recheck = (step: QuestStep, progress: QuestProgress): boolean => {
  if (step.task.mode === "trace") return checkTrace(step.task, progress.answers[step.id] ?? []).passed
  return checkBuild(step.task, progress.programs[step.id] ?? { blocks: [] }).passed
}

/**
 * The server does not trust the browser: it runs every saved flowchart and answer again.
 * Returns the progress with only the steps that really pass.
 */
export const checkQuest = (quest: Quest, progress: QuestProgress): QuestProgress => {
  if (progress.questId !== quest.id) return emptyProgress(quest)
  const steps = allSteps(quest)
  const solved = progress.solved.filter((id) => {
    const step = steps.find((s) => s.id === id)
    return step !== undefined && recheck(step, progress)
  })
  return { ...progress, solved }
}
