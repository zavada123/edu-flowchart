import { describe, expect, test } from "vitest"
import { evaluate, formatValue, isQuestion, parseAssignment, parseCondition, parseExpr, parseInputValue, parseList, parseNames } from "./expr.ts"

const calc = (text: string, vars = {}) => evaluate(parseExpr(text), vars)

describe("parseExpr and evaluate", () => {
  test("follows school precedence", () => {
    expect(calc("2 + 3 * 4")).toBe(14)
    expect(calc("(2 + 3) * 4")).toBe(20)
    expect(calc("-2 ** 2")).toBe(-4)
    expect(calc("2 ** 3 ** 2")).toBe(512)
  })

  test("understands textbook and Python notation", () => {
    expect(calc("S : 3", { S: 33 })).toBe(11)
    expect(calc("7 × 6")).toBe(42)
    expect(calc("345 // 10")).toBe(34)
    expect(calc("7 mod 3")).toBe(1)
    expect(calc("-7 % 3")).toBe(2)
    expect(calc("sqrt(16) + abs(-2) + max(1, 5, 3)")).toBe(11)
  })

  test("single = and words are comparisons and logic in conditions", () => {
    expect(calc("a = 0", { a: 0 })).toBe(true)
    expect(calc("a ≥ 5 і a ≤ 10", { a: 7 })).toBe(true)
    expect(calc("не (a > 5) або a = 9", { a: 9 })).toBe(true)
    expect(calc("x > 0 and y > 0", { x: 1, y: -1 })).toBe(false)
  })

  test("works with Cyrillic names and quoted text", () => {
    expect(calc("ціна + 5", { ціна: 10 })).toBe(15)
    expect(calc('"Сума: " + s', { s: 5 })).toBe("Сума: 5")
    expect(calc("«так»")).toBe("так")
  })

  test("explains mistakes in Ukrainian", () => {
    expect(() => calc("a + ")).toThrow("Вираз обірвано")
    expect(() => calc("(a + 1")).toThrow("дужку")
    expect(() => calc("a", {})).toThrow("Змінна «a» ще не має значення")
    expect(() => calc("1 / 0")).toThrow("Ділення на нуль")
    expect(() => calc("0 < x < 10", { x: 1 })).toThrow("Подвійне порівняння")
    expect(() => calc('"а" * 2')).toThrow("працює з числами")
    expect(() => calc("foo(1)")).toThrow("Невідома функція")
  })
})

describe("block texts", () => {
  test("assignment in three notations", () => {
    for (const text of ["S = a + b", "S := a + b", "S ← a + b"]) {
      expect(parseAssignment(text)?.target).toBe("S")
    }
    expect(parseAssignment("Підійди до яблуні")).toBeUndefined()
    expect(parseAssignment("a == b")).toBeUndefined()
  })

  test("conditions may end with a question mark", () => {
    expect(evaluate(parseCondition("x < 10?"), { x: 3 })).toBe(true)
  })

  test("questions in words are told apart from expressions", () => {
    expect(isQuestion("Є квитки?")).toBe(true)
    expect(isQuestion("Іде дощ")).toBe(true)
    expect(isQuestion("a > 5?")).toBe(false)
    expect(isQuestion("a і b")).toBe(false)
    expect(isQuestion("готово")).toBe(false)
  })

  test("input names and output lists", () => {
    expect(parseNames("a, b,c")).toEqual(["a", "b", "c"])
    expect(() => parseNames("a, 2b")).toThrow("не може бути іменем")
    expect(parseList('"Середнє:", Sr')).toHaveLength(2)
  })
})

describe("values", () => {
  test("format numbers without float noise", () => {
    expect(formatValue(11)).toBe("11")
    expect(formatValue(0.1 + 0.2)).toBe("0.3")
    expect(formatValue(2 / 3)).toBe("0.666667")
    expect(formatValue(true)).toBe("так")
  })

  test("read what the student typed", () => {
    expect(parseInputValue("2,5")).toBe(2.5)
    expect(parseInputValue(" -4 ")).toBe(-4)
    expect(parseInputValue("так")).toBe(true)
    expect(parseInputValue("Оля")).toBe("Оля")
  })
})
