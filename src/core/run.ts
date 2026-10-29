import { allBlocks } from "./edit.ts"
import {
  evaluate,
  ExprError,
  formatValue,
  isQuestion,
  parseAssignment,
  parseCondition,
  parseList,
  parseNames,
  questionText,
  type Expr,
  type Vars
} from "./expr.ts"
import type { Block, Inputs, Issue, Program, Value } from "./types.ts"

/** Where the run goes after the last block. */
export const END = "$end"

/** A block ready to run: parsed once, with its exits as flowchart arrows. */
type Step =
  | { readonly op: "nothing"; readonly next: string }
  | { readonly op: "assign"; readonly target: string; readonly expr: Expr; readonly next: string }
  | { readonly op: "input"; readonly names: readonly string[]; readonly next: string }
  | { readonly op: "output"; readonly exprs: readonly Expr[]; readonly next: string }
  | { readonly op: "test"; readonly cond: Condition; readonly yes: string; readonly no: string }
  | { readonly op: "count"; readonly count: Expr; readonly body: string; readonly next: string }

type Condition = { readonly question: string } | { readonly expr: Expr }

export interface Compiled {
  readonly first: string
  readonly steps: ReadonlyMap<string, Step>
}

const MAX_STEPS = 5000

export interface RunState {
  /** Block to run next, or END. */
  readonly at: string
  readonly vars: Vars
  /** One line per Output block run. */
  readonly output: readonly (readonly Value[])[]
  /** How many values of each array input have been read. */
  readonly read: Readonly<Record<string, number>>
  /** Repeats left for each running "repeat N" loop. */
  readonly left: Readonly<Record<string, number>>
  readonly steps: number
  /** "ask": waiting for the student to answer a question condition with answer(). */
  readonly status: "running" | "ask" | "done" | "error"
  readonly question?: string
  readonly error?: Issue
}

const issueOf = (blockId: string, e: unknown): Issue => ({
  blockId,
  message: e instanceof ExprError ? e.message : String(e)
})

const EMPTY_TEXT: Readonly<Record<Block["kind"], string>> = {
  process: "Напиши дію",
  input: "Напиши, які змінні ввести",
  output: "Напиши, що вивести",
  if: "Напиши умову",
  while: "Напиши умову",
  doWhile: "Напиши умову",
  repeat: "Напиши, скільки разів повторити"
}

const parseCond = (text: string): Condition => (isQuestion(text) ? { question: questionText(text) } : { expr: parseCondition(text) })

/** Parses one block; throws ExprError for the student. */
const stepOf = (b: Block, next: string, inner: (seq: readonly Block[], after: string) => string): Step => {
  if (b.text.trim() === "") throw new ExprError(EMPTY_TEXT[b.kind])
  switch (b.kind) {
    case "process": {
      const a = parseAssignment(b.text)
      return a ? { op: "assign", ...a, next } : { op: "nothing", next }
    }
    case "input": return { op: "input", names: parseNames(b.text), next }
    case "output": return { op: "output", exprs: parseList(b.text), next }
    case "if": return { op: "test", cond: parseCond(b.text), yes: inner(b.yes, next), no: inner(b.no, next) }
    case "while": return { op: "test", cond: parseCond(b.text), yes: inner(b.body, b.id), no: next }
    case "doWhile": return { op: "test", cond: parseCond(b.text), yes: inner(b.body, b.id), no: next }
    case "repeat": return { op: "count", count: parseCondition(b.text.replace(/\s*раз(и|ів)?\s*$/u, "")), body: inner(b.body, b.id), next }
  }
}

/** Turns blocks into arrows; collects every problem instead of stopping at the first. */
export const compile = (program: Program): { readonly compiled?: Compiled; readonly issues: readonly Issue[] } => {
  const steps = new Map<string, Step>()
  const issues: Issue[] = []
  const seq = (blocks: readonly Block[], after: string): string =>
    blocks.reduceRight((next, b) => {
      try {
        steps.set(b.id, stepOf(b, next, seq))
      } catch (e) {
        issues.push(issueOf(b.id, e))
        // Still look inside, so every broken block is reported at once.
        if (b.kind === "if") [b.yes, b.no].forEach((s) => seq(s, next))
        else if ("body" in b) seq(b.body, b.id)
      }
      // A postcondition loop is entered at its body, the others at the block itself.
      return b.kind === "doWhile" && b.body.length > 0 ? seq(b.body, b.id) : b.id
    }, after)
  const first = seq(program.blocks, END)
  // seq() runs twice for doWhile bodies; keep each issue once, in drawing order.
  const order = allBlocks(program.blocks).map((b) => b.id)
  const unique = [...new Map(issues.map((i) => [i.blockId, i])).values()].sort((a, b) => order.indexOf(a.blockId) - order.indexOf(b.blockId))
  return unique.length > 0 ? { issues: unique } : { compiled: { first, steps }, issues: [] }
}

