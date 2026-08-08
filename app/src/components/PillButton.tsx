import type { ButtonHTMLAttributes } from 'react'

type PillButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'brand'
}

const styles = {
  primary: 'bg-ink text-white hover:bg-black',
  ghost: 'border border-ink/15 text-ink hover:bg-ink/5',
  /** CTA da direção de marca (Login/Home/Tipo selecionado) — pill dourado. */
  brand: 'bg-brand-gold text-brand-light-text hover:bg-brand-gold-hover text-[length:18px] font-medium px-8 py-3',
}

export function PillButton({ variant = 'primary', className = '', ...props }: PillButtonProps) {
  return (
    <button
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors duration-150 ease-(--ease-out-app) disabled:cursor-not-allowed disabled:opacity-40 ${styles[variant]} ${className}`}
      {...props}
    />
  )
}
