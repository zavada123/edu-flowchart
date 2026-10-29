import type { Value } from "./types.ts"

/**
 * Expressions in blocks: school notation, no eval.
 * `a + b`, `S : 3`, `x // 10`, `a mod 2`, `a ≥ 5`, `a = 0` (equality in conditions),
 * `x > 0 і y > 0`, `не (a > b)`, `sqrt(x)`, `"Відповідь:"`.
 */
export type Expr =
  | { readonly type: "lit"; readonly value: Value }
  | { readonly type: "var"; readonly name: string }
  | { readonly type: "un"; readonly op: "-" | "not"; readonly arg: Expr }
  | { readonly type: "bin"; readonly op: BinOp; readonly left: Expr; readonly right: Expr }
  | { readonly type: "call"; readonly name: FnName; readonly args: readonly Expr[] }

type BinOp = "+" | "-" | "*" | "/" | "//" | "%" | "**" | "<" | ">" | "<=" | ">=" | "==" | "!=" | "and" | "or"

/** Error with a message for the student. */
export class ExprError extends Error {}

type Token =
  | { readonly t: "num"; readonly v: number }
  | { readonly t: "str"; readonly v: string }
  | { readonly t: "id"; readonly v: string }
  | { readonly t: "op"; readonly v: string }

const IDENT = /^[\p{L}_][\p{L}\p{N}_]*/u
const NUMBER = /^\d+(\.\d+)?/
/** Longest first, so `//` wins over `/`. */
const OPERATORS = ["**", "//", "<=", ">=", "==", "!=", "<>", ":=", "&&", "||", "+", "-", "−", "*", "×", "·", "/", ":", "%", "^", "<", ">", "=", "≤", "≥", "≠", "(", ")", ",", "!"]
const QUOTES: Readonly<Record<string, string>> = { '"': '"', "'": "'", "«": "»", "“": "”" }

/** Words with their operator: Ukrainian and English, as in textbooks and Python. */
const WORD_OPS: Readonly<Record<string, string>> = {
  and: "and", і: "and", й: "and", or: "or", або: "or", not: "not", не: "not", mod: "%", div: "//"
}
const SYMBOL_OPS: Readonly<Record<string, string>> = {
  "−": "-", "×": "*", "·": "*", ":": "/", "^": "**", "=": "==", "<>": "!=", "≠": "!=", "≤": "<=", "≥": ">=", "&&": "and", "||": "or", "!": "not"
}
const CONSTANTS: Readonly<Record<string, Value>> = { True: true, False: false, true: true, false: false, істина: true, хибність: false }

const FUNCTIONS = {
  abs: [1, 1],
  sqrt: [1, 1],
  round: [1, 2],
  int: [1, 1],
  min: [1, Infinity],
  max: [1, Infinity]
} as const
type FnName = keyof typeof FUNCTIONS

const isFn = (name: string): name is FnName => Object.hasOwn(FUNCTIONS, name)

export const tokenize = (text: string): Token[] => {
  const tokens: Token[] = []
  let rest = text
  while (rest.length > 0) {
    const space = /^\s+/.exec(rest)
    if (space) {
      rest = rest.slice(space[0].length)
      continue
    }
    const first = rest[0] ?? ""
    const close = QUOTES[first]
    if (close !== undefined) {
      const end = rest.indexOf(close, 1)
      if (end < 0) throw new ExprError("Не закрито лапки")
      tokens.push({ t: "str", v: rest.slice(1, end) })
      rest = rest.slice(end + 1)
      continue
    }
    const num = NUMBER.exec(rest)
    if (num) {
      tokens.push({ t: "num", v: Number(num[0]) })
      rest = rest.slice(num[0].length)
      continue
    }
    const id = IDENT.exec(rest)
    if (id) {
      const word = WORD_OPS[id[0]]
      tokens.push(word === undefined ? { t: "id", v: id[0] } : { t: "op", v: word })
      rest = rest.slice(id[0].length)
      continue
    }
    const op = OPERATORS.find((o) => rest.startsWith(o))
    if (op === undefined) throw new ExprError(`Незрозумілий знак «${first}»`)
    tokens.push({ t: "op", v: SYMBOL_OPS[op] ?? op })
    rest = rest.slice(op.length)
  }
  return tokens
}

const COMPARISONS = new Set(["<", ">", "<=", ">=", "==", "!="])

/** Recursive descent: or < and < not < comparison < + - < * / // % < unary - < ** < primary. */
class Parser {
  private pos = 0
  constructor(private readonly tokens: readonly Token[]) {}

