# PLANO.md — Plano de Execução por Etapas

**Regras de uso deste plano:**
- Executar em ordem; cada etapa tem critério de aceite verificável. Marcar `[x]` ao concluir.
- Uma etapa só está concluída quando o critério de aceite passa **e** o app continua rodando de ponta a ponta.
- Ao final de cada fase: commit marcado (`f0-done`, `f1-done`...), atualizar a tabela de status no CLAUDE.md.
- Decisões em aberto (§12 do ESCOPO) têm prazo marcado nas etapas onde precisam ser fechadas.

---

## F0 — Fundação

### F0.1 Scaffold
- [x] `npm create vite@latest app -- --template react-ts`; instalar Tailwind, React Router, Zustand, Dexie, zod, nanoid.
- [x] Configurar path aliases (`@core`, `@data`, `@features`, `@components`, `@export`, `@auth`).
- [x] Lint (oxlint — novo padrão do scaffold Vite, no lugar de ESLint) + Prettier + vitest configurados; `npm run lint` e `npm run test` verdes.
- **Aceite:** `npm run dev` sobe página placeholder; `npm run build` gera `dist/` sem erros.

### F0.2 Tokens de design e shell da UI
- [x] Implementar tokens de [design/DIRETRIZES-UI.md](../design/DIRETRIZES-UI.md) §3 via `@theme` no CSS (Tailwind v4; cores, raios, sombras, tipografia Inter self-hosted via @fontsource).
- [x] Componentes base: `Shell` (canvas + superfície arredondada), `TopBar` (logo | ações + avatar), `PillButton` (primário preto / ghost), `Card`, `Modal` (backdrop blur), `Badge` de categoria/status com as cores R5.
- [x] Rotas vazias: `/` (home), `/templates`, `/social`, `/slides`, `/login`.
- [x] Detecção de breakpoint (celular <768 / tablet 768–1199 / desktop ≥1200) num hook `useDevice`.
- **Aceite:** navegação entre telas placeholder com o shell visual conforme diretrizes (conferir lado a lado com o board).

### F0.3 Camada de dados
- [x] Dexie com stores `users`, `templates`, `projects`, `exports_history`, `settings`; migrations versionadas.
- [x] Repositórios tipados por store (CRUD + convenções `id`/`createdAt`/`updatedAt`/`ownerUserId`). Pacotes armazenados como `ArrayBuffer` (portátil + testável; fake-indexeddb não clona Blob).
- [x] `fs-adapter` em `data/`: abrir arquivo (picker + drag-and-drop), salvar arquivo (download). **Todo** IO de arquivo passa por aqui.
- [x] Solicitar `navigator.storage.persist()` no boot; expor `storage.estimate()` num util (com flag `nearLimit` a 80%).
- **Aceite:** teste vitest de round-trip em cada repositório (fake-indexeddb).

### F0.4 Login local
- [x] Primeiro uso: criar usuário+senha → hash PBKDF2 (≥310k iterações, salt aleatório) no IndexedDB. Senha nunca armazenada.
- [x] Tela de login (estilo R6: headline + pill CTA): lista de perfis do navegador, senha, erro claro.
- [x] Sessão com expiração por inatividade (default 8h, configurável) + logout; dados isolados por `ownerUserId`.
- [x] Texto de limitação de segurança visível na tela de criação de conta (modelo honesto).
- **Aceite:** criar usuário, deslogar, logar de novo, dados isolados entre dois perfis. (Criptografia AES-GCM dos dados fica para F5 — não bloquear F0.)

### F0.5 PWA + deploy
- [x] vite-plugin-pwa: manifest (nome placeholder "EF Design Studio", ícones estética R7 em `public/icons/`), service worker cacheando app shell (verificado: SW ativo + 19 entradas em precache no preview).
- [x] Repositório GitHub + GitHub Actions: push na `main` → build → deploy no Pages. Repo: https://github.com/LuanVelo/ef-design-studio · URL: https://luanvelo.github.io/ef-design-studio/
- [x] Funcionamento offline após 1º load verificado (SW ativo + app shell em precache). Instalação como app no Chrome/Edge: testar manualmente na URL pública.
- [x] **Extra:** versionamento semântico — versão única no `package.json` (v0.0.1), exibida na UI (login + rodapé), `npm run release:patch|minor|major`, GitHub Release automática em tags `v*`.
- **Aceite:** URL pública funcionando; app instala e abre offline.
- **Fechar decisão §12.1:** nome final do produto (necessário para manifest/ícone definitivos — pode ficar placeholder até F5).

