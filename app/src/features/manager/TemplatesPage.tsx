import { useCallback, useEffect, useState, type DragEvent } from 'react'
import { EmptyState } from '@components/EmptyState'
import { PillButton } from '@components/PillButton'
import { useSession } from '@auth/session'
import { fileFromDrop, openFile } from '@data/fs-adapter'
import { templatesRepo } from '@data/repositories'
import type { TemplateRecord } from '@data/types'
import { GlassFolderIllustration } from './GlassFolderIllustration'
import { ImportTemplateDialog } from './ImportTemplateDialog'
import { TemplateCard } from './TemplateCard'

const EFTPL_ACCEPT = { 'application/zip': ['.eftpl'] }

export function TemplatesPage() {
  const user = useSession((s) => s.user)
  const [templates, setTemplates] = useState<TemplateRecord[] | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [dropError, setDropError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!user) return
    const list = await templatesRepo.listByOwner(user.id)
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    setTemplates(list)
  }, [user])

  useEffect(() => {
    void reload()
  }, [reload])

  async function pickFile() {
    const file = await openFile({
      accept: EFTPL_ACCEPT,
      description: 'Pacote de template (.eftpl)',
    })
    if (file) {
      setDropError(null)
      setPendingFile(file)
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragOver(false)
    const file = fileFromDrop(event.nativeEvent, ['.eftpl'])
    if (!file) {
      setDropError('Arquivo não reconhecido — solte um pacote .eftpl.')
      return
    }
    setDropError(null)
    setPendingFile(file)
  }

  if (!user) return null

  const importButton = (
    <PillButton onClick={() => void pickFile()} data-testid="import-button">
      Importar template (.eftpl)
    </PillButton>
  )

  return (
    <div
      className="relative flex min-h-full flex-col"
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragOver(false)
      }}
      onDrop={onDrop}
    >
      {dragOver ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-(--radius-card) border-2 border-dashed border-ink/30 bg-surface/80 backdrop-blur-sm">
          <p className="text-lg font-semibold">Solte o pacote .eftpl para importar</p>
        </div>
      ) : null}

      {templates === null ? (
        <p className="py-24 text-center text-sm text-ink-muted">Carregando templates…</p>
      ) : templates.length === 0 ? (
        <EmptyState
          illustration={<GlassFolderIllustration />}
          headline="Seus templates moram aqui"
          subtitle="Importe um pacote .eftpl gerado pela IA — arraste o arquivo para esta tela ou use o botão abaixo."
          action={importButton}
        />
      ) : (
        <div className="flex flex-col gap-6 pt-6">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-bold tracking-tight">Templates</h1>
            {importButton}
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {templates.map((t) => (
              <TemplateCard key={t.id} template={t} />
            ))}
          </div>
        </div>
      )}

      {dropError ? (
        <p className="py-3 text-center text-sm text-red-700" role="alert">
          {dropError}
        </p>
      ) : null}

      <ImportTemplateDialog
        file={pendingFile}
        ownerUserId={user.id}
        onClose={() => setPendingFile(null)}
        onImported={() => {
          setPendingFile(null)
          void reload()
        }}
      />
    </div>
  )
}