export const start = (compiled: Compiled): RunState => ({
  at: compiled.first,
  vars: {},
  output: [],
  read: {},
  left: {},
  steps: 0,
  status: compiled.first === END ? "done" : "running"
})

/** Next value of an input: a single value always, an array item by item. */
const readInput = (inputs: Inputs, name: string, read: Readonly<Record<string, number>>): Value | undefined => {
  const v = inputs[name]
  if (!Array.isArray(v)) return v as Value | undefined
  return v[read[name] ?? 0]
}

const moveTo = (s: RunState, at: string, patch: Partial<RunState> = {}): RunState => ({
  ...s,
  ...patch,
  at,
  steps: s.steps + 1,
  status: at === END ? "done" : "running"
})

const fail = (s: RunState, message: string): RunState => ({ ...s, status: "error", error: { blockId: s.at, message } })

/** Runs one block. Pure: returns a new state. */
export const step = (compiled: Compiled, s: RunState, inputs: Inputs = {}): RunState => {
  if (s.status !== "running") return s
  if (s.steps >= MAX_STEPS) return fail(s, `Виконано вже ${MAX_STEPS} кроків. Мабуть, цикл ніколи не закінчиться.`)
  const st = compiled.steps.get(s.at)
  if (!st) return fail(s, "Блок не знайдено")
  try {
    switch (st.op) {
      case "nothing": return moveTo(s, st.next)
      case "assign": return moveTo(s, st.next, { vars: { ...s.vars, [st.target]: evaluate(st.expr, s.vars) } })
      case "output": return moveTo(s, st.next, { output: [...s.output, st.exprs.map((e) => evaluate(e, s.vars))] })
      case "input": {
        const missing = st.names.find((n) => readInput(inputs, n, s.read) === undefined)
        if (missing !== undefined) return fail(s, `Немає вхідного значення для «${missing}»`)
        const vars = { ...s.vars }
        const read = { ...s.read }
        for (const n of st.names) {
          vars[n] = readInput(inputs, n, read) as Value
          read[n] = (read[n] ?? 0) + 1
        }
        return moveTo(s, st.next, { vars, read })
      }
      case "test": {
        if ("question" in st.cond) {
          const answer = readInput(inputs, st.cond.question, s.read)
          if (answer === undefined) return { ...s, status: "ask", question: st.cond.question }
          if (typeof answer !== "boolean") return fail(s, `На «${st.cond.question}?» відповідають так або ні`)
          const read = { ...s.read, [st.cond.question]: (s.read[st.cond.question] ?? 0) + 1 }
          return moveTo(s, answer ? st.yes : st.no, { read })
        }
        const v = evaluate(st.cond.expr, s.vars)
        if (typeof v !== "boolean") return fail(s, `Умова має давати так або ні, а дає ${formatValue(v)}`)
        return moveTo(s, v ? st.yes : st.no)
      }
      case "count": {
        const remaining = s.left[s.at] ?? evaluate(st.count, s.vars)
        if (typeof remaining !== "number" || !Number.isInteger(remaining) || remaining < 0) {
          return fail(s, "Кількість повторень має бути цілим числом від 0")
        }
        const { [s.at]: _, ...others } = s.left
        if (remaining === 0) return moveTo(s, st.next, { left: others })
        return moveTo(s, st.body, { left: { ...others, [s.at]: remaining - 1 } })
      }
    }
  } catch (e) {
    return { ...s, status: "error", error: issueOf(s.at, e) }
  }
}

/** The student's answer to the question the run is waiting on; the run goes on along Так or Ні. */
export const answer = (compiled: Compiled, s: RunState, yes: boolean): RunState => {
  const st = compiled.steps.get(s.at)
  if (s.status !== "ask" || st?.op !== "test") return s
  const { question: _, ...rest } = s
  return moveTo(rest, yes ? st.yes : st.no)
}

/** Runs to the end, an error, or a question nobody answered (inputs have no answer for it). */
export const runAll = (compiled: Compiled, inputs: Inputs = {}): RunState => {
  let s = start(compiled)
  while (s.status === "running") s = step(compiled, s, inputs)
  return s
}
