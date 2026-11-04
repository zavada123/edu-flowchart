import type { BlockKind } from "../core/index.ts"
import type { ReactNode } from "react"

/** Small line icons for the buttons. Original drawings, 20×20. */
const Svg = ({ children }: { readonly children: ReactNode }) => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)

export const PlayIcon = () => (
  <Svg>
    <path d="M6 4.5v11l9-5.5z" fill="currentColor" />
  </Svg>
)

export const PauseIcon = () => (
  <Svg>
    <path d="M7 4.5v11M13 4.5v11" />
  </Svg>
)

export const StepIcon = () => (
  <Svg>
    <path d="M4 4.5v11l7-5.5zM15 4.5v11" />
  </Svg>
)

export const StopIcon = () => (
  <Svg>
    <rect x="5" y="5" width="10" height="10" rx="2" fill="currentColor" />
  </Svg>
)

export const CheckIcon = () => (
  <Svg>
    <path d="M4 10.5l4 4 8-9" />
  </Svg>
)

export const BulbIcon = () => (
  <Svg>
    <path d="M7.5 15h5M8 17.5h4M10 2.5a5 5 0 0 0-3 9c.6.5 1 1.2 1 2h4c0-.8.4-1.5 1-2a5 5 0 0 0-3-9z" />
  </Svg>
)

export const TrashIcon = () => (
  <Svg>
    <path d="M4 6h12M8 6V4h4v2M6 6l1 10h6l1-10" />
  </Svg>
)

/** The block shape in miniature, for the palette. */
export const ShapeIcon = ({ kind }: { readonly kind: BlockKind }) => {
  const shape = (() => {
    switch (kind) {
      case "process": return <rect x="3" y="5" width="34" height="18" rx="4" />
      case "input":
      case "output": return <polygon points="9,5 37,5 31,23 3,23" />
      case "if": return <polygon points="20,2 38,14 20,26 2,14" />
      default: return <polygon points="9,4 31,4 37,14 31,24 9,24 3,14" />
    }
  })()
  return (
    <svg className={`edu-fc-shape-icon edu-fc-icon-${kind}`} width="40" height="28" viewBox="0 0 40 28" aria-hidden="true">
      {shape}
    </svg>
  )
}