---

## F1 — Contrato de Template

### F1.1 Schemas zod
- [x] `core/schemas/`: `TemplateManifest`, `FormatDef`, `SlotDef` (união discriminada por `type`, incluindo `page-group` e `list` com `maxItems`/`itemMaxChars`), `ContentDocument`, `SlotOverride`. (Template/Project persistidos seguem em `data/types.ts` até o F2 precisar deles.)
- [x] Catálogo de formatos canônicos embutido (tabela do CLAUDE.md) + suporte a formatos customizados do manifest. Manifest real do `ef-slides-editorial-01` validado nos testes.
- **Aceite:** testes com manifests válidos/inválidos; tipos exportados via `z.infer` usados nos repositórios.

### F1.2 Validador de pacote `.eftpl`
- [x] Abrir zip (JSZip) e validar: manifest parseável e válido; layouts declarados existem; thumbnail presente; fontes referenciadas existem; README presente.
- [x] Análise dos HTML: rejeitar `<script>`, handlers `on*`, `javascript:`; rejeitar URLs `http(s)` em `src`/`href`/`url()` (HTML e CSS); cruzar `data-slot` do HTML com slots do manifest (faltante = erro; sobrando = warning; `page-number` isento).
- [x] Sanitização DOMPurify na importação (defesa em profundidade, além da validação).
- [x] Resultado estruturado: erros/warnings com código + mensagem pt-BR (`core/validate/eftpl.ts`). Testes: pacote real aceito + 14 fixtures de erro gerados por mutação do pacote real.
- **Aceite:** suíte de testes com pacotes quebrados de cada tipo (fixtures de erro) retornando a mensagem certa.

### F1.3 Motor de render
- [x] Componente `TemplateRenderer`: iframe `sandbox="allow-same-origin"`, injeta HTML do layout + CSS inline com `url()` reescrito para object URLs das fontes, tamanho nativo do formato, escala CSS externa (fit ao container ou fixa).
- [x] Injeção de conteúdo: texto em `data-slot` (com `maxChars` truncado + sinalizado), richtext restrito (b/i/strong/em/br via DOMPurify), `<img>` com `fit`, lista (`maxItems`/`itemMaxChars`), classe `variant-<option>` no raiz, custom properties para cores, `slot-empty`, `page-number`.
- [x] Captura: `html-to-image` no raiz do iframe, `pixelRatio` 1 e 2, tempo medido. Verificado no harness `/dev/render`: @2x 3840×2160 em ~170ms (RNF-1 ok). Obs.: captura exige aba visível (página `hidden` não rasteriza — irrelevante em uso real).
- **Aceite:** render de um layout fixture com todos os tipos de slot; captura @2x pixel-perfect comparada com screenshot manual do Chrome.

### F1.4 Templates fixture (3 pacotes)
- [x] `ef-social-basico`: stories + feed-square + feed-portrait + carousel-square (2–10), slots text/richtext/list/image/variant + 3 cores editáveis, 3 variants.
- [x] Slides: coberto pelo `ef-slides-editorial-01` (template real aprovado, 12 variants) no lugar do "ef-slides-basico" planejado. (`page-group` validado no schema; template com page-group fica para quando o fluxo F4 exercitar o caso.)
- [x] `ef-pdf-basico`: pdf-a4-portrait, header/footer, variants capa/conteudo, slot `page-number` automático.
- [x] READMEs completos no formato fixo; Inter WOFF2 embutida; thumbnails (provisórios nos 2 novos — regenerar com captura real no F2).
- [x] `content/fixtures/`: `proposta-slides.content.json`, `relatorio-pdf.content.json`, `proposta-slides.md`; fontes dos pacotes em `templates/`, dist em `templates/dist/`.
- **Aceite:** ✅ os 3 passam no validador F1.2 e renderizam no motor F1.3 (testes automatizados + verificação DOM no navegador via `/dev/render?pkg=<id>`).
- **Decisão §12.5 fechada:** carousel 2–10 páginas (no catálogo canônico e no manifest do social).

---

## F2 — Gerenciador de Templates

