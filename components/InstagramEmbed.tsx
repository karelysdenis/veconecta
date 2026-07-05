'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } }
  }
}

const EMBED_SCRIPT_SRC = 'https://www.instagram.com/embed.js'

export function InstagramEmbed({ url }: { url: string }) {
  useEffect(() => {
    function process() {
      window.instgrm?.Embeds.process()
    }

    if (window.instgrm) {
      process()
      return
    }

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${EMBED_SCRIPT_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', process)
      return () => existing.removeEventListener('load', process)
    }

    const script = document.createElement('script')
    script.src = EMBED_SCRIPT_SRC
    script.async = true
    script.onload = process
    document.body.appendChild(script)
  }, [url])

  return (
    <blockquote
      className="instagram-media"
      data-instgrm-permalink={url}
      data-instgrm-version="14"
      style={{ background: '#FFF', border: 0, borderRadius: 3, margin: '0 auto', maxWidth: 540, width: '100%' }}
    />
  )
}
