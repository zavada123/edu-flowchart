import { describe, expect, it } from "vitest"
import { copyLink } from "./copy-link.ts"

const refuse = () => Promise.reject(new Error("denied"))

describe("copyLink", () => {
  it("copies a ready link as text", async () => {
    const copied: string[] = []
    const result = await copyLink("https://x/s/abc", { writeText: async (t) => void copied.push(t) })
    expect(result).toEqual({ kind: "copied", url: "https://x/s/abc" })
    expect(copied).toEqual(["https://x/s/abc"])
  })

  it("waits for a link that comes later and copies it as text when there is no ClipboardItem", async () => {
    const copied: string[] = []
    const result = await copyLink(Promise.resolve("https://x/s/late"), { writeText: async (t) => void copied.push(t) })
    expect(result).toEqual({ kind: "copied", url: "https://x/s/late" })
    expect(copied).toEqual(["https://x/s/late"])
  })

  it("shows the link when the clipboard refuses", async () => {
    expect(await copyLink(Promise.resolve("https://x/s/no"), { writeText: refuse })).toEqual({ kind: "show", url: "https://x/s/no" })
  })

  it("shows the link when there is no clipboard", async () => {
    expect(await copyLink("https://x/s/none", undefined)).toEqual({ kind: "show", url: "https://x/s/none" })
  })
})