### F2.1 Importação (RF-G1)
- [x] Tela de importação: drag-and-drop + picker (via fs-adapter), estado vazio com ilustração (estilo R7).
- [x] Fluxo: validar → tela de preview (thumbnail, metadados, formatos, erros/warnings) → confirmar → gravar `Template` (com `packageBytes` e `thumbnailBytes` + snapshot do manifest), status `novo`.
- [x] Conflito de `id`: dialog oferecendo "nova versão" / "importar como cópia" (versão idêntica instalada bloqueia "nova versão"; cópia ganha manifestId derivado `-copia[-n]` com origem marcada).
- **Aceite:** ✅ 3 fixtures importados pela UI (drop real no navegador) + conflito e pacote corrompido com mensagem específica; testes vitest de análise/gravação/conflito/cópia/isolamento por usuário.

### F2.2 Grid principal (tela do Gerenciador)
- [x] Grid de cards conforme R3/R5: pilha fanada de thumbnails por formato, nome, badge de categoria colorido, versão, badges `novo`/`recente`, contagem de uso, data em caps pequenas.
- [x] Busca por texto (insensível a acentos, cobre nome/descrição/tags), filtros (categoria/tag/status), ordenação (recentes, mais usados, A–Z, importação); seção "Recentes" no topo (janela de 7 dias, some com filtros ativos).
- [x] Regras de status: `novo` expira p/ `ativo` (14 dias ou 1º uso, aplicado no load); `recente` calculado por `lastUsedAt`; grid mostra a maior versão de cada manifestId.
- **Aceite:** ✅ verificado no navegador com 6 templates (fixtures + cópias): busca, 3 filtros e 4 ordenações; mobile (<768px) esconde importação e mostra aviso somente leitura. Lógica pura em `template-filters.ts` com testes vitest.

### F2.3 Detalhe do template (RF-G2)
- [x] Preview navegável de todos os formatos e variants (usando o motor F1.3 com conteúdo de amostra compartilhado em `core/render/sample.ts`), README renderizado (marked + DOMPurify), metadados, histórico de versões (mesma manifestId, semver desc, navegável).
- **Aceite:** ✅ verificado no navegador: social 4 formatos, slides 12 variants, pdf 2 variants + page-number automático; README com as 6 seções fixas renderizado.

### F2.4 Gestão: status, versões, export (RF-G3/G4/G5/G7)
- [x] Arquivar/desarquivar; aba Arquivados (com contagem); exclusão definitiva com confirmação dupla, bloqueada se houver projetos vinculados fora da lixeira (oferece arquivar no lugar).
- [x] Versionamento: reimportar mesmo `id` com versão maior = nova versão (registro novo, mesmo manifestId); helper `newerVersionOf()` pronto para o aviso "versão mais nova disponível" nos projetos (UI chega com projetos na F3/F4).
- [x] Exportar `.eftpl` (baixa `packageBytes` via fs-adapter, nome `<id>-v<versão>.eftpl`); duplicar template (manifestId derivado `-copia[-n]`, origem marcada, status novo, contadores zerados).
- **Aceite:** ✅ ciclo completo verificado no navegador: importar → usar (uso simulado) → arquivar/desarquivar → nova versão v1.1.0 (radio pré-selecionado, histórico com 2 versões) → duplicar → excluir com dupla confirmação → exclusão bloqueada por projeto vinculado oferecendo arquivar. Export coberto por teste unitário (fs-adapter mockado).

### F2.5 Gerador de prompt (RF-G6)
- [x] Formulário (nome, categoria, formatos canônicos, descrição do design, slots, tags) → prompt completo com a spec do `.eftpl` embutida (estrutura do zip, manifest, regras duras de layout, seções do README) → botão copiar (clipboard).
- **Aceite:** ✅ ida e volta real: prompt gerado pela UI → pacote `ef-aviso-interno-01.eftpl` produzido pelo Claude seguindo só o prompt → importado sem nenhum erro e renderizando (variants ok).
- **Decisão §12.3 fechada:** categorias fixas social/slides/pdf; tags canônicas em 3 grupos — estilo (minimalista, bold, editorial, elegante, corporativo, divertido, retro), tema (produto, promocao, evento, institucional, educativo, relatorio, proposta, portfolio), tom (claro, escuro, colorido). Fonte: `prompt-generator.ts` (CANONICAL_TAGS).

---

## F3 — Social Templates

