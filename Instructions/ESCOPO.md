# EF Design Studio — Documento de Escopo

**Versão:** 1.0
**Data:** 30/07/2026
**Status:** Aprovado para derivar o arquivo de instrução (CLAUDE.md)
**Autor:** Luan (briefing) + Claude (refinamento)

---

## 1. Visão Geral

O **EF Design Studio** é uma aplicação local-first de produção de peças de design a partir de templates. Ela concentra três ferramentas — **Gerenciador de Templates**, **Social Templates** e **Slides Templates** — em um único app web que roda inteiramente no navegador, sem backend, sem custos de servidor e sem IA embutida.

A IA (Claude ou outra) participa do fluxo **por fora do app**: ela gera templates e documentos de conteúdo em formatos padronizados definidos neste escopo, e o usuário faz upload desses arquivos no app. O app é o motor de renderização, edição e exportação; a IA é a fábrica de insumos.

### 1.1 Princípios de arquitetura (inegociáveis)

1. **Custo zero permanente.** Nenhum componente pode gerar cobrança: sem servidor de aplicação, sem banco de dados gerenciado, sem APIs pagas. Hospedagem apenas em serviços estáticos gratuitos (GitHub Pages ou Cloudflare Pages).
2. **Local-first.** Todos os dados do usuário (templates, projetos, exports, preferências) vivem na máquina do usuário (IndexedDB + sistema de arquivos). O app funciona 100% offline após o primeiro carregamento.
3. **IA desacoplada.** O app nunca chama uma API de IA. Toda interação com IA é mediada por arquivos: o usuário gera o arquivo fora do app (ex.: no Claude) e faz upload. Os formatos de arquivo são a interface entre IA e app.
4. **Web primeiro, instalável depois.** A v1 é um web app (SPA + PWA). A arquitetura deve permitir empacotar como app instalado offline (PWA instalável já na v1; Tauri como opção futura sem reescrita).
5. **Template governa o design.** O usuário edita conteúdo dentro dos limites que o template define. O app não é um editor de design livre — é um sistema de produção sobre design pré-aprovado.

### 1.2 Usuários e dispositivos

- **Equipe pequena (2 a 10 pessoas).** Cada pessoa usa o app na própria máquina/navegador, com seus dados locais. Compartilhamento entre membros acontece por troca de arquivos (pacotes de template e backups), opcionalmente por uma pasta de nuvem que a equipe já possua (Drive/Dropbox) — o app não integra com nuvem, apenas lê/grava arquivos.
- **Matriz de suporte por dispositivo:**

| Ferramenta | Desktop | Tablet | Celular |
|---|---|---|---|
| Gerenciador de Templates | ✅ completo | ✅ completo | ⚠️ somente leitura/consulta |
| Social Templates | ✅ | ✅ | ✅ completo |
| Slides Templates | ✅ | ✅ | ❌ bloqueado (tela de aviso) |
| Templates PDF | ✅ | ✅ | ❌ bloqueado (tela de aviso) |

- Breakpoints de referência: celular < 768px, tablet 768–1199px, desktop ≥ 1200px.

---

## 2. Arquitetura Técnica

### 2.1 Stack

| Camada | Escolha | Justificativa |
|---|---|---|
| Framework | React 18+ + TypeScript + Vite | Ecossistema maduro, build estático, tipagem forte para os schemas de template |
| Estilo | Tailwind CSS | Velocidade e consistência; tokens de design centralizados |
| Estado | Zustand | Leve, sem boilerplate, persistência fácil |
| Banco local | IndexedDB via Dexie.js | Estruturado, transacional, suporta blobs (thumbnails, assets) |
| Roteamento | React Router | SPA padrão |
| PWA | vite-plugin-pwa (Workbox) | Offline + instalável sem código extra |
| Render de peças | HTML/CSS em iframe sandbox + captura por canvas | Templates são HTML/CSS; ver §4 |
| Animação/interação | GSAP (+ `@gsap/react`) | Micro-interações do chrome do app (hover, drag-reorder, transições de modal); 100% gratuito (inclui Draggable/Flip), sem dependência de rede em runtime |
| Export imagem | html-to-image (ou snapdom) | PNG/JPG em alta resolução via pixelRatio |
| Export PDF | Renderização por página → jsPDF/pdf-lib compondo as imagens | Fidelidade visual total com o template |
| Pacotes/zip | JSZip | Pacotes `.eftpl` e backups `.efbackup` |
| Criptografia | WebCrypto (PBKDF2 + AES-GCM) | Login local e proteção opcional dos dados |