  parseAll(): Expr[] {
    if (this.tokens.length === 0) throw new ExprError("Порожній вираз")
    const list = [this.or()]
    while (this.eat(",")) list.push(this.or())
    const extra = this.tokens[this.pos]
    if (extra !== undefined) throw new ExprError(`Зайве «${extra.v}»`)
    return list
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos]
  }

  private eat(op: string): boolean {
    const t = this.peek()
    if (t?.t !== "op" || t.v !== op) return false
    this.pos += 1
    return true
  }

  private binary(next: () => Expr, ops: readonly string[]): Expr {
    let left = next()
    for (;;) {
      const t = this.peek()
      if (t?.t !== "op" || !ops.includes(t.v)) return left
      this.pos += 1
      left = { type: "bin", op: t.v as BinOp, left, right: next() }
    }
  }

  private or = (): Expr => this.binary(this.and, ["or"])
  private and = (): Expr => this.binary(this.not, ["and"])

  private not = (): Expr => (this.eat("not") ? { type: "un", op: "not", arg: this.not() } : this.comparison())

  private comparison = (): Expr => {
    const left = this.additive()
    const t = this.peek()
    if (t?.t !== "op" || !COMPARISONS.has(t.v)) return left
    this.pos += 1
    const right = this.additive()
    const after = this.peek()
    if (after?.t === "op" && COMPARISONS.has(after.v)) {
      throw new ExprError("Подвійне порівняння: запиши дві умови через «і», наприклад x > 0 і x < 10")
    }
    return { type: "bin", op: t.v as BinOp, left, right }
  }

  private additive = (): Expr => this.binary(this.multiplicative, ["+", "-"])
  private multiplicative = (): Expr => this.binary(this.unary, ["*", "/", "//", "%"])

  private unary = (): Expr => (this.eat("-") ? { type: "un", op: "-", arg: this.unary() } : this.power())

  private power = (): Expr => {
    const base = this.primary()
    // Right-associative, and binds tighter than unary minus on its left: -2 ** 2 = -4.
    return this.eat("**") ? { type: "bin", op: "**", left: base, right: this.unary() } : base
  }

  private primary = (): Expr => {
    const t = this.peek()
    if (t === undefined) throw new ExprError("Вираз обірвано")
    this.pos += 1
    if (t.t === "num" || t.t === "str") return { type: "lit", value: t.v }
    if (t.t === "id") {
      const constant = CONSTANTS[t.v]
      if (constant !== undefined) return { type: "lit", value: constant }
      if (this.eat("(")) return this.call(t.v)
      return { type: "var", name: t.v }
    }
    if (t.v === "(") {
      const inner = this.or()
      if (!this.eat(")")) throw new ExprError("Не закрито дужку")
      return inner
    }
    throw new ExprError(`Тут не може бути «${t.v}»`)
  }

  private call(name: string): Expr {
    if (!isFn(name)) throw new ExprError(`Невідома функція «${name}»`)
    const args: Expr[] = []
    if (!this.eat(")")) {
      args.push(this.or())
      while (this.eat(",")) args.push(this.or())
      if (!this.eat(")")) throw new ExprError("Не закрито дужку")
    }
    const [min, max] = FUNCTIONS[name]
    if (args.length < min || args.length > max) throw new ExprError(`Функція ${name} має інше число аргументів`)
    return { type: "call", name, args }
  }
}

/** One expression. */
export const parseExpr = (text: string): Expr => {
  const list = new Parser(tokenize(text)).parseAll()
  if (list.length !== 1 || list[0] === undefined) throw new ExprError("Тут потрібен один вираз, без ком")
  return list[0]
}

/** Comma-separated expressions, as in an Output block: `"Сума:", s`. */
export const parseList = (text: string): Expr[] => new Parser(tokenize(text)).parseAll()

/** A condition may end with "?" as in textbooks: `a > 5?`. */
export const parseCondition = (text: string): Expr => parseExpr(questionText(text))

/** The condition text without the trailing "?": the key for a question's answers in Inputs. */
export const questionText = (text: string): string => text.trim().replace(/\?$/, "").trim()