### F3.1 Wizard: estrutura + etapas 1–2
- [x] Wizard linear com navegação livre entre etapas (stepper no topo); nome do projeto editável inline; indicador "Salvo automaticamente".
- [x] Etapa 1: seletor de template = modal padrão R8 (`TemplateSelectorModal`, reutilizável na F4: sidebar busca+status+ajuda, grid com hover "Usar"), só `category: social` e status ativo/novo/recente, maior versão por id; etapa 1 do wizard mostra o template com aviso "versão mais nova disponível" (RF-G4) e permite trocar.
- [x] Etapa 2: multi-seleção de formatos do manifest (obrigatório ≥1 para avançar); etapas 3–4 com placeholder até F3.2/F3.3.
- [x] `Project` rascunho criado na escolha do template (marca 1º uso: lastUsedAt + usageCount); autosave em cada mudança (RF-S2); "Meus projetos" com cards R4 (thumbnail, "editado há X", badge rascunho/finalizado).
- **Aceite:** ✅ verificado no navegador: criar projeto → selecionar formatos → recarregar o app → retomar de "Meus projetos" na etapa e com os formatos salvos. Testes vitest de criação/autosave/listagem/retomada.

### F3.2 Etapa 3: conteúdo + preview
- [x] Formulário gerado dos slots do manifest (componente por tipo em `SlotFields.tsx`: text com contador, richtext restrito com botões B/I, upload de imagem via fs-adapter com compressão 2560px/webp q0.85, variant, color, list com maxItems).
- [x] Preview ao vivo (debounce 250ms) lado a lado com tabs por formato; conteúdo compartilhado + override por campo/formato (pin "por formato" copia o valor atual; despinar volta ao compartilhado).
- [x] Carousel: gerenciador de páginas (mínimo do template auto-criado; adicionar/duplicar/reordenar drag/excluir respeitando min/max); página sobrepõe o compartilhado por slot.
- [x] Layout mobile: empilhado (preview acima, form abaixo); autosave com debounce 400ms + flush ao sair.
- **Aceite:** ✅ verificado no navegador com o fixture social: texto/richtext/variant/cor ao vivo; override de título por formato persiste após reload; carousel 2→3 páginas com conteúdo por página; imagem 3000px comprimida para 2560px webp; mobile empilhado (preview primeiro). Lógica de merge/páginas com testes vitest. (Teste em celular físico: fazer no aceite da F3.3 junto com Web Share.)

### F3.3 Etapa 4: export
- [x] PNG/JPG, @1x/@2x; todos os formatos de uma vez em `.zip` com nomes `<projeto>-<formato>-<página>.<ext>` (carousel numerado; arquivo único baixa direto); pipeline em `src/export/social-export.ts` reusando o motor F1.3 (iframe fora da tela + captura).
- [x] Web Share API quando `navigator.canShare({files})`; registro em `exports_history` (um por formato); guard com mensagem clara quando a aba está oculta (html-to-image não rasteriza em página hidden — F1.3).
- [x] Medição por peça + total exibida na UI com selo do RNF (<5s @2x); projeto marcado `finalizado` após export.
- **Aceite:** ⚠️ parcialmente verificado — plano/nomes (testes + navegador: 5 arquivos p/ stories+feed+carousel×3), render+injeção dos iframes de export ok, guard de aba oculta ok; captura @2x já medida na F1.3 (~170ms/peça). **Pendente com aba visível/celular real:** rodar o export completo (zip abre + tempos) e Web Share — painel do navegador estava oculto na sessão.
- **Decisão §12.4 fechada:** qualidade JPG **fixa em 90** (constante `JPG_QUALITY`), sem controle exposto na v1.

---

## F4 — Slides + PDF

### F4.1 Entrada: template, formato, conteúdo
- [x] Etapa 1–2: seletor (modal R8 agora multi-categoria: `slides`+`pdf`) + escolha de formato (direto quando o template só tem um); bloqueio em celular com aviso (RF-SL3) na lista e no editor.
- [x] Upload de `content.json` **ou** Markdown (parser H1/H2 = novo slide com título, corpo = texto, `-` = bullets) **ou** começar em branco; botão "Copiar prompt para IA" com o Contrato 2 + slots/variants/limites do template embutidos; projeto renomeado com o título do documento.
- [x] Matching: keys casadas preenchem slots (variant sugerida validada contra as options, default como fallback; imagens nunca vêm do documento); sobras → painel "Conteúdo não mapeado" com drag para qualquer campo de slide; obrigatórios vazios sinalizados por slide.
- **Aceite:** ✅ verificado no navegador: content.json do fixture casa 100% com o editorial (6 slides, projeto renomeado); Markdown gera 4 slides + 3 não mapeados; drag de item não mapeado preencheu o slot `destaque` (preview atualizou e persistiu após reload); bloqueio mobile ok. Parser/matching com testes vitest sobre os fixtures reais.