### 2.2 Hospedagem e distribuição

- **v1 (web):** deploy estático no **GitHub Pages** (ou Cloudflare Pages). CI simples: push na `main` → build → publish. Nenhum segredo, nenhuma variável de servidor.
- **v1 (instalável):** o mesmo deploy é um **PWA instalável** — Chrome/Edge oferecem "Instalar app"; funciona offline via service worker com cache do app shell.
- **v2 (opcional):** empacotamento **Tauri** para gerar `.exe`/`.dmg` com acesso pleno ao sistema de arquivos. A estrutura do código deve isolar todo acesso a arquivos em um módulo `fs-adapter` para que a troca navegador→Tauri seja localizada.

### 2.3 Autenticação (login e senha) — modelo honesto

Não existe servidor, portanto **não existe autenticação de servidor**. O login é um **portão de acesso local**:

- No primeiro uso, o usuário cria **usuário + senha**. A senha nunca é armazenada: guarda-se um hash **PBKDF2** (≥ 310k iterações, salt aleatório) no IndexedDB.
- A cada sessão, a tela de login bloqueia o app até a senha correta. Sessão expira por inatividade configurável (padrão 8h) ou logout.
- **Proteção real dos dados (opcional, ligada por padrão):** os registros do IndexedDB são criptografados com **AES-GCM**, chave derivada da senha via PBKDF2. Sem a senha, os dados locais são ilegíveis — isso dá valor real ao login mesmo sem servidor.
- Múltiplos perfis no mesmo navegador são suportados (lista de usuários na tela de login, dados isolados por usuário).
- **Limitação documentada:** isso protege contra acesso casual e leitura dos dados no disco, não contra um atacante com controle da máquina. Deve constar na documentação do app.

### 2.4 Persistência e backup

- **IndexedDB (Dexie)** com stores: `users`, `templates`, `projects`, `exports_history`, `settings`.
- **Backup manual e automático:** exportação de um arquivo `.efbackup` (zip com JSON + assets) contendo tudo do usuário. O app sugere backup periódico (lembrete a cada 7 dias sem backup).
- **Importação de backup** restaura ou mescla (merge por `id` + `updatedAt`, vence o mais recente; conflitos listados para o usuário decidir).
- **Compartilhamento na equipe:** templates trafegam como pacotes `.eftpl` (§5); um membro exporta, outro importa. Uma pasta de Drive compartilhada pode servir de "biblioteca da equipe" sem o app saber disso.
- **Persistência garantida:** o app solicita `navigator.storage.persist()` para reduzir risco de o navegador limpar o IndexedDB.

---

## 3. Modelo de Dados

Todos os registros carregam `id` (nanoid), `createdAt`, `updatedAt` (ISO 8601), `ownerUserId`.

### 3.1 Template (registro no app)

```ts
interface Template {
  id: string;
  name: string;
  category: 'social' | 'slides' | 'pdf';
  version: string;              // semver do pacote importado
  status: 'novo' | 'ativo' | 'recente' | 'arquivado';
  tags: string[];
  formats: FormatDef[];         // formatos que o template suporta (§3.2)
  thumbnailBlob: Blob;
  packageBlob: Blob;            // o .eftpl original, para reexportar/compartilhar
  manifest: TemplateManifest;   // manifest.json parseado (§5.2)
  usageCount: number;
  lastUsedAt: string | null;
}
```

