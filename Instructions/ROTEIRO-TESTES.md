# Roteiro de Testes — EF Design Studio (F0–F4)

**Como usar:** rode em ordem, marcando `[x]`. Onde diz **(chave)** é um item de aceite que destrava tag de fase (`f3-done`/`f4-done`). Anote qualquer estranheza — mesmo visual — para a rodada de UX/UI.

**Onde testar:** `npm run dev` dentro de `app/` (ou a URL pública após push). Os pacotes de teste estão em `templates/dist/` (3 arquivos `.eftpl`) e os documentos de conteúdo em `content/fixtures/`.

> Já verificado automaticamente nesta rodada de build (não precisa repetir, mas vale conferir por cima): validação de pacotes, filtros/ordenação do grid, matching de conteúdo, overrides, autosave/retomada. O foco do seu teste é o que **exige aba visível, celular real ou olho humano**.

---

## 1. Perfis e sessão (F0)

- [ ] Criar um perfil novo (nome + senha ≥4). O texto de limitação de segurança aparece na criação.
- [ ] Sair (botão Sair) e logar de novo. Errar a senha de propósito → mensagem clara.
- [ ] Criar um segundo perfil e confirmar que ele **não vê** templates/projetos do primeiro.

## 2. Gerenciador de Templates (F2)

- [ ] Importar os 3 pacotes de `templates/dist/` — arrastando pelo menos um e usando o botão em outro. Preview de importação mostra thumbnail, formatos e tags.
- [ ] Arrastar um arquivo que não é `.eftpl` → aviso; renomear um `.txt` para `.eftpl` e importar → erro específico de pacote inválido.
- [ ] Reimportar o mesmo pacote → dialog de conflito ("nova versão" bloqueada por ser a mesma versão; "importar como cópia" funciona).
- [ ] Busca com acento errado (ex.: "basico") acha "Básico"; filtros por categoria/status/tag; 4 ordenações.
- [ ] Abrir o detalhe de um template: navegar por todos os formatos e variações, ler o README renderizado.
- [ ] Arquivar um template → some do grid, aparece na aba Arquivados (com contagem) → desarquivar.
- [ ] Duplicar um template e excluir a cópia (confirmação em 2 passos).
- [ ] "Gerar com IA": preencher o formulário, gerar o prompt, copiar. **(bônus)** Colar num chat do Claude, pedir o pacote e importar o resultado.

## 3. Social (F3)

- [ ] Nova peça social → seletor de template (busca e filtro de status na sidebar funcionam) → escolher o Social Básico.
- [ ] Etapa Formatos: selecionar `stories`, `feed-portrait` e `carousel-square`.
- [ ] Conteúdo: preencher título/descrição/CTA e ver o preview atualizar em <1s; trocar variação e cores.
- [ ] Fixar um campo "por formato" (pin) na tab feed-portrait com um texto diferente → conferir que o stories mantém o texto compartilhado.
- [ ] Carousel: adicionar/duplicar/excluir páginas, **reordenar arrastando** os números, conteúdo diferente por página.
- [ ] Enviar uma foto grande (>2560px) → entra comprimida e dá para ver no preview.
- [ ] Fechar o navegador, reabrir → retomar de "Meus projetos" no mesmo ponto.
- [ ] **(chave)** Exportar tudo em .zip @2x: abrir o zip, conferir nomes `<projeto>-<formato>-<página>`, carousel numerado, imagens fiéis ao preview, e o tempo mostrado (<5s por peça).
- [ ] **(chave — celular real)** Abrir o app no celular: gerenciador somente leitura; fluxo social completo empilhado (preview em cima); upload da galeria; exportar e usar o botão **Compartilhar** (Web Share).

## 4. Slides + PDF (F4)

- [ ] Nova apresentação → seletor mostra templates de slides e PDF → escolher o Slides Editorial.
- [ ] Enviar `content/fixtures/proposta-slides.content.json` → 6 slides prontos, projeto renomeado, nada em "não mapeado".
- [ ] Criar outra apresentação e enviar `proposta-slides.md` → 4 slides + itens em "Conteúdo não mapeado"; arrastar/mapear um item para um slot e ver o slide atualizar.
- [ ] "Copiar prompt para IA" no fluxo de slides. **(bônus)** Usar com o Claude e importar o content.json devolvido.
- [ ] Editor: clicar num texto do canvas e editar direto; trocar variação de um slide; trocar imagem e ajustar pan/zoom pelos sliders; reordenar slides arrastando no filmstrip; duplicar/excluir; adicionar slide escolhendo a variação; zoom Ajustar/50%/100%.
- [ ] Montar uma apresentação de 8+ slides do zero ("Começar em branco") só com o que o editor permite — confirmar que **não** existe como mover/redimensionar/criar elementos.
- [ ] **(chave)** Exportar PDF @2x com 10+ páginas: abrir o PDF, fidelidade visual ao preview, dimensão correta (16:9 ou A4).
- [ ] **(chave)** Criar um projeto com o template **PDF Básico** (A4): conferir a numeração automática de página no PDF exportado.
- [ ] Testar também "PNGs (.zip)".
- [ ] No celular: fluxo de slides bloqueado com aviso claro.

## 5. PWA / offline / robustez (F0 + RNFs)

- [ ] Com o app carregado, desligar a rede (DevTools → Network → Offline) e navegar: tudo continua funcionando.
- [ ] Instalar como app (ícone de instalação do Chrome/Edge) e abrir instalado.
- [ ] Deixar um export rodando e trocar de aba no meio → mensagem "o export precisa da aba visível" em vez de travar.

---

## Registro de problemas

| # | Onde | O que aconteceu | Gravidade (bloqueia / incomoda / estético) |
|---|---|---|---|
| 1 | | | |
| 2 | | | |

**Depois do teste:** com os itens **(chave)** ok, me avise para tagear `f3-done`/`f4-done` e publicar (`git push --follow-tags`). Os itens estéticos alimentam a rodada de UX/UI com o seu Figma.
