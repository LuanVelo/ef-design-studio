type AvatarProps = {
  /** Nome usado pra derivar a inicial exibida */
  name?: string
  /** Diâmetro em px */
  size?: number
  tone?: 'dark' | 'light'
  className?: string
}

/**
 * Avatar do usuário logado. O app não tem upload de foto de perfil (não é um
 * requisito do escopo), então a variante "foto" do componente `profile
 * picture` do Figma não se aplica — usamos sempre a inicial, no estilo da
 * variante "empty".
 */
export function Avatar({ name, size = 28, tone = 'light', className = '' }: AvatarProps) {
  const initial = name?.trim().charAt(0).toUpperCase() || '?'
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full font-sans text-xs font-semibold ${
        tone === 'dark' ? 'bg-white/15 text-brand-cream' : 'bg-brand-ink/10 text-brand-body'
      } ${className}`}
      style={{ width: size, height: size }}
    >
      {initial}
    </span>
  )
}