**Regras de status:**
- `novo`: atribuído automaticamente na importação; expira para `ativo` após 14 dias ou primeiro uso.
- `recente`: flag calculada (não persistida) — os N templates com `lastUsedAt` mais recente aparecem na seção "Recentes".
- `arquivado`: oculto das listagens padrão e dos seletores de fluxo; recuperável na aba Arquivados; nunca é deletado junto com projetos que o usam.
- `ativo`: estado padrão.
- Exclusão definitiva exige confirmação dupla e é bloqueada se existirem projetos vinculados (oferecer arquivar).

### 3.2 Formatos canônicos

```ts
interface FormatDef {
  key: string;          // ex.: 'stories', 'feed-square', 'slide-16x9'
  label: string;
  width: number;        // px @1x
  height: number;
  pages: 'single' | 'multi';   // carousel e slides são multi
}
```

Catálogo padrão embutido no app (templates declaram quais suportam):

| key | Categoria | Dimensões | Multi |
|---|---|---|---|
| `stories` | social | 1080×1920 | não |
| `feed-square` | social | 1080×1080 | não |
| `feed-portrait` | social | 1080×1350 | não |
| `carousel-square` | social | 1080×1080 | sim (2–10) |
| `carousel-portrait` | social | 1080×1350 | sim (2–10) |
| `slide-16x9` | slides | 1920×1080 | sim |
| `slide-4x3` | slides | 1440×1080 | sim |
| `pdf-a4-portrait` | pdf | 794×1123 (A4 @96dpi) | sim |
| `pdf-a4-landscape` | pdf | 1123×794 | sim |

O catálogo é extensível: um manifest pode declarar formatos customizados com as mesmas propriedades.

### 3.3 Projeto (uma peça em produção)

```ts
interface Project {
  id: string;
  name: string;
  templateId: string;
  category: 'social' | 'slides' | 'pdf';
  selectedFormats: string[];        // keys de FormatDef
  content: ContentDocument;         // conteúdo estruturado (§6)
  overrides: SlotOverride[];        // edições do usuário slot a slot
  status: 'rascunho' | 'finalizado';
  lastExportAt: string | null;
}
```

`SlotOverride` registra, por página/slide e por slot: texto substituído, imagem trocada (blob), variação de layout escolhida, slot ocultado. Overrides são a única forma de edição — o template nunca é alterado por um projeto.

---

## 4. Motor de Renderização

- Um template é **HTML + CSS autocontido** (sem requests externos; fontes e imagens embutidas no pacote) renderizado em **iframe sandboxed** (`sandbox="allow-same-origin"`, sem scripts do template — ver segurança abaixo).
- O app injeta o conteúdo nos **slots** do template via data-attributes (`data-slot="titulo"`), monta cada página/slide no tamanho nativo do formato e captura com `html-to-image` em `pixelRatio` 2 (export @2x) ou 1 (preview).
- **Segurança:** pacotes de template **não podem conter JavaScript**. Na importação, o app sanitiza o HTML (DOMPurify: remove `<script>`, handlers `on*`, `javascript:` URLs). Templates são declarativos por definição.
- **Fontes:** embutidas no pacote como WOFF2 e registradas via `@font-face` com escopo do iframe. O manifest lista as fontes e licenças.
- **Preview ao vivo:** o mesmo motor renderiza thumbnails e o canvas de edição — uma única fonte de verdade visual, sem divergência entre preview e export.

---

## 5. Pacote de Template (`.eftpl`) — o formato que a IA gera

Este é o contrato central do sistema: **a especificação que o Claude usa para gerar templates novos**. O arquivo de instrução (CLAUDE.md) derivado deste escopo deve reproduzir esta seção integralmente.

### 5.1 Estrutura do pacote

Um `.eftpl` é um zip com layout fixo:

