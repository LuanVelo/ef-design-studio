import type { HTMLAttributes } from 'react'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** Borda hairline para quando o card está sobre superfície branca */
  bordered?: boolean
  /** Hover de elevação sutil (+2px, sombra maior) */
  interactive?: boolean
}

export function Card({ bordered, interactive, className = '', ...props }: CardProps) {
  return (
    <div
      className={`rounded-(--radius-card) bg-card shadow-(--shadow-soft) ${
        bordered ? 'border border-hairline' : ''
      } ${
        interactive
          ? 'transition-[transform,box-shadow] duration-150 ease-(--ease-out-app) hover:-translate-y-0.5 hover:shadow-(--shadow-lift)'
          : ''
      } ${className}`}
      {...props}
    />
  )
}
