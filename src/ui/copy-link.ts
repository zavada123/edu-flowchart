/** What happened to a share link: it is in the clipboard, or the page must show it to copy by hand. */
export type CopiedLink = { readonly kind: "copied"; readonly url: string } | { readonly kind: "show"; readonly url: string }

/** The part of `navigator.clipboard` that the copy needs. */
export interface LinkClipboard {
  readonly write?: ((items: ClipboardItem[]) => Promise<void>) | undefined
  readonly writeText: (text: string) => Promise<void>
}

/**
 * Copies a link that can come later (a short link from the server). Safari allows the clipboard only during the
 * click, so a link that is not ready goes to the clipboard as a `ClipboardItem` with a promise. When the clipboard
 * refuses, the link is still returned: the page shows it to copy by hand.
 */
export const copyLink = async (link: string | Promise<string>, clipboard: LinkClipboard | undefined): Promise<CopiedLink> => {
  if (typeof link !== "string" && clipboard?.write !== undefined && typeof ClipboardItem !== "undefined") {
    const blob = link.then((url) => new Blob([url], { type: "text/plain" }))
    try {
      await clipboard.write([new ClipboardItem({ "text/plain": blob })])
      return { kind: "copied", url: await link }
    } catch {
      return { kind: "show", url: await link }
    }
  }
  const url = await link
  try {
    if (clipboard === undefined) return { kind: "show", url }
    await clipboard.writeText(url)
    return { kind: "copied", url }
  } catch {
    return { kind: "show", url }
  }
}