### F4.2 Editor on-screen
- [x] Filmstrip lateral: miniaturas (motor de render em escala), reordenar drag, duplicar, excluir (mín. 1), adicionar com escolha de variant (modal com as options).
- [x] Canvas central com zoom fit/50/100%; toolbar pill escura flutuante na base (padrão R2) com indicador de slide.
- [x] Edição inline de texto no canvas (contentEditable no iframe, commit no blur, richtext sanitizado, maxChars); troca de imagem + pan/zoom dentro do frame (sliders → `imageTransforms` no motor único, vale para preview e export); variant por slide; cores e listas no painel lateral; painel "não mapeado" com mapeamento por select.
- [x] **Guardrail:** nenhuma UI de mover/redimensionar/criar elementos — só conteúdo dos slots.
- [x] Autosave contínuo (RF-SL2, debounce 400ms + flush ao sair).
- **Aceite:** ✅ verificado no navegador com o editorial: 4→5 slides (add com variant `transicao`, duplicar, excluir), edição inline persistiu após reload, imagem com pan 20%/zoom 1.5× persistiu, variant por slide, mapeamento de não-mapeado. (Montagem de 8 slides do zero: coberta pelos mesmos controles.)

### F4.3 Export PDF/PNG
- [x] Pipeline: render por página @2x → compor PDF (pdf-lib) em dimensão nativa (px 96dpi → pt 72dpi); alternativa PNGs numerados em zip (@1x/@2x); registro em exports_history + projeto finalizado; guard de aba oculta.
- [x] Slot `page-number` preenchido automaticamente (motor único via content.pageNumber por página).
- [x] Fluxo PDF completo = fluxo Slides com formatos `pdf-a4-*` (seletor multi-categoria, sem UI separada).
- **Aceite:** ⚠️ dialog/opções/guard verificados no navegador; captura final (fidelidade do PDF + numeração no fixture) pendente de aba visível — item do roteiro de testes do usuário.

---

## F5 — Robustez

### F5.1 Backup/restore
- [ ] Export `.efbackup` (zip JSON + assets) manual; lembrete a cada 7 dias sem backup.
- [ ] Import com restaurar ou mesclar (merge por `id`+`updatedAt`, conflitos listados para o usuário).
- **Aceite:** backup num perfil, restore noutro navegador, tudo íntegro; merge com conflito resolve certo.

### F5.2 Criptografia de dados
- [ ] AES-GCM nos registros do IndexedDB, chave derivada da senha (PBKDF2); ligada por padrão, migração dos dados existentes no primeiro login após update.
- **Aceite:** dados ilegíveis inspecionando IndexedDB sem login; performance de listagem aceitável.

### F5.3 Espaço, undo, integridade
- [ ] Tela de gestão de espaço: uso por template/projeto, limpeza de exports antigos; aviso a 80% da cota.
- [ ] Soft delete 30 dias para projetos (lixeira com restauração); undo nas exclusões relevantes.
- **Aceite:** RNF-3 e RNF-7 verificados manualmente.

### F5.4 Polish final
- [ ] Passada de acessibilidade (teclado no gerenciador e formulários, contraste AA no cromo).
- [ ] Passada visual contra [design/DIRETRIZES-UI.md](../design/DIRETRIZES-UI.md) tela a tela.
- [ ] Teste cross-browser (Firefox, Safari com degradação aceitável em export batch).
- [ ] Nome final + ícones definitivos (fecha §12.1); documentação de limitação de segurança revisada.
- **Aceite:** checklist de RNFs do CLAUDE.md 100% verde; tag `v1.0`.

---

## Status

| Fase | Status | Data |
|---|---|---|
| F0 | concluída — app público em https://luanvelo.github.io/ef-design-studio/ | 30/07/2026 |
| F1 | concluída (tag f1-done) | 30/07/2026 |
| F2 | concluída (tag f2-done) | 31/07/2026 |
| F3 | implementada — aceite de export pendente do teste do usuário (aba visível/celular); tag f3-done após | 31/07/2026 |
| F4 | implementada — aceite de export PDF pendente do teste do usuário; tag f4-done após | 31/07/2026 |
| F5 | não iniciada | — |
