# templates/ — fontes e pacotes de templates

Convenção desta pasta:

- **`<nome-do-template>/`** — fonte editável de cada template no layout exato do contrato `.eftpl` (manifest.json, layouts/, styles/, fonts/, README.md, thumbnail.png). A subpasta **`preview/`** fica FORA do pacote: é o harness de aprovação visual (`index.html`, aceita `?variant=X&bare=1&limite=1&vazio=1&semimg=1`), amostras e screenshots.
- **`dist/`** — pacotes `.eftpl` finais (zip; gerar sempre com paths forward-slash — `tar -a -cf pacote.zip ...` e renomear para `.eftpl`; NÃO usar `Compress-Archive`, que grava backslashes e quebra o JSZip).

Para visualizar um template: servidor estático na raiz do repo (config `templates-preview` em `.claude/launch.json`) e abrir `templates/<nome>/preview/index.html`.

## Templates existentes

| Pasta | id | Formato | Origem | Status |
|---|---|---|---|---|
| `slide-deck-16x9/` | `ef-slides-editorial-01` | slide-16x9 (1920×1080), 12 variants | Figma "Slide Deck" (`sFvZsquxwoqpGekGozwBXq`) | Aprovado e empacotado em `dist/` (2026-07-30) |
