# CLAUDE.md — EF Design Studio

Instrução operacional do repositório. A fonte de verdade do produto é [Instructions/ESCOPO.md](Instructions/ESCOPO.md); o plano de execução é [Instructions/PLANO.md](Instructions/PLANO.md); as diretrizes visuais da UI são [design/DIRETRIZES-UI.md](design/DIRETRIZES-UI.md). Em conflito, o ESCOPO vence.

## O que é o produto

App web **local-first** de produção de peças de design a partir de templates: Gerenciador de Templates, Social Templates e Slides/PDF Templates. Roda 100% no navegador, sem backend. A IA participa **por fora**: gera pacotes `.eftpl` e documentos `content.json` que o usuário faz upload no app.

## Princípios inegociáveis

1. **Custo zero permanente** — sem servidor, sem banco gerenciado, sem API paga. Deploy só em hospedagem estática gratuita (GitHub Pages / Cloudflare Pages).
2. **Local-first** — todos os dados em IndexedDB + arquivos locais. 100% offline após o primeiro load.
3. **IA desacoplada** — o app **nunca** chama API de IA. A interface IA↔app são os formatos de arquivo (`.eftpl`, `content.json`).
4. **Web primeiro, instalável depois** — SPA + PWA na v1; todo acesso a arquivos isolado em `fs-adapter` para viabilizar Tauri no futuro sem reescrita.
5. **Template governa o design** — o usuário edita conteúdo dentro dos limites do template. Isto não é um editor de design livre.

Qualquer feature ou dependência que viole um destes princípios deve ser recusada, mesmo que pareça conveniente.

## Stack (fixa — não trocar sem atualizar o ESCOPO)

React 18+ / TypeScript / Vite · Tailwind CSS · Zustand · Dexie.js (IndexedDB) · React Router · vite-plugin-pwa · html-to-image (export PNG/JPG) · jsPDF ou pdf-lib (PDF por composição de imagens) · JSZip (`.eftpl`/`.efbackup`) · WebCrypto PBKDF2+AES-GCM (login local e cripto de dados) · zod (schemas) · DOMPurify (sanitização de templates).

## Estrutura de pastas

```
EF_deisgn/
├── Instructions/   # escopo, plano, specs — não é código
├── design/         # diretrizes de UI e referências visuais
├── content/        # exemplos de content.json/markdown para testes
├── backup/         # .efbackup de desenvolvimento
└── app/            # o código (Vite root)
    ├── src/
    │   ├── core/       # schemas zod, validação de pacotes, motor de render
    │   ├── data/       # Dexie, repositórios, backup/restore, fs-adapter
    │   ├── auth/       # login local, criptografia
    │   ├── features/
    │   │   ├── manager/  # gerenciador de templates
    │   │   ├── social/   # fluxo social
    │   │   └── slides/   # fluxo slides + pdf (pdf É slides com formatos A4)
    │   ├── components/ # UI compartilhada
    │   └── export/     # pipeline png/jpg/pdf/zip
    └── public/
```

## Convenções de código

- TypeScript estrito; schemas zod em `core/` são a fonte dos tipos (inferir com `z.infer`).
- Todos os registros persistidos carregam `id` (nanoid), `createdAt`, `updatedAt` (ISO 8601), `ownerUserId`.
- Strings de UI em **pt-BR**, centralizadas (preparar i18n futura).
- Nenhum acesso direto a `window.showOpenFilePicker`/download fora de `data/fs-adapter`.
- Nenhuma request de rede em runtime além do próprio app shell (verificável: o app funciona com DevTools offline).
- UI segue [design/DIRETRIZES-UI.md](design/DIRETRIZES-UI.md) — tokens no Tailwind config, componentes canônicos de lá.

## Comandos (a partir de F0)

Rodar sempre dentro de `app/`: `npm run dev` · `npm run build` · `npm run test` (vitest) · `npm run lint`.

---

## Contrato 1 — Pacote de Template `.eftpl` (o que a IA gera)

Um `.eftpl` é um **zip** com layout fixo:

```
meu-template.eftpl
├── manifest.json          # obrigatório — metadados + formatos + slots
├── README.md              # obrigatório — documentação humana (seções fixas abaixo)
├── thumbnail.png          # obrigatório — 800px no lado maior
├── layouts/<formato>.html # um arquivo por formato suportado
├── styles/base.css        # CSS compartilhado
├── fonts/*.woff2
└── assets/*               # imagens fixas do design
```

### manifest.json (schema)

```json
{
  "schemaVersion": 1,
  "id": "ef-social-bold-01",
  "name": "Social Bold",
  "category": "social",
  "version": "1.0.0",
  "author": "Claude",
  "createdWith": "claude-fable-5",
  "description": "Template social de alto contraste para anúncios de produto.",
  "tags": ["bold", "produto", "escuro"],
  "formats": [
    { "key": "stories", "file": "layouts/stories.html", "width": 1080, "height": 1920, "pages": "single" }
  ],
  "slots": [
    { "key": "titulo", "type": "text", "label": "Título principal", "required": true, "maxChars": 60, "multiline": false },
    { "key": "imagem-hero", "type": "image", "label": "Imagem de destaque", "required": false, "aspectHint": "4:5", "fit": "cover" },
    { "key": "layout-variant", "type": "variant", "label": "Variação de layout", "options": ["imagem-cheia", "imagem-metade", "so-texto"], "default": "imagem-cheia" }
  ],
  "fonts": [ { "family": "Inter", "file": "fonts/inter-var.woff2", "license": "OFL" } ],
  "colors": { "editable": [ { "key": "cor-destaque", "label": "Cor de destaque", "default": "#FF4D00" } ] }
}
```

