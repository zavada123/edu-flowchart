import type { BuildTask, Task, TraceTask } from "./check.ts"
import type { Block, SimpleBlock } from "./types.ts"

const simple = (kind: SimpleBlock["kind"]) => (id: string, text: string): Block => ({ id, kind, text })
const act = simple("process")
const inp = simple("input")

/** Tasks from the textbooks (Бондаренко 5 кл., Корнієнко 4 кл., Ривкінд 8 кл.). */
export const tasks: readonly Task[] = [
  {
    id: "inf5-average",
    mode: "build",
    title: "Середнє арифметичне трьох чисел",
    text: "Складіть блок-схему алгоритму знаходження середнього арифметичного трьох чисел. Уведіть a, b, c і виведіть їхнє середнє.",
    hint: "Спершу знайдіть суму S = a + b + c, потім поділіть її на 3.",
    blocks: ["input", "process", "output"],
    tests: [
      { inputs: { a: 12, b: 7, c: 14 }, output: [11] },
      { inputs: { a: 3, b: 3, c: 3 }, output: [3] },
      { inputs: { a: 1, b: 2, c: 4 }, output: [7 / 3] },
      { inputs: { a: -6, b: 0, c: 3 }, output: [-1] }
    ]
  },
  {
    id: "inf5-triangle",
    mode: "build",
    title: "Площа прямокутного трикутника",
    text: "Складіть блок-схему алгоритму обчислення площі прямокутного трикутника. Уведіть довжини катетів a і b та виведіть площу S.",
    hint: "Площа прямокутного трикутника дорівнює половині добутку катетів.",
    blocks: ["input", "process", "output"],
    tests: [
      { inputs: { a: 3, b: 4 }, output: [6] },
      { inputs: { a: 5, b: 2 }, output: [5] },
      { inputs: { a: 1.5, b: 2 }, output: [1.5] }
    ]
  },
  {
    id: "inf5-book",
    mode: "build",
    title: "Книжка і сувенір",
    text: "Якщо ціна книжки не перевищує n гривень, купити цю книжку й сувенір, в іншому випадку купити тільки книжку. Уведіть ціну книжки p і суму n. Виведіть «книжка і сувенір» або «книжка».",
    hint: "«Не перевищує» означає «менша або дорівнює»: p <= n.",
    blocks: ["input", "process", "output", "if"],
    require: ["if"],
    tests: [
      { inputs: { p: 100, n: 150 }, output: ["книжка і сувенір"] },
      { inputs: { p: 150, n: 150 }, output: ["книжка і сувенір"] },
      { inputs: { p: 200, n: 150 }, output: ["книжка"] }
    ]
  },
  {
    id: "inf4-mushrooms",
    mode: "build",
    title: "Їжачок і гриби",
    text: "Їжачок зібрав x маслюків і y лисичок. Прибігла білочка: «Дай мені 5 грибів, якщо зібрав більше ніж 7, а якщо ні, то 1». Скільки грибів залишилося в їжачка? Уведіть x і y та виведіть відповідь.",
    hint: "Спершу порахуйте всі гриби: s = x + y.",
    blocks: ["input", "process", "output", "if"],
    require: ["if"],
    tests: [
      { inputs: { x: 3, y: 5 }, output: [3] },
      { inputs: { x: 2, y: 3 }, output: [4] },
      { inputs: { x: 4, y: 3 }, output: [6] }
    ]
  },
  {
    id: "inf5-trace-if",
    mode: "trace",
    title: "Значення c після розгалуження",
    text: "Знайдіть значення величини c після виконання алгоритму, якщо значення b дорівнює 4, 6, 10.",
    hint: "Спершу перевірте умову, потім виконайте одну з гілок.",
    program: {
      blocks: [
        inp("t1", "b"),
        { id: "t2", kind: "if", text: "b > 6?", yes: [act("t3", "c = 5")], no: [act("t4", "c = 12")] }
      ]
    },
    questions: [
      { inputs: { b: 4 }, ask: "c" },
      { inputs: { b: 6 }, ask: "c" },
      { inputs: { b: 10 }, ask: "c" }
    ]
  },
  {
    id: "inf5-trace-loop",
    mode: "trace",
    title: "Значення x після повторення",
    text: "Знайдіть значення величини x після виконання алгоритму, якщо початкове значення x дорівнює 4, 9, 10.",
    hint: "Тіло цього циклу виконується хоча б один раз, а умова перевіряється після нього.",
    program: {
      blocks: [inp("t1", "x"), { id: "t2", kind: "doWhile", text: "x < 10?", body: [act("t3", "x = x + 1")] }]
    },
    questions: [
      { inputs: { x: 4 }, ask: "x" },
      { inputs: { x: 9 }, ask: "x" },
      { inputs: { x: 10 }, ask: "x" }
    ]
  },
  {
    id: "inf8-sum5",
    mode: "build",
    title: "Сума п'яти чисел",
    text: "Складіть блок-схему алгоритму знаходження суми 5 чисел, перше з яких дорівнює 7, а кожне з чотирьох наступних на 3 більше за попереднє. Виведіть суму.",
    hint: "Потрібні дві змінні: a для поточного числа і p для суми. У циклі додайте a до p і збільшіть a на 3.",
    require: ["loop"],
    tests: [{ output: [65] }]
  },
  {
    id: "inf8-product",
    mode: "build",
    title: "Добуток 1 · 2 · … · n",
    text: "Складіть блок-схему алгоритму, який для введеного натурального n обчислює добуток 1 · 2 · 3 · … · n і виводить його.",
    hint: "Почніть з добутку d = 1 і лічильника i = 1. Поки i <= n, множте d на i і збільшуйте i на 1.",
    require: ["loop"],
    tests: [
      { inputs: { n: 4 }, output: [24] },
      { inputs: { n: 1 }, output: [1] },
      { inputs: { n: 6 }, output: [720] }
    ]
  },
  {
    id: "inf8-digits",
    mode: "build",
    title: "Скільки цифр у числі",
    text: "Складіть блок-схему алгоритму, який визначає, скільки цифр у натуральному числі x. Виведіть кількість цифр.",
    hint: "x // 10 відкидає останню цифру числа. Повторюйте це, поки x > 0, і рахуйте кроки.",
    require: ["loop"],
    tests: [
      { inputs: { x: 7 }, output: [1] },
      { inputs: { x: 345 }, output: [3] },
      { inputs: { x: 90 }, output: [2] },
      { inputs: { x: 1000 }, output: [4] }
    ]
  },
  {
    id: "inf5-apples",
    mode: "build",
    title: "Збирання яблук (пісочниця)",
    text: "Блок-схема збирання врожаю яблук. Запустіть її: на умову «Є яблука?» відповідатимете ви. Змініть алгоритм як хочете.",
    start: {
      blocks: [
        act("a1", "Підійди до яблуні"),
        { id: "a2", kind: "while", text: "Є яблука?", body: [act("a3", "Зірви яблуко та поклади до кошика")] },
        act("a4", "Відійди від яблуні")
      ]
    },
    tests: []
  }
] satisfies readonly (BuildTask | TraceTask)[]
