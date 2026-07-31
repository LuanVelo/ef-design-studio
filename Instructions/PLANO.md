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

### F1.4 Templates fixture (3 pacotes feitos à mão)
- [ ] `ef-social-basico`: stories + feed-square + feed-portrait + carousel-square, todos os tipos de slot, 3 variants.
- [ ] `ef-slides-basico`: slide-16x9, variants capa/conteúdo-bullets/imagem-texto/fechamento, `page-group`.
- [ ] `ef-pdf-basico`: pdf-a4-portrait, header/footer, slot `page-number`.
- [ ] Cada um com README completo no formato fixo; guardar fontes (Inter subsets WOFF2) e thumbnail.
- [ ] Colocar em `content/fixtures/` + exemplos de `content.json` e Markdown compatíveis.
- **Aceite:** os 3 passam no validador F1.2 e renderizam no motor F1.3. Estes pacotes são o exemplo canônico para a IA.
- **Fechar decisão §12.5:** limites do carousel (confirmar 2–10).

---

## F2 — Gerenciador de Templates

### F2.1 Importação (RF-G1)
- [ ] Tela de importação: drag-and-drop + picker (via fs-adapter), estado vazio com ilustração (estilo R7).
- [ ] Fluxo: validar → tela de preview (thumbnail, metadados, formatos, erros/warnings) → confirmar → gravar `Template` (com `packageBlob` e `thumbnailBlob`), status `novo`.
- [ ] Conflito de `id`: dialog oferecendo "nova versão" / "importar como cópia".
- **Aceite:** importar os 3 fixtures com sucesso; importar cada fixture de erro e ver a mensagem específica.

### F2.2 Grid principal (tela do Gerenciador)
- [ ] Grid de cards conforme R3/R5: pilha fanada de thumbnails por formato, nome, badge de categoria colorido, versão, badges `novo`/`recente`, contagem de uso, data em caps pequenas.
- [ ] Busca por texto, filtros (categoria/tag/status), ordenação (recentes, mais usados, A–Z, importação); seção "Recentes" no topo.
- [ ] Regras de status: `novo` expira p/ `ativo` (14 dias ou 1º uso); `recente` calculado por `lastUsedAt`.
- **Aceite:** todos os filtros/ordenações funcionando com ≥6 templates de teste; mobile = somente leitura.

### F2.3 Detalhe do template (RF-G2)
- [ ] Preview navegável de todos os formatos e variants (usando o motor F1.3), README renderizado, metadados, histórico de versões.
- **Aceite:** navegar por todos os formatos/variants dos 3 fixtures.

### F2.4 Gestão: status, versões, export (RF-G3/G4/G5/G7)
- [ ] Arquivar/desarquivar; aba Arquivados; exclusão definitiva com confirmação dupla, bloqueada se houver projetos vinculados (oferecer arquivar).
- [ ] Versionamento: reimportar mesmo `id` com versão maior = nova versão; projetos apontam para a versão original com aviso "versão mais nova disponível".
- [ ] Exportar `.eftpl` (baixa o `packageBlob`); duplicar template (novo `id`, marca origem).
- **Aceite:** ciclo completo importar→usar→arquivar→nova versão→exportar sem perda.

### F2.5 Gerador de prompt (RF-G6)
- [ ] Formulário (categoria, formatos, descrição do design, slots) → prompt completo com a spec do `.eftpl` embutida + link mental para os fixtures como exemplo → botão copiar.
- **Aceite:** colar o prompt gerado no Claude, receber um `.eftpl`, importar com sucesso (teste real de ida e volta).
- **Fechar decisão §12.3:** lista definitiva de tags/categorias.

---

## F3 — Social Templates

### F3.1 Wizard: estrutura + etapas 1–2
- [ ] Wizard linear com navegação livre entre etapas (stepper no topo).
- [ ] Etapa 1: seletor de template = modal padrão R8 (sidebar de filtros + grid), só `category: social` e status ativo/novo/recente.
- [ ] Etapa 2: multi-seleção de formatos suportados pelo template.
- [ ] Criar `Project` (status `rascunho`) já na entrada; autosave em cada mudança (RF-S2).
- **Aceite:** criar projeto, fechar o app, reabrir e retomar de "Meus projetos".

### F3.2 Etapa 3: conteúdo + preview
- [ ] Formulário gerado dos slots do manifest (componente por tipo de slot: text com contador de chars, richtext restrito, upload de imagem com compressão máx 2560px/webp, variant, color, list).
- [ ] Preview ao vivo (debounce ≤300ms) lado a lado com tabs por formato; conteúdo compartilhado entre formatos + overrides por formato.
- [ ] Carousel: gerenciador de páginas (adicionar/duplicar/reordenar drag/excluir, min/max do template).
- [ ] Layout mobile: empilhado (preview acima, form abaixo), upload da galeria (RF-S3).
- **Aceite:** preencher os fixtures em desktop e celular real; overrides por formato persistem.

### F3.3 Etapa 4: export
- [ ] PNG/JPG, @1x/@2x; todos os formatos de uma vez em `.zip` com nomes `<projeto>-<formato>-<página>.png`; carousel numerado.
- [ ] Web Share API no mobile quando disponível; registro em `exports_history`.
- [ ] Medir: peça @2x em <5s (RNF-1); marcar projeto `finalizado`.
- **Aceite:** zip com todos os formatos abre correto; tempos dentro do RNF.
- **Fechar decisão §12.4:** qualidade JPG exposta ou fixa em 90.

---

## F4 — Slides + PDF

### F4.1 Entrada: template, formato, conteúdo
- [ ] Etapa 1–2: seletor (modal R8, `category: slides` ou `pdf`) + formato; bloqueio em celular com aviso (RF-SL3).
- [ ] Upload de `content.json` **ou** Markdown (parser H1/H2→pages) **ou** começar em branco; botão "Copiar prompt para IA" com schema + slots do template.
- [ ] Matching: slots casados preenchidos; sobras → painel "Conteúdo não mapeado"; obrigatórios vazios sinalizados.
- **Aceite:** importar `content.json` e Markdown dos fixtures; conteúdo não-mapeado aparece no painel e pode ser arrastado para um slot.

### F4.2 Editor on-screen
- [ ] Filmstrip lateral: miniaturas (motor de render @baixa escala), reordenar drag, duplicar, excluir, adicionar com escolha de variant.
- [ ] Canvas central com zoom fit/50/100%; toolbar pill escura flutuante na base (padrão R2).
- [ ] Edição inline de texto no canvas; troca de imagem + pan/zoom dentro do frame; variant por slide; cores editáveis no painel lateral.
- [ ] **Guardrail:** nenhuma UI de mover/redimensionar/criar elementos (limite duro do CLAUDE.md).
- [ ] Autosave contínuo (RF-SL2).
- **Aceite:** montar uma apresentação de 8 slides do zero e editar tudo que é permitido; nada além disso é possível.

### F4.3 Export PDF/PNG
- [ ] Pipeline: render por página @2x → compor PDF (jsPDF/pdf-lib) em dimensão nativa; alternativa PNGs em zip.
- [ ] Slot `page-number` preenchido automaticamente nos templates PDF.
- [ ] Fluxo PDF completo = fluxo Slides com formatos `pdf-a4-*` (sem UI separada além do filtro).
- **Aceite:** PDF de 10+ páginas com fidelidade visual ao preview; numeração automática correta no fixture PDF.

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
| F1 | não iniciada | — |
| F2 | não iniciada | — |
| F3 | não iniciada | — |
| F4 | não iniciada | — |
| F5 | não iniciada | — |
