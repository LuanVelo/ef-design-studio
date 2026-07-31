# PDF Básico

## Visão geral

Template de documento A4 retrato de referência do EF Design Studio: capa com barra de destaque, páginas de conteúdo com header/footer e numeração automática. Serve como exemplo canônico do contrato `.eftpl` para a categoria `pdf`, incluindo o slot especial `page-number`.

## Formatos

| key | Dimensões | Páginas |
|---|---|---|
| `pdf-a4-portrait` | 794×1123 (A4 @96dpi) | multi |

## Slots

| key | Tipo | Obrigatório | Limites | Orientação |
|---|---|---|---|---|
| `layout-variant` | variant | — | 2 opções | `capa` na 1ª página; `conteudo` nas demais |
| `titulo` | text | sim | 70 chars | Na capa: título do documento; no conteúdo: título da seção (vira caps no header) |
| `subtitulo` | text | não | 90 chars | Cliente, data ou resumo da seção |
| `corpo` | richtext | não | 2200 chars | Texto corrido; parágrafos separados por linha em branco |
| `topicos` | list | não | 6 itens × 90 chars | Lista com marcadores quadrados na cor de destaque |
| `rodape` | text | não | 80 chars | Repetir em todas as páginas (ex.: nome do documento/empresa) |
| `page-number` | especial | — | automático | Preenchido pelo app; não enviar conteúdo |

## Variações

- **capa**: título grande com barra de destaque + subtítulo; corpo e tópicos ficam ocultos. Use apenas na primeira página.
- **conteudo** (default): header com o título da seção, miolo com subtítulo/corpo/tópicos e rodapé com numeração.

## Diretrizes de conteúdo

Uma seção por página; se o corpo estourar a altura, dividir em duas páginas com o mesmo título de seção. Rodapé idêntico em todas as páginas. Não numerar manualmente — o app preenche `page-number`.

## Changelog

- 1.0.0 — versão inicial (fixture de referência do contrato).
