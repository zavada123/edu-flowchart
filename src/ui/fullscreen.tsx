import { useCallback, useEffect, useState } from "react"

/** While the trainer covers the page, the page under it does not scroll. */
const PAGE_CLASS = "edu-fc-page-full"

/**
 * Full screen for the trainer: the browser's full screen of the page where it works, and the trainer covers the
 * page (a fixed layer), so it works on an iPhone too. Esc or the button leaves it.
 */
export const useFullScreen = () => {
  const [full, setFull] = useState(false)

  const leave = useCallback(() => {
    setFull(false)
    if (typeof document !== "undefined" && document.fullscreenElement) void document.exitFullscreen().catch(() => undefined)
  }, [])

  const enter = useCallback(() => {
    setFull(true)
    const page = document.documentElement
    if (typeof page.requestFullscreen === "function" && !document.fullscreenElement) void page.requestFullscreen().catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!full) return undefined
    const page = document.documentElement
    page.classList.add(PAGE_CLASS)
    // The browser left its full screen (Esc, a gesture): the trainer stops covering the page too.
    const onChange = () => {
      if (!document.fullscreenElement) setFull(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && leave()
    document.addEventListener("fullscreenchange", onChange)
    document.addEventListener("keydown", onKey)
    return () => {
      page.classList.remove(PAGE_CLASS)
      document.removeEventListener("fullscreenchange", onChange)
      document.removeEventListener("keydown", onKey)
    }
  }, [full, leave])

  // Leaving the page (another task opens) ends the full screen.
  useEffect(() => () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined)
  }, [])

  return { full, toggle: full ? leave : enter }
}

const ExpandIcon = ({ full }: { readonly full: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {full ? <path d="M8 3v5H3M12 3v5h5M8 17v-5H3M12 17v-5h5" /> : <path d="M3 8V3h5M17 8V3h-5M3 12v5h5M17 12v5h-5" />}
  </svg>
)

/** The button that opens and closes the full screen. */
export const FullScreenButton = ({ full, onToggle, className }: { readonly full: boolean; readonly onToggle: () => void; readonly className: string }) => (
  <button type="button" className={className} onClick={onToggle} aria-pressed={full} title={full ? "Вийти з повного екрана (Esc)" : "На весь екран"}>
    <ExpandIcon full={full} />
    <span>{full ? "Згорнути" : "На весь екран"}</span>
  </button>
)
