'use client'

import { useState } from 'react'

export function FlagImage({
  src,
  flag,
  size,
  imgClassName = 'rounded-[2px] shrink-0 object-cover',
}: {
  src: string | null
  flag: string
  size: number
  imgClassName?: string
}) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <span className="leading-none shrink-0" style={{ fontSize: size }}>
        {flag}
      </span>
    )
  }

  return (
    <img
      src={src}
      width={size}
      height={Math.round(size * 0.67)}
      alt=""
      className={imgClassName}
      onError={() => setFailed(true)}
    />
  )
}
