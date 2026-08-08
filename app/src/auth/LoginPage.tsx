import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import { EspindolaLogo } from '@components/EspindolaLogo'
import { PillButton } from '@components/PillButton'
import { TiltCard } from '@components/TiltCard'
import { seedFixtureTemplates } from '@features/manager/seed-fixtures'
import { useSession } from './session'
import { buildFanTimeline } from './fan-animation'
import heroRetrato from '../assets/hero-retrato.png'

/**
 * Tela de entrada (Figma "Login / create user"): fundo navy→preto, headline
 * de marca e um leque com três peças de exemplo.
 *
 * O login está desligado por enquanto (decisão de 02/08/2026): o CTA entra
 * direto, sem e-mail nem senha. A checagem de credenciais continua pronta em
 * `session.ts` para quando voltar a ser exigida.
 */
export function LoginPage() {
  const navigate = useNavigate()
  const enterWithoutPassword = useSession((s) => s.enterWithoutPassword)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const fanRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      if (fanRef.current) buildFanTimeline(fanRef.current)
    },
    { scope: fanRef },
  )

  async function entrar() {
    setError(null)
    setBusy(true)
    try {
      const user = await enterWithoutPassword()
      // em dev, deixa os pacotes de exemplo prontos no primeiro acesso
      await seedFixtureTemplates(user.id)
      navigate('/', { replace: true })
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center"
      style={{ background: 'linear-gradient(180deg, #024373 0%, #131313 100%)' }}
    >
      <div className="flex w-full items-center justify-between px-6 py-6 text-brand-cream sm:px-12 lg:px-24">
        <EspindolaLogo />
        <button
          type="button"
          onClick={() => void entrar()}
          disabled={busy}
          className="flex cursor-pointer items-center gap-3 text-base text-brand-cream transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ fontFamily: 'var(--font-nav)' }}
        >
          Login
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4 12h14m0 0l-5-5m5 5l-5 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-6">
        <h1
          className="text-center text-[clamp(56px,9vw,109px)] leading-[1.1] text-white"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Design Studio
        </h1>

        <div ref={fanRef} className="relative h-[430px] w-[752px] max-w-full">
          {/* Peça de exemplo — artigo (inclinada à esquerda) */}
          <TiltCard
            slot="left"
            baseZ={10}
            className="absolute left-0 top-6 flex h-[362px] w-[280px] flex-col overflow-hidden rounded-[10px] border border-[#e7ddce] bg-brand-navy-deep shadow-2xl"
          >
            <div className="flex flex-1 flex-col justify-end p-4 text-brand-light-text">
              <EspindolaLogo className="scale-75 origin-top-left text-brand-cream" />
              <p className="mt-auto text-[30px] leading-tight" style={{ fontFamily: 'var(--font-display-alt)' }}>
                Vulgarização do termo “facista” afasta injúria em texto jornalístico
              </p>
              <span className="mt-6 flex size-6 items-center justify-center rounded-full border border-brand-cream text-[10px] text-brand-cream">
                →
              </span>
            </div>
            <div className="h-5 w-full bg-brand-gold" />
          </TiltCard>

          {/* Peça de exemplo — lista numerada (inclinada à direita) */}
          <TiltCard
            slot="right"
            baseZ={10}
            className="absolute right-0 top-8 flex h-[362px] w-[280px] flex-col overflow-hidden rounded-[10px] border border-[#e7ddce] bg-[#cebc9d] shadow-2xl"
          >
            <div className="flex flex-1 flex-col gap-2 p-4 text-brand-navy">
              <EspindolaLogo className="scale-75 origin-top-left" />
              <ul className="mt-4 flex flex-col gap-2">
                {[
                  'Integração entre esferas',
                  'Confissão e formalização com lastro',
                  'Participação da vítima e transparência',
                  'Padronização e controle interno',
                ].map((item, i) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 border-b border-brand-navy-deep py-2"
                  >
                    <span className="text-[29px]" style={{ fontFamily: 'var(--font-display-alt)' }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-[15px] leading-tight">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="h-5 w-full bg-brand-navy" />
          </TiltCard>

          {/* Peça de exemplo — capa com retrato (centro, por cima).
              Posição por `left` fixo (e não left-1/2 + -translate-x-1/2) para
              o translate do Tailwind não brigar com o transform do GSAP. */}
          <TiltCard
            slot="center"
            baseZ={20}
            className="absolute left-[210px] top-0 h-[430px] w-[333px] overflow-hidden rounded-xl border border-[#e7ddce] shadow-2xl"
            style={{ background: 'linear-gradient(180deg, #d6c7ad 0%, #e7ddce 100%)' }}
          >
            <img
              src={heroRetrato}
              alt=""
              width={333}
              height={413}
              className="absolute bottom-0 left-0 w-full"
            />
            <div
              className="absolute inset-x-0 bottom-0 h-[155px]"
              style={{ background: 'linear-gradient(180deg, rgba(36,33,41,0) 10%, #242129 58%)' }}
            />
            <div className="absolute left-5 top-5 text-brand-navy-deep">
              <EspindolaLogo />
            </div>
            <div
              className="absolute inset-x-6 bottom-9 text-center text-[24px] leading-[1.1] text-brand-light-text"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <p>Direito penal &amp;</p>
              <p className="italic">Criminal compliance</p>
            </div>
          </TiltCard>
        </div>

        <PillButton variant="brand" onClick={() => void entrar()} disabled={busy}>
          {busy ? 'Entrando…' : 'Fazer login'}
        </PillButton>

        {error ? (
          <p role="alert" className="rounded-full bg-retro-rosa px-4 py-2 text-sm text-ink">
            {error}
          </p>
        ) : null}
      </div>

      <p className="pb-4 text-center">
        <span className="text-meta text-white/40">EF Design Studio v{__APP_VERSION__}</span>
      </p>
    </div>
  )
}