**Tipos de slot:** `text`, `richtext` (negrito/itálico apenas), `image`, `variant`, `color`, `list` (itens repetíveis), `page-group` (multi-página: define os slots de cada página).

**Formatos canônicos** (o manifest pode declarar customizados com as mesmas propriedades):

| key | Categoria | Dimensões | Multi |
|---|---|---|---|
| `stories` | social | 1080×1920 | não |
| `feed-square` | social | 1080×1080 | não |
| `feed-portrait` | social | 1080×1350 | não |
| `carousel-square` | social | 1080×1080 | sim (2–10) |
| `carousel-portrait` | social | 1080×1350 | sim (2–10) |
| `slide-16x9` | slides | 1920×1080 | sim |
| `slide-4x3` | slides | 1440×1080 | sim |
| `pdf-a4-portrait` | pdf | 794×1123 | sim |
| `pdf-a4-landscape` | pdf | 1123×794 | sim |

### Regras dos arquivos de layout

1. HTML5 **sem `<script>`** e **sem requests externas** (`http(s)://` proibido em `src`/`url()` — tudo relativo ao pacote).
2. Elemento raiz com as dimensões exatas do formato (`width`/`height` fixos em px).
3. Cada slot marcado com `data-slot="<key>"`; variações como classes `variant-<option>` no raiz.
4. Slots de imagem são containers com `overflow:hidden`; o app injeta `<img>` com o `fit` declarado.
5. CSS deve prever: texto no limite de caracteres e slot opcional vazio (esconder via `:empty` ou classe `slot-empty`).
6. Cores editáveis como CSS custom properties (`var(--cor-destaque)`).
7. Templates PDF podem usar o slot especial `page-number` (numeração automática de página).

### README.md do pacote (seções fixas obrigatórias)

`# <Nome>` · `## Visão geral` · `## Formatos` (tabela) · `## Slots` (tabela: key, tipo, obrigatório, limites, orientação) · `## Variações` (quando usar cada uma) · `## Diretrizes de conteúdo` · `## Changelog`.

### Validação na importação (o app rejeita com mensagem específica)

Manifest ausente/inválido (JSON Schema) · layout declarado mas ausente · slot no HTML não declarado e vice-versa (warning) · scripts ou URLs externas · thumbnail ausente · `id` duplicado (oferecer: nova versão / importar como cópia).

---

## Contrato 2 — Documento de Conteúdo `content.json` (o que a IA gera para Slides/PDF)

```json
{
  "schemaVersion": 1,
  "title": "Proposta comercial — Cliente X",
  "language": "pt-BR",
  "pages": [
    { "suggestedVariant": "capa", "slots": { "titulo": "Proposta Comercial", "subtitulo": "Cliente X — Julho 2026" } },
    { "suggestedVariant": "conteudo-bullets", "slots": { "titulo": "Escopo do projeto", "bullets": ["Item um", "Item dois", "Item três"] } }
  ]
}
```

- As `keys` de `slots` devem casar com os slots do template. O app faz o matching na importação: casados são preenchidos; sobras vão para o painel "Conteúdo não mapeado" (drag manual); obrigatórios vazios ficam sinalizados.
- **Markdown estruturado** também é aceito (H1 = novo slide, H2 = título do slide, corpo = conteúdo) e convertido internamente para `content.json`.
- O app oferece "Copiar prompt para IA" que embute o schema + slots do template escolhido.

---

## Limites do editor de slides (anti-scope-creep — regra dura)

Permitido na v1: editar texto inline no canvas, trocar/reposicionar imagem dentro do frame (pan+zoom), escolher variant por slide, cores editáveis do template, reordenar/duplicar/excluir/adicionar slides.

**Fora do escopo v1 (recusar):** mover/redimensionar/estilizar elementos livremente, criar elementos novos, editar o design do template. Qualquer pedido nessa direção é v2 (slots `adjustable` no manifest).

## Motor de renderização (resumo operacional)

Template = HTML+CSS autocontido renderizado em **iframe sandboxed** (`sandbox="allow-same-origin"`, sem scripts). Conteúdo injetado via `data-slot`. Captura com `html-to-image` (`pixelRatio` 2 para export, 1 para preview). Sanitizar todo pacote na importação com DOMPurify. **Um único motor** para preview, thumbnail e export — nunca duplicar caminho de render.

## Roadmap ativo

| Fase | Entrega | Status |
|---|---|---|
| F0 | Fundação: scaffold, Dexie, login local, PWA, deploy | ✅ concluída (deploy público pendente) |
| F1 | Contrato: schemas zod, validador, motor de render, templates fixture | ⬅️ atual |
| F2 | Gerenciador de templates | pendente |
| F3 | Social (wizard + export + mobile) | pendente |
| F4 | Slides + PDF (upload conteúdo, editor, export PDF) | pendente |
| F5 | Robustez: backup, cripto, undo, gestão de espaço, polish | pendente |

Cada fase termina com o app utilizável de ponta a ponta no que já existe. Detalhe passo a passo em [Instructions/PLANO.md](Instructions/PLANO.md) — manter o status de lá atualizado ao concluir etapas.

## Requisitos não funcionais que valem como testes de aceite

Export social @2x < 5s · preview atualiza < 300ms (debounce) · app funciona offline após 1º load · aviso a 80% da cota de storage · nenhuma ação destrutiva sem confirmação · soft delete 30 dias para projetos · contraste AA na UI · Chrome/Edge primário.
