import type { ButtonHTMLAttributes } from 'react'

type PillButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost'
}

const styles = {
  primary: 'bg-ink text-white hover:bg-black',
  ghost: 'border border-ink/15 text-ink hover:bg-ink/5',
}

export function PillButton({ variant = 'primary', className = '', ...props }: PillButtonProps) {
  return (
    <button
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors duration-150 ease-(--ease-out-app) disabled:cursor-not-allowed disabled:opacity-40 ${styles[variant]} ${className}`}
      {...props}
    />
  )
}
