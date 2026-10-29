import { allBlocks } from "./edit.ts"
import { formatValue, parseInputValue } from "./expr.ts"
import { compile, runAll, type Compiled } from "./run.ts"
import { isLoop, type Block, type Inputs, type Issue, type Program, type Value } from "./types.ts"

/** One run of the student's flowchart: given inputs, what it must output. */
export interface TestCase {
  readonly inputs?: Inputs
  /** All values the Output blocks print, in order. */
  readonly output?: readonly Value[]
  /** Variable values at the end. */
  readonly vars?: Readonly<Record<string, Value>>
}

/** A structure the flowchart must contain, for tasks like "use a loop". */
export type Requirement = "if" | "loop"

/** "Складіть блок-схему": the student builds the flowchart, the tests check it. */
export interface BuildTask {
  readonly id: string
  readonly mode: "build"
  readonly title: string
  readonly text: string
  readonly hint?: string
  /** Blocks on the palette; all when omitted. */
  readonly blocks?: readonly Block["kind"][]
  readonly require?: readonly Requirement[]
  /** What the student starts from; empty when omitted. */
  readonly start?: Program
  readonly tests: readonly TestCase[]
}

/** One question about a given flowchart: "Яким буде c, якщо b = 4?". */
export interface TraceQuestion {
  readonly inputs: Inputs
  readonly ask: string
}

/** "Знайдіть значення c після виконання": the flowchart is given, the student predicts. */
export interface TraceTask {
  readonly id: string
  readonly mode: "trace"
  readonly title: string
  readonly text: string
  readonly hint?: string
  readonly program: Program
  readonly questions: readonly TraceQuestion[]
}

export type Task = BuildTask | TraceTask

export interface TestResult {
  readonly inputs: Inputs
  readonly passed: boolean
  readonly expected: readonly Value[]
  readonly actual: readonly Value[]
  readonly error?: Issue
}

/** What the host app gets after "Перевірити". The same function runs on the server. */
export interface Report {
  readonly taskId: string
  readonly mode: Task["mode"]
  readonly passed: boolean
  /** Share of passed tests or right answers, 0…1. */
  readonly score: number
  readonly tests: readonly TestResult[]
  /** Problems that stop the flowchart from running, or a missing required structure. */
  readonly issues: readonly Issue[]
  /** The student's flowchart (build) or answers (trace), to store with the grade. */
  readonly program?: Program
  readonly answers?: readonly string[]
}

const TOLERANCE = 1e-6

/** Text compares without case, extra spaces and end punctuation: "Книжка." equals "книжка". */
const normalize = (s: string): string =>
  s.toLocaleLowerCase("uk").replace(/[«»"'.!]/g, "").replace(/\s+/g, " ").trim()

export const sameValue = (actual: Value, expected: Value): boolean => {
  if (typeof expected === "number") {
    const a = typeof actual === "string" ? parseInputValue(actual) : actual
    return typeof a === "number" && Math.abs(a - expected) <= TOLERANCE * Math.max(1, Math.abs(expected))
  }
  if (typeof expected === "string") return normalize(formatValue(actual)) === normalize(expected)
  return actual === expected
}

const sameList = (actual: readonly Value[], expected: readonly Value[]): boolean =>
  actual.length === expected.length && expected.every((e, i) => sameValue(actual[i] as Value, e))

const REQUIREMENT_TEXT: Readonly<Record<Requirement, string>> = {
  if: "У цій задачі потрібне розгалуження",
  loop: "У цій задачі потрібен цикл"
}

const missingRequirements = (program: Program, require: readonly Requirement[]): Issue[] => {
  const blocks = allBlocks(program.blocks)
  return require
    .filter((r) => !blocks.some((b) => (r === "loop" ? isLoop(b) : b.kind === "if")))
    .map((r) => ({ blockId: "", message: REQUIREMENT_TEXT[r] }))
}

const runTest = (compiled: Compiled, test: TestCase): TestResult => {
  const inputs = test.inputs ?? {}
  const s = runAll(compiled, inputs)
  const expectedVars = Object.entries(test.vars ?? {})
  const expected = [...(test.output ?? []), ...expectedVars.map(([, v]) => v)]
  const outputs = s.output.flat()
  const actualVars = expectedVars.map(([k]) => s.vars[k] ?? "—")
  const actual = [...outputs, ...actualVars]
  const error: Issue | undefined =
    s.status === "error" ? s.error : s.status === "ask" ? { blockId: s.at, message: `Тест не відповідає на «${s.question}?»` } : undefined
  const passed =
    error === undefined &&
    (test.output === undefined || sameList(outputs, test.output)) &&
    expectedVars.every(([k, v]) => s.vars[k] !== undefined && sameValue(s.vars[k] as Value, v))
  return error ? { inputs, passed, expected, actual, error } : { inputs, passed, expected, actual }
}

export const checkBuild = (task: BuildTask, program: Program): Report => {
  const { compiled, issues } = compile(program)
  const allIssues = [...issues, ...missingRequirements(program, task.require ?? [])]
  const tests = compiled ? task.tests.map((t) => runTest(compiled, t)) : []
  const passedCount = tests.filter((t) => t.passed).length
  const score = allIssues.length > 0 || task.tests.length === 0 ? 0 : passedCount / task.tests.length
  return { taskId: task.id, mode: "build", passed: score === 1, score, tests, issues: allIssues, program }
}

/** The right answer to each question, from running the given flowchart. */
export const traceAnswers = (task: TraceTask): Value[] => {
  const { compiled, issues } = compile(task.program)
  if (!compiled) throw new Error(`Задача ${task.id}: ${issues.map((i) => i.message).join("; ")}`)
  return task.questions.map((q) => {
    const s = runAll(compiled, q.inputs)
    const v = s.vars[q.ask]
    if (s.status !== "done" || v === undefined) throw new Error(`Задача ${task.id}: немає значення ${q.ask}`)
    return v
  })
}

export const checkTrace = (task: TraceTask, answers: readonly string[]): Report => {
  const right = traceAnswers(task)
  const tests = task.questions.map((q, i): TestResult => {
    const given = answers[i]?.trim() ?? ""
    const expected = right[i] as Value
    const actual = given === "" ? [] : [parseInputValue(given)]
    return { inputs: q.inputs, passed: given !== "" && sameValue(parseInputValue(given), expected), expected: [expected], actual }
  })
  const score = tests.filter((t) => t.passed).length / Math.max(1, tests.length)
  return { taskId: task.id, mode: "trace", passed: score === 1, score, tests, issues: [], answers }
}
