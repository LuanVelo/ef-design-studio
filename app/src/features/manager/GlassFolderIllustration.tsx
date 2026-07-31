/** Ilustração R7: pasta escura translúcida (frosted glass) com papéis brancos dentro. */
export function GlassFolderIllustration() {
  return (
    <svg width="140" height="112" viewBox="0 0 140 112" fill="none" aria-hidden="true">
      {/* papéis espiando de dentro da pasta */}
      <rect x="34" y="14" width="52" height="64" rx="6" fill="#FFFFFF" stroke="#E5E4E0" transform="rotate(-6 34 14)" />
      <rect x="56" y="8" width="52" height="64" rx="6" fill="#FFFFFF" stroke="#E5E4E0" transform="rotate(4 56 8)" />
      <rect x="64" y="22" width="36" height="4" rx="2" fill="#D6E8EE" transform="rotate(4 64 22)" />
      <rect x="63" y="32" width="28" height="4" rx="2" fill="#EDEDEA" transform="rotate(4 63 32)" />
      {/* corpo da pasta (vidro escuro translúcido) */}
      <path
        d="M14 38a8 8 0 0 1 8-8h28l8 10h60a8 8 0 0 1 8 8v48a8 8 0 0 1-8 8H22a8 8 0 0 1-8-8V38Z"
        fill="#1A1A1A"
        fillOpacity="0.78"
      />
      {/* brilho do vidro */}
      <path
        d="M14 46h112v6H14z"
        fill="#FFFFFF"
        fillOpacity="0.10"
      />
      <path
        d="M22 30h28l8 10H22a8 8 0 0 0-8 8v-10a8 8 0 0 1 8-8Z"
        fill="#1A1A1A"
        fillOpacity="0.9"
      />
    </svg>
  )
}
