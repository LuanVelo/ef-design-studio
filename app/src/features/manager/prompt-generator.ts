import { CANONICAL_FORMATS, type TemplateCategory } from '@core/schemas'

/**
 * Taxonomia canônica de tags (fecha a decisão §12.3 do ESCOPO).
 * Categorias de template seguem fixas: social · slides · pdf.
 */
export const CANONICAL_TAGS: Record<string, readonly string[]> = {
  estilo: ['minimalista', 'bold', 'editorial', 'elegante', 'corporativo', 'divertido', 'retro'],
  tema: [
    'produto',
    'promocao',
    'evento',
    'institucional',
    'educativo',
    'relatorio',
    'proposta',
    'portfolio',
  ],
  tom: ['claro', 'escuro', 'colorido'],
}

export const ALL_CANONICAL_TAGS: readonly string[] = Object.values(CANONICAL_TAGS).flat()

export type PromptInput = {
  /** Nome do template desejado (vira `name` e base do `id`) */
  name: string
  category: TemplateCategory
  /** Keys dos formatos canônicos escolhidos */
  formatKeys: string[]
  /** Descrição livre do design (direção visual, referências, cores) */
  designDescription: string
  /** Descrição livre dos slots/conteúdo editável desejado */
  slotsDescription: string
  tags: string[]
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'template'
  )
}

/**
 * Monta o prompt completo para uma IA gerar um pacote `.eftpl` (RF-G6).
 * Embute a spec do Contrato 1 (manifest, regras de layout, README) para que
 * o pacote gerado passe no validador da importação sem ajustes.
 */
export function buildTemplatePrompt(input: PromptInput): string {
  const formats = input.formatKeys
    .map((key) => CANONICAL_FORMATS.find((f) => f.key === key))
    .filter((f) => f !== undefined)
  const id = `ef-${slugify(input.name)}-01`

  const formatLines = formats
    .map(
      (f) =>
        `| \`${f.key}\` | ${f.width}×${f.height} | ${
          f.pages === 'multi' ? `multi (${f.minPages ?? 2}–${f.maxPages ?? 10} páginas)` : 'única'
        } |`,
    )
    .join('\n')

  const formatManifestExample = formats
    .map(
      (f) =>
        `    { "key": "${f.key}", "file": "layouts/${f.key}.html", "width": ${f.width}, "height": ${f.height}, "pages": "${f.pages}"${
          f.pages === 'multi' ? `, "minPages": ${f.minPages ?? 2}, "maxPages": ${f.maxPages ?? 10}` : ''
        } }`,
    )
    .join(',\n')

  return `Crie um pacote de template \`.eftpl\` completo para o app EF Design Studio.

## O que eu quero

- **Nome:** ${input.name}
- **Categoria:** ${input.category}
- **Direção de design:** ${input.designDescription.trim() || 'a seu critério, coerente com a categoria.'}
- **Conteúdo editável (slots) desejado:** ${input.slotsDescription.trim() || 'defina os slots que fizerem sentido para o design.'}
- **Tags sugeridas:** ${input.tags.length ? input.tags.join(', ') : 'escolha entre as tags canônicas abaixo'}

## Formatos que o template deve suportar

| key | dimensões (px) | páginas |
|---|---|---|
${formatLines}

## Estrutura do pacote (zip renomeado para .eftpl)

\`\`\`
${id}.eftpl
├── manifest.json          # obrigatório
├── README.md              # obrigatório
├── thumbnail.png          # obrigatório — 800px no lado maior
├── layouts/<formato>.html # um arquivo por formato da tabela acima
├── styles/base.css        # CSS compartilhado
├── fonts/*.woff2          # fontes embutidas (licença livre, ex. OFL)
└── assets/*               # imagens fixas do design (se houver)
\`\`\`

## manifest.json

\`\`\`json
{
  "schemaVersion": 1,
  "id": "${id}",
  "name": "${input.name}",
  "category": "${input.category}",
  "version": "1.0.0",
  "author": "IA",
  "description": "…",
  "tags": ${JSON.stringify(input.tags.length ? input.tags : ['…'])},
  "formats": [
${formatManifestExample}
  ],
  "slots": [
    { "key": "titulo", "type": "text", "label": "Título", "required": true, "maxChars": 60, "multiline": false }
  ],
  "fonts": [ { "family": "…", "file": "fonts/….woff2", "license": "OFL" } ],
  "colors": { "editable": [ { "key": "cor-destaque", "label": "Cor de destaque", "default": "#FF4D00" } ] }
}
\`\`\`

- \`id\` em kebab-case minúsculo; \`version\` semver.
- **Tipos de slot:** \`text\` (maxChars, multiline), \`richtext\` (negrito/itálico apenas), \`image\` (aspectHint, fit cover|contain), \`variant\` (options + default), \`color\`, \`list\` (maxItems, itemMaxChars), \`page-group\` (multi-página).
- Tags canônicas: ${ALL_CANONICAL_TAGS.join(', ')}.

## Regras dos layouts HTML (obrigatórias — o app rejeita o pacote se violar)

1. HTML5 **sem \`<script>\`**, sem handlers \`on*\` e **sem URLs externas** (\`http(s)://\` proibido em src/href/url()) — tudo relativo ao pacote.
2. Elemento raiz com as dimensões exatas do formato (\`width\`/\`height\` fixos em px).
3. Cada slot editável marcado com \`data-slot="<key>"\` — toda key declarada no manifest deve aparecer em pelo menos um layout, e nenhum \`data-slot\` do HTML pode faltar no manifest.
4. Slots de imagem são containers com \`overflow:hidden\`; o app injeta o \`<img>\` com o \`fit\` declarado.
5. Variações de layout como classes \`variant-<option>\` aplicadas no elemento raiz (CSS muda a composição por variant).
6. CSS deve prever texto no limite de caracteres e slot opcional vazio (\`:empty\` ou classe \`slot-empty\`).
7. Cores editáveis como CSS custom properties (\`var(--cor-destaque)\`), com fallback no CSS.
${input.category === 'pdf' ? '8. Templates PDF podem usar o slot especial `page-number` (numeração automática — não declarar no manifest).\n' : ''}
## README.md (seções fixas obrigatórias)

\`# ${input.name}\` · \`## Visão geral\` · \`## Formatos\` (tabela) · \`## Slots\` (tabela: key, tipo, obrigatório, limites, orientação) · \`## Variações\` (quando usar cada uma) · \`## Diretrizes de conteúdo\` · \`## Changelog\`.

## Entrega

Gere todos os arquivos do pacote (manifest.json, README.md, layouts, CSS e instruções para thumbnail) prontos para zipar como \`${id}.eftpl\`. Fontes: use um WOFF2 de licença livre embutido ou indique qual baixar. O pacote deve passar na validação de importação do app sem nenhum ajuste manual.`
}