```
meu-template.eftpl
├── manifest.json          # metadados + declaração de formatos e slots (obrigatório)
├── README.md              # documentação humana do template (obrigatório, §5.4)
├── thumbnail.png          # 800px no lado maior (obrigatório)
├── layouts/
│   ├── stories.html       # um arquivo por formato suportado
│   ├── feed-square.html
│   └── ...
├── styles/
│   └── base.css           # CSS compartilhado entre layouts
├── fonts/
│   └── *.woff2
└── assets/
    └── *                  # imagens fixas do design (logos, texturas)
```

### 5.2 Schema do `manifest.json`

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
    {
      "key": "stories",
      "file": "layouts/stories.html",
      "width": 1080,
      "height": 1920,
      "pages": "single"
    }
  ],
  "slots": [
    {
      "key": "titulo",
      "type": "text",
      "label": "Título principal",
      "required": true,
      "maxChars": 60,
      "multiline": false
    },
    {
      "key": "imagem-hero",
      "type": "image",
      "label": "Imagem de destaque",
      "required": false,
      "aspectHint": "4:5",
      "fit": "cover"
    },
    {
      "key": "layout-variant",
      "type": "variant",
      "label": "Variação de layout",
      "options": ["imagem-cheia", "imagem-metade", "so-texto"],
      "default": "imagem-cheia"
    }
  ],
  "fonts": [
    { "family": "Inter", "file": "fonts/inter-var.woff2", "license": "OFL" }
  ],
  "colors": {
    "editable": [
      { "key": "cor-destaque", "label": "Cor de destaque", "default": "#FF4D00" }
    ]
  }
}
```

**Tipos de slot:** `text`, `richtext` (negrito/itálico apenas), `image`, `variant` (escolha entre variações de layout), `color`, `list` (itens repetíveis, ex.: bullets), `page-group` (para carousel/slides multi-página: define os slots de cada página).

### 5.3 Regras para os arquivos de layout

1. HTML5 sem `<script>`, sem requests externos (`http(s)://` proibido em `src`/`url()` — tudo relativo ao pacote).
2. Elemento raiz com as dimensões exatas do formato (`width/height` fixos em px).
3. Cada slot marcado com `data-slot="<key>"`; variações de layout como classes `variant-<option>` no raiz.
4. Slots de imagem são containers com `overflow:hidden`; o app injeta `<img>` com o `fit` declarado.
5. CSS deve prever estados de conteúdo: texto no limite de caracteres, slot opcional vazio (esconder graciosamente via `:empty` ou classe `slot-empty`).
6. Cores editáveis expostas como CSS custom properties (`var(--cor-destaque)`).

### 5.4 `README.md` do pacote (documentação do template)

Formato obrigatório, seções fixas:

```markdown
# <Nome do template>
## Visão geral        — propósito, tom visual, quando usar
## Formatos           — tabela dos formatos suportados e dimensões
## Slots              — tabela: key, tipo, obrigatório, limites, orientação de uso
## Variações          — descrição visual de cada variant com quando usar cada uma
## Diretrizes de conteúdo — tamanhos ideais de texto, tipos de imagem que funcionam
## Changelog          — versão a versão
```

### 5.5 Validação na importação

O app valida todo pacote no upload e rejeita com mensagens específicas: manifest ausente/inválido (validação por JSON Schema), arquivo de layout declarado mas ausente, slot referenciado no HTML mas não declarado (e vice-versa — warning), presença de scripts ou URLs externas, thumbnail ausente, `id` já existente (oferece: substituir como nova versão / importar como cópia).

---

## 6. Documento de Conteúdo (`content.json`) — o segundo formato que a IA gera

Para slides e PDF, o usuário pede a uma IA externa que transforme seu material bruto em um **documento de conteúdo estruturado**, e faz upload no app. Formato:

```json
{
  "schemaVersion": 1,
  "title": "Proposta comercial — Cliente X",
  "language": "pt-BR",
  "pages": [
    {
      "suggestedVariant": "capa",
      "slots": {
        "titulo": "Proposta Comercial",
        "subtitulo": "Cliente X — Julho 2026"
      }
    },
    {
      "suggestedVariant": "conteudo-bullets",
      "slots": {
        "titulo": "Escopo do projeto",
        "bullets": ["Item um", "Item dois", "Item três"]
      }
    }
  ]
}
```

