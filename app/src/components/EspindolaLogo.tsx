/**
 * Wordmark do app (marca Espíndola Fonseca). Reconstruído a partir do Figma
 * como texto/CSS — o pacote de paths vetoriais exportado vinha fragmentado
 * em ~6 grupos sem um SVG único, mais frágil de recriar pixel a pixel do
 * que uma lockup em texto. Se o usuário tiver um SVG oficial da marca,
 * trocar por ele aqui depois.
 */
export function EspindolaLogo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span
        aria-hidden="true"
        className="flex h-7 w-6 shrink-0 items-center justify-center border border-current text-base leading-none"
        style={{ fontFamily: 'var(--font-display-alt)' }}
      >
        E
      </span>
      <span className="flex flex-col leading-[1.05]">
        <span className="text-sm" style={{ fontFamily: 'var(--font-display-alt)' }}>
          Espíndola
        </span>
        <span className="text-sm" style={{ fontFamily: 'var(--font-display-alt)' }}>
          Fonseca
        </span>
        <span className="mt-0.5 text-[8px] font-sans uppercase tracking-[0.2em] opacity-70">
          Advocacia
        </span>
      </span>
    </div>
  )
}
