import { useState } from "react"

interface SmartImageProps {
  src?: string | null
  alt: string
  className?: string
}

export function SmartImage({ src, alt, className = "" }: SmartImageProps) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div
        aria-hidden
        className={"flex items-center justify-center bg-muted font-extrabold text-muted-foreground/40 " + className}
      >
        {alt.slice(0, 2).toUpperCase()}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
    />
  )
}