- As `keys` dentro de `slots` devem corresponder aos slots do template escolhido. O app faz o **matching** na importação: slots casados são preenchidos; conteúdo sem slot vai para um painel "Conteúdo não mapeado" de onde o usuário arrasta para slots manualmente; slots obrigatórios vazios ficam sinalizados.
- Também é aceito **Markdown estruturado** (H1 = novo slide/página, H2 = título do slide, corpo = conteúdo) como formato de entrada simplificado, convertido internamente para `content.json`.
- O app oferece um botão **"Copiar prompt para IA"** que gera o prompt pronto (com o schema e os slots do template escolhido) para o usuário colar no Claude — mantendo a IA fora do app, mas o fluxo redondo.

---

## 7. As Três Ferramentas — Requisitos Funcionais

### 7.1 Gerenciador de Templates

**Tela principal:** grid de cards (thumbnail, nome, categoria, versão, badges de status, contagem de uso), com busca por texto, filtros por categoria/tag/status e ordenação (recentes, mais usados, A–Z, data de importação).

**Funcionalidades:**
- **RF-G1** Importar pacote `.eftpl` (drag-and-drop ou file picker) com validação (§5.5) e tela de preview antes de confirmar.
- **RF-G2** Detalhe do template: preview navegável de todos os formatos e variações, README renderizado, metadados, histórico de versões.
- **RF-G3** Gestão de status: arquivar/desarquivar, badges automáticos (`novo`, `recente`).
- **RF-G4** Versionamento: reimportar um pacote com mesmo `id` e versão maior cria nova versão; projetos existentes continuam apontando para a versão com que foram criados, com aviso de "versão mais nova disponível".
- **RF-G5** Exportar/compartilhar: baixar o `.eftpl` de qualquer template para enviar a um colega.
- **RF-G6** Gerador de prompt para novos templates: formulário (categoria, formatos desejados, descrição do design, slots necessários) → gera o prompt completo com a spec §5 embutida, para colar no Claude. O resultado da IA volta como `.eftpl` via RF-G1.
- **RF-G7** Duplicar template como base para variação (gera novo `id`, marca origem).

### 7.2 Social Templates

**Fluxo (wizard linear com navegação livre entre etapas):**

1. **Escolher template** — seletor filtrado por `category: social` (só status ativo/novo/recente).
2. **Escolher formatos** — multi-seleção entre os formatos que o template suporta (ex.: stories + feed-portrait + carousel). Uma peça, múltiplas saídas.
3. **Preencher conteúdo** — formulário gerado a partir dos slots do manifest + preview ao vivo lado a lado, por formato (tabs). O conteúdo é compartilhado entre formatos; overrides por formato são possíveis (ex.: título mais curto no stories). Carousel: gerenciador de páginas (adicionar/duplicar/reordenar/excluir, respeitando min/max do template).
4. **Exportar** — PNG ou JPG (qualidade configurável), @1x ou @2x, todos os formatos de uma vez em `.zip` com nomes padronizados: `<projeto>-<formato>-<página>.png`. Carousel numera as páginas.

- **RF-S1** Tudo do fluxo acima.
- **RF-S2** Projetos salvos automaticamente como rascunho a cada alteração (autosave em IndexedDB); lista "Meus projetos" com retomada.
- **RF-S3** ~~Mobile completo~~ — **adiado para v2** (2026-08-02): v1 foca em desktop, já que o app tende a um instalável (Tauri, §10 F6+). Especificação original mantida para quando for retomado: fluxo inteiro funcionando em celular — layout empilhado (preview acima, formulário abaixo), upload de imagem da galeria, export via Web Share API quando disponível.

### 7.3 Slides Templates

**Fluxo:**

