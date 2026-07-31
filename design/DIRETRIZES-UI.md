# Diretrizes de UI — EF Design Studio

**Fonte:** board `references/App design references.board` (8 referências), analisado em 30/07/2026.
Este documento traduz o board em instruções operacionais. Toda tela do app deve ser confrontada com estas regras.

---

## 1. Direção visual em uma frase

> **Workspace calmo e espacial**: superfícies claras e quentes, cards brancos flutuando com sombras suaves, cromo mínimo, um toque lúdico (thumbnails levemente rotacionados, acentos de cor retrô) — o app é o palco neutro, as peças de design são as protagonistas.

---

## 2. Anotações por referência

### R1 — App de notas espacial (desktop, canvas cinza-esverdeado)
- Canvas de fundo em cinza claro dessaturado; conteúdo = cards soltos em espaço livre.
- Cards de pastas com aba recortada (metáfora de pasta física) e papel levemente empilhado atrás.
- Toolbar em **pill escuro flutuante** no canto (ícones brancos, cantos totalmente arredondados).
- Sticky notes em amarelo/verde-limão como acento pontual de cor.
- **Aplicar em:** vibe geral do Gerenciador; toolbar flutuante do editor de slides.

### R2 — Moodboard "M" (grid espacial de cards)
- Fundo neutro claro (#F5F5F4 aprox.), cards brancos pequenos com raio generoso e sombra difusa.
- Toolbar **pill escuro flutuante centralizado na base** — padrão para ações contextuais do editor.
- Anotações em verde-pastel; highlights de texto em amarelo — linguagem de "rascunho vivo".
- Controles de canto discretos (config no canto inferior esquerdo, mapa/zoom no direito).
- **Aplicar em:** canvas do editor de slides (toolbar base), densidade de cards do grid.

### R3 — "My bookshelf" (álbuns de fotos)
- Container principal = **um grande card branco/creme arredondado inset** sobre fundo cinza — o app inteiro vive dentro de uma "folha".
- Cards de álbum: fundo levemente tonalizado, título manuscrito/casual no topo, **fotos empilhadas e fanadas** (2–3 camadas com leve rotação) como preview.
- Topbar mínima: logo pequeno à esquerda, botão de ação + avatar à direita. Nada mais.
- **Aplicar em:** shell do app (moldura arredondada), cards de template com preview em pilha (multi-formato = fotos fanadas), topbar.

### R4 — Cards de feed social (colagem)
- Card branco/tonalizado arredondado; dentro, **colagem de imagens com cantos arredondados, leve rotação e sobreposição**.
- Rodapé do card: avatar + nome + tempo relativo à esquerda; fileira de ícones minimalistas à direita.
- Tom lúdico e caloroso, sem bordas duras.
- **Aplicar em:** cards de projeto ("Meus projetos"): thumbnail(s) da peça em colagem + nome + "editado há X".

### R5 — Grid de pastas coloridas (flat retrô) ⭐ paleta de acento
- Pastas flat com contorno fino preto, aba recortada, seta → e data em **small caps/mono**.
- Paleta retrô dessaturada-mas-viva: laranja #E8552D aprox., verde #4C9C5E, malva #C4A0C0, amarelo #E4C93F, âmbar #DF8F3E, azul-gelo #D6E8EE, petróleo #4E96A8, lilás #DCCCEA, pêssego #F2CFA0, rosa #EFC8C4, ocre #B8862C, menta #DFEED2.
- **Aplicar em:** cores de categoria/tag (social, slides, pdf) e badges de status; estética dos empty states; datas e metadados sempre em caps pequenas com tracking largo.

### R6 — Hero "Digital Library" (landing)
- Headline grande em grotesca preta, centralizada, com **sticker/emoji inline** no texto; subtítulo pequeno cinza; **CTA em pill preto** com texto branco.
- Objetos coloridos (capas) **fanados saindo da borda inferior** do card branco — profundidade e cor só no conteúdo, nunca no cromo.
- **Aplicar em:** tela de login/boas-vindas e empty states principais (headline + pill CTA + thumbnails de templates espiando da borda).

### R7 — Ícone de pasta glassmorphism
- Pasta escura translúcida (frosted glass) com papéis brancos dentro; fundo cinza-claro liso.
- **Aplicar em:** iconografia de destaque (empty state de importação, drag-and-drop de `.eftpl`), ícone do PWA. Usar com parcimônia — é acento, não linguagem geral.

### R8 — Modal "Templates" (seletor) ⭐ padrão estrutural
- Modal centralizado sobre **backdrop desfocado** (blur do app atrás).
- Layout interno: **sidebar esquerda** (busca no topo + lista vertical de categorias, item ativo com fundo sutil) + **grid de 2–3 colunas** de cards à direita.
- Card de template: rótulo de categoria pequeno cinza no topo, thumbnail centralizado, nome abaixo; hover = overlay com botão "Abrir".
- Rodapé da sidebar: bloco de ajuda com texto pequeno + botão pill.
- Fechar no X do canto superior direito.
- **Aplicar em:** seletor de template (etapa 1 dos wizards Social/Slides), diálogo de importação.

---

## 3. Tokens de design (síntese — implementar no Tailwind config)

### Cor
| Token | Valor aprox. | Uso |
|---|---|---|
| `bg-canvas` | `#EDEDEA` (cinza quente) | Fundo por trás do shell |
| `bg-surface` | `#F9F8F5` (off-white creme) | Shell do app, painéis |
| `bg-card` | `#FFFFFF` | Cards, modais |
| `ink` | `#1A1A1A` | Texto principal, pills escuros |
| `ink-muted` | `#8A8A85` | Metadados, subtítulos |
| `accent-social` | laranja `#E8552D` | Categoria social |
| `accent-slides` | petróleo `#4E96A8` | Categoria slides |
| `accent-pdf` | verde `#4C9C5E` | Categoria pdf |
| Paleta estendida R5 | ver §2-R5 | Tags, badges, empty states |

- Cor saturada **nunca em áreas grandes de cromo** — só em badges, tags, ícones flat e no conteúdo das peças.
- Estados: `novo` = amarelo R5, `recente` = azul-gelo R5, `arquivado` = cinza.

### Forma e profundidade
- Raio: cards `16px`, modais e shell `24px`, pills/botões `9999px`, thumbnails internos `8–12px`.
- Sombras: difusas e largas, opacidade baixa (`0 8px 30px rgb(0 0 0 / 0.08)`); nunca bordas duras com sombra curta.
- Bordas: `1px` em cinza muito claro apenas quando o card estiver sobre superfície branca.
- Elemento assinatura: **pilha fanada** — previews multi-formato/multi-página renderizados como 2–3 camadas com rotação de ±2–4° e offset pequeno.

### Tipografia
- Família única: grotesca neutra (**Inter** variável — já prevista nos templates).
- Headlines: peso 600–700, tracking levemente negativo.
- Metadados (datas, contadores, categoria): `11px`, caps, `letter-spacing: 0.08em` — padrão R5.
- Sem serifadas nem manuscritas na UI (a manuscrita de R3 fica como opção só para nomes de projeto, decidir em F3 — default: não).

### Componentes canônicos
1. **Shell**: fundo `bg-canvas`, conteúdo dentro de uma superfície `bg-surface` arredondada com margem; topbar mínima (logo | ações + avatar).
2. **Pill toolbar escura flutuante**: ações contextuais dos editores; base centralizada (R2) ou canto (R1).
3. **Card de template**: thumbnail em pilha fanada, nome, badge de categoria colorido, metadados em caps pequenas, seta → no hover.
4. **Modal seletor**: backdrop blur + sidebar de filtros + grid (R8). Reutilizar para toda escolha de item.
5. **Pill CTA preto**: ação primária. Secundária = pill outline/ghost.
6. **Empty state**: headline grotesca + subtítulo + pill CTA + ilustração flat (R5) ou glass (R7), com objetos espiando da borda inferior (R6).

### Movimento
- Transições curtas (150–200ms, ease-out); cards com hover de elevação sutil (+2px, sombra maior).
- Modais: fade + scale de 0.98→1; backdrop blur progressivo.
- Nada de animações decorativas contínuas.

### O que **não** fazer
- Sidebar de navegação permanente pesada — a navegação principal é leve (topbar + telas).
- Dark mode na v1 (o cromo é claro por definição; pills escuros são o contraste).
- Gradientes chamativos, glassmorphism generalizado, neon, bordas grossas coloridas.
- Densidade de dashboard corporativo: o app respira; grids com gap generoso (24–32px).