const CYRILLIC_WORD = /^[\p{Script=Cyrillic}'’ʼ-]{2,}$/u

/**
 * A condition in words, like "Є квитки?" or "Іде дощ?": the student answers it while the
 * flowchart runs. Several words, only letters, and at least one Ukrainian word that is not
 * "і", "або", "не" (so `a і b` stays an expression).
 */
export const isQuestion = (text: string): boolean => {
  const words = questionText(text).split(/\s+/)
  if (words.length < 2 || !words.every((w) => /^[\p{L}'’ʼ-]+$/u.test(w))) return false
  return words.some((w) => CYRILLIC_WORD.test(w) && WORD_OPS[w] === undefined)
}

export const isIdentifier = (name: string): boolean => {
  const m = IDENT.exec(name)
  return m !== null && m[0] === name && WORD_OPS[name] === undefined && CONSTANTS[name] === undefined && !isFn(name)
}

const ASSIGNMENT = /^\s*([\p{L}_][\p{L}\p{N}_]*)\s*(?::=|=|←|<-)(?!=)\s*(.*)$/su

/** `S = a + b`, `S := a + b`, `S ← a + b`. Undefined when the text is not an assignment. */
export const parseAssignment = (text: string): { readonly target: string; readonly expr: Expr } | undefined => {
  const m = ASSIGNMENT.exec(text)
  if (!m) return undefined
  const target = m[1] ?? ""
  if (!isIdentifier(target)) throw new ExprError(`«${target}» не може бути іменем змінної`)
  return { target, expr: parseExpr(m[2] ?? "") }
}

/** Variable names of an Input block: `a, b, c`. */
export const parseNames = (text: string): string[] => {
  const names = text.split(",").map((s) => s.trim())
  if (names.length === 0 || names.some((n) => n === "")) throw new ExprError("Перелічи змінні через кому, наприклад a, b, c")
  const bad = names.find((n) => !isIdentifier(n))
  if (bad !== undefined) throw new ExprError(`«${bad}» не може бути іменем змінної`)
  return names
}

export type Vars = Readonly<Record<string, Value>>

const describe = (v: Value): string => (typeof v === "string" ? "текст" : typeof v === "boolean" ? "так/ні" : "число")

const num = (v: Value, op: string): number => {
  if (typeof v !== "number") throw new ExprError(`«${op}» працює з числами, а тут ${describe(v)}`)
  return v
}

const bool = (v: Value, op: string): boolean => {
  if (typeof v !== "boolean") throw new ExprError(`«${op}» поєднує умови, а тут ${describe(v)}`)
  return v
}

const finite = (n: number): number => {
  if (!Number.isFinite(n)) throw new ExprError("Результат не є числом")
  return n
}

const div = (a: number, b: number): number => {
  if (b === 0) throw new ExprError("Ділення на нуль")
  return a / b
}

const OP_NAMES: Readonly<Record<string, string>> = { and: "і", or: "або", not: "не" }

const arith = (op: BinOp, a: Value, b: Value): Value => {
  const name = OP_NAMES[op] ?? op
  if (op === "+") {
    if (typeof a === "string" || typeof b === "string") return formatValue(a) + formatValue(b)
    return num(a, name) + num(b, name)
  }
  const x = num(a, name)
  const y = num(b, name)
  switch (op) {
    case "-": return x - y
    case "*": return x * y
    case "/": return div(x, y)
    case "//": return Math.floor(div(x, y))
    case "%": return x - y * Math.floor(div(x, y))
    case "**": return finite(x ** y)
    case "<": return x < y
    case ">": return x > y
    case "<=": return x <= y
    case ">=": return x >= y
    default: throw new ExprError(`Невідома дія «${op}»`)
  }
}

const equal = (a: Value, b: Value): boolean =>
  typeof a === "number" && typeof b === "number" ? Math.abs(a - b) < 1e-9 : a === b

const callFn = (name: FnName, args: readonly Value[]): number => {
  const nums = args.map((a) => num(a, name))
  const [x = 0, y = 0] = nums
  switch (name) {
    case "abs": return Math.abs(x)
    case "sqrt":
      if (x < 0) throw new ExprError("Корінь з від'ємного числа")
      return Math.sqrt(x)
    case "round": return Math.round(x * 10 ** y) / 10 ** y
    case "int": return Math.trunc(x)
    case "min": return Math.min(...nums)
    case "max": return Math.max(...nums)
  }
}

export const evaluate = (e: Expr, vars: Vars): Value => {
  switch (e.type) {
    case "lit": return e.value
    case "var": {
      const v = vars[e.name]
      if (v === undefined) throw new ExprError(`Змінна «${e.name}» ще не має значення`)
      return v
    }
    case "un": {
      const v = evaluate(e.arg, vars)
      return e.op === "-" ? -num(v, "-") : !bool(v, "не")
    }
    case "call": return callFn(e.name, e.args.map((a) => evaluate(a, vars)))
    case "bin": {
      if (e.op === "and") return bool(evaluate(e.left, vars), "і") && bool(evaluate(e.right, vars), "і")
      if (e.op === "or") return bool(evaluate(e.left, vars), "або") || bool(evaluate(e.right, vars), "або")
      const a = evaluate(e.left, vars)
      const b = evaluate(e.right, vars)
      if (e.op === "==") return equal(a, b)
      if (e.op === "!=") return !equal(a, b)
      return arith(e.op, a, b)
    }
  }
}

const DIGITS = 6

/** 11 → "11", 2/3 → "0.666667", true → "так". */
export const formatValue = (v: Value): string => {
  if (typeof v === "boolean") return v ? "так" : "ні"
  if (typeof v === "string") return v
  if (Number.isInteger(v)) return String(v)
  return String(Number(v.toFixed(DIGITS)))
}

/** What the student types into an input field: "2,5" → 2.5, "так" → true, anything else is text. */
export const parseInputValue = (text: string): Value => {
  const t = text.trim()
  if (/^-?\d+([.,]\d+)?$/.test(t)) return Number(t.replace(",", "."))
  if (t === "так" || t === "True") return true
  if (t === "ні" || t === "False") return false
  return t
}