1. **Escolher template e formato** — templates `category: slides`; formato 16:9 ou 4:3.
2. **Upload do documento de conteúdo** — `content.json` ou Markdown (§6). Alternativa: começar em branco e adicionar slides manualmente. Botão "Copiar prompt para IA" disponível aqui.
3. **Revisão e edição on-screen** — o coração da ferramenta:
   - **Filmstrip** lateral com miniaturas: reordenar (drag), duplicar, excluir, adicionar slide (escolhendo a variant).
   - **Canvas central** com o slide em escala ajustável (zoom fit/50/100%).
   - **Edição de conteúdo direta:** clique em um slot de texto edita inline no canvas; clique em imagem abre troca/reposicionamento dentro do frame (pan + zoom da imagem no container); seletor de variant por slide; cores editáveis do template no painel lateral.
   - **Fora do escopo v1:** mover/redimensionar/estilizar elementos livremente, criar elementos novos, editar o design do template. (Candidato a v2: slots marcados como `adjustable` no manifest.)
   - Painel "Conteúdo não mapeado" para material do upload que não casou com slots.
4. **Exportar** — PDF (uma página por slide, dimensão nativa, @2x rasterizado) ou PNGs individuais em zip.

- **RF-SL1** Tudo do fluxo acima.
- **RF-SL2** Autosave + lista de projetos, igual RF-S2.
- **RF-SL3** Bloqueio em celular com mensagem clara ("Slides funciona em tablet e desktop").

### 7.4 Templates PDF

Mesmo motor e fluxo dos Slides (formatos `pdf-a4-*`, multi-página, export PDF). Na v1, a ferramenta PDF **é** o fluxo de Slides com formatos de página A4 — sem UI separada além do filtro de categoria. Diferenças ficam no template (margens, tipografia de documento, slots de header/footer com numeração de página automática via slot especial `page-number`).

---

## 8. Requisitos Não Funcionais

- **RNF-1 Performance:** export de uma peça social @2x em < 5s; render de preview em < 300ms após alteração de conteúdo (debounce); app carrega em < 3s em conexão média.
- **RNF-2 Offline:** após o primeiro load, todas as funcionalidades operam sem rede (service worker cacheia o app shell; dados já são locais).
- **RNF-3 Limites de armazenamento:** o app monitora `navigator.storage.estimate()` e avisa quando o uso passar de 80% da cota; tela de gestão de espaço (tamanho por template/projeto, limpeza de exports antigos).
- **RNF-4 Idioma:** UI em pt-BR; strings centralizadas para futura i18n.
- **RNF-5 Acessibilidade:** navegação por teclado no gerenciador e formulários; contraste AA na UI do app (não nas peças, que seguem o template).
- **RNF-6 Compatibilidade:** Chrome/Edge (primário — necessário para PWA instalável), Firefox e Safari (funcional; Safari com degradação aceitável em export batch). Sem suporte a IE.
- **RNF-7 Integridade:** nenhuma ação destrutiva sem confirmação; exclusões relevantes com undo (soft delete de 30 dias para projetos).

---

## 9. Estrutura de Pastas do Projeto (código)

```
EF_deisgn/
├── Instructions/          # este escopo, CLAUDE.md, specs de formato
├── design/                # referências visuais, mockups da UI do app
├── content/               # exemplos de content.json / markdown p/ testes
├── backup/                # backups .efbackup de desenvolvimento
└── app/                   # o código do aplicativo (criar)
    ├── src/
    │   ├── core/          # schemas (zod), validação de pacotes, motor de render
    │   ├── data/          # Dexie, repositórios, backup/restore, fs-adapter
    │   ├── auth/          # login local, cripto
    │   ├── features/
    │   │   ├── manager/   # gerenciador de templates
    │   │   ├── social/    # fluxo social
    │   │   └── slides/    # fluxo slides+pdf
    │   ├── components/    # UI compartilhada
    │   └── export/        # pipeline png/jpg/pdf/zip
    └── public/
```

---

