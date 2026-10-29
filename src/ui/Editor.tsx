import { useEffect, useRef } from "react"
import type { Block, BlockKind } from "../core/index.ts"

export const KIND_NAMES: Readonly<Record<BlockKind, string>> = {
  process: "Дія",
  input: "Введення",
  output: "Виведення",
  if: "Розгалуження",
  while: "Цикл з передумовою",
  doWhile: "Цикл з післяумовою",
  repeat: "Повторити N разів"
}

const KIND_HINTS: Readonly<Record<BlockKind, string>> = {
  process: "Обчислення, наприклад S = a + b, або дія словами",
  input: "Які змінні ввести",
  output: "Що вивести",
  if: "Якщо умова виконується, то одне, інакше інше",
  while: "Поки умова виконується, повторювати",
  doWhile: "Повторювати, поки умова виконується; перевірка після дій",
  repeat: "Повторити дії задану кількість разів"
}

const FIELD: Readonly<Record<BlockKind, { readonly label: string; readonly placeholder: string }>> = {
  process: { label: "Дія", placeholder: "S = a + b + c" },
  input: { label: "Змінні через кому", placeholder: "a, b, c" },
  output: { label: "Що вивести (через кому)", placeholder: '"Середнє:", Sr' },
  if: { label: "Умова", placeholder: "a > 5" },
  while: { label: "Умова: поки вона виконується, цикл триває", placeholder: "x < 10" },
  doWhile: { label: "Умова: поки вона виконується, цикл триває", placeholder: "x < 10" },
  repeat: { label: "Скільки разів", placeholder: "4" }
}

export const ALL_KINDS: readonly BlockKind[] = ["process", "input", "output", "if", "while", "doWhile", "repeat"]

interface PaletteProps {
  readonly kinds: readonly BlockKind[]
  readonly onPick: (kind: BlockKind) => void
  readonly onCancel: () => void
}

/** Which block to add at the chosen "+". */
export const Palette = ({ kinds, onPick, onCancel }: PaletteProps) => (
  <section className="edu-fc-panel" aria-label="Новий блок">
    <p className="edu-fc-panel-title">Який блок додати?</p>
    <div className="edu-fc-palette">
      {kinds.map((k) => (
        <button key={k} type="button" className={`edu-fc-pick edu-fc-pick-${k}`} onClick={() => onPick(k)}>
          <b>{KIND_NAMES[k]}</b>
          <small>{KIND_HINTS[k]}</small>
        </button>
      ))}
    </div>
    <button type="button" className="edu-fc-link" onClick={onCancel}>
      Скасувати
    </button>
  </section>
)

interface EditorProps {
  readonly block: Block
  readonly problem?: string | undefined
  readonly onText: (text: string) => void
  readonly onDelete: () => void
  readonly onClose: () => void
}

/** Text of the selected block. */
export const BlockEditor = ({ block, problem, onText, onDelete, onClose }: EditorProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => inputRef.current?.focus({ preventScroll: true }), [block.id])
  const field = FIELD[block.kind]
  const inner = block.kind === "if" ? block.yes.length + block.no.length : "body" in block ? block.body.length : 0
  return (
    <section className="edu-fc-panel" aria-label="Блок">
      <label className="edu-fc-field">
        <span>
          {KIND_NAMES[block.kind]}: {field.label.toLowerCase()}
        </span>
        <input
          ref={inputRef}
          value={block.text}
          placeholder={field.placeholder}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          onChange={(e) => onText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onClose()}
        />
      </label>
      {problem !== undefined && block.text.trim() !== "" && <p className="edu-fc-problem">{problem}</p>}
      <div className="edu-fc-row">
        <button type="button" className="edu-fc-button edu-fc-primary" onClick={onClose}>
          Готово
        </button>
        <button type="button" className="edu-fc-button edu-fc-danger" onClick={onDelete}>
          {inner > 0 ? "Видалити разом із вкладеними" : "Видалити"}
        </button>
      </div>
    </section>
  )
}