## 10. Roadmap por Fases

| Fase | Entrega | Conteúdo |
|---|---|---|
| **F0** | Fundação | Scaffold Vite+React+TS+Tailwind, Dexie, login local, PWA básico, deploy no Pages |
| **F1** | Contrato de template | Schemas zod do manifest/content, validador de pacote, motor de render em iframe, 1 template de referência de cada categoria (feitos à mão, servem de fixture e de exemplo para a IA) |
| **F2** | Gerenciador | Import/validação/preview, grid, status, versões, export `.eftpl`, gerador de prompt |
| **F3** | Social | Wizard completo, export png/jpg/zip (desktop; mobile adiado, ver F6+) |
| **F4** | Slides + PDF | Upload de conteúdo, matching, editor on-screen, export PDF |
| **F5** | Robustez | Backup/restore, gestão de espaço, criptografia de dados, undo, polish |
| **F6+** | Futuro | Tauri, mobile (RF-S3), slots `adjustable`, biblioteca de equipe via pasta sincronizada, temas de UI |

Cada fase termina com o app utilizável de ponta a ponta no que já existe (nada de fases só de infraestrutura após F0).

---

## 11. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| Navegador limpar IndexedDB | Perda de dados | `storage.persist()` + backups lembrados + PWA instalado (cota persistente) |
| Fidelidade de render entre navegadores | Export inconsistente | Motor único preview=export; Chrome como referência; testes visuais dos templates fixture |
| Templates da IA fora do spec | Frustração no upload | Validador com erros específicos + gerador de prompt que embute o spec + fixtures de exemplo |
| Escopo do editor de slides crescer ("virar Figma") | Atraso grave | Limite explícito §7.3; qualquer edição além de conteúdo é v2 |
| Login local percebido como segurança forte | Expectativa errada | Criptografia real dos dados + limitação documentada na UI |
| Cota de storage estourar com muitos assets | App trava | Monitoramento RNF-3 + compressão de imagens no upload (max 2560px, webp) |

---

## 12. Decisões em Aberto (para fechar durante F0–F1)

1. Nome final do produto (placeholder: **EF Design Studio**).
2. Identidade visual da UI do app (a pasta `design/` deve receber as referências).
3. ~~Lista definitiva de tags/categorias de organização dos templates.~~ **Fechada (F2.5):** categorias fixas social/slides/pdf; tags canônicas em `prompt-generator.ts` — estilo (minimalista, bold, editorial, elegante, corporativo, divertido, retro), tema (produto, promocao, evento, institucional, educativo, relatorio, proposta, portfolio), tom (claro, escuro, colorido).
4. ~~Se export JPG terá controle de qualidade exposto ou fixo em 90.~~ **Fechada (F3.3):** fixa em 90, sem controle exposto na v1 (`JPG_QUALITY` em `src/export/social-export.ts`).
5. Limites exatos do carousel (min 2 / max 10 é o default do Instagram — confirmar).

---

## 13. Glossário

- **Template**: pacote `.eftpl` com design pronto e slots editáveis.
- **Slot**: ponto de inserção de conteúdo declarado no manifest.
- **Variant**: variação de layout pré-desenhada dentro de um template.
- **Formato**: dimensão/tipo de saída (stories, slide 16:9, A4...).
- **Projeto**: instância de uso de um template com conteúdo próprio.
- **Documento de conteúdo**: `content.json` ou Markdown gerado por IA externa com o material a fluir nos slots.
- **Pacote**: arquivo zip (`.eftpl` para templates, `.efbackup` para backups).

---

## 14. Próximo Passo

Derivar deste documento o **CLAUDE.md** do repositório, contendo: princípios (§1.1), stack e convenções (§2), os dois contratos de arquivo (§5 e §6 na íntegra — são a interface com a IA), limites de escopo do editor (§7.3) e o roadmap ativo. O CLAUDE.md deve ser instrução operacional (como construir), enquanto este escopo permanece como fonte de verdade do produto (o que construir).
