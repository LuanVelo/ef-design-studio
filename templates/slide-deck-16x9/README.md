# Slides Editorial

## Visão geral

Template de apresentação institucional em estilo editorial: fundo claro, margens generosas de 120px, tipografia Roboto (títulos) + Figtree (corpo) e 12 variações de layout que cobrem capa, transição e páginas de conteúdo com e sem imagem. Desenhado a partir do deck "Slide Deck" (Figma), pensado para propostas comerciais, apresentações institucionais e materiais de escritórios de serviços profissionais.

## Formatos

| key | Dimensões | Multi-página |
|---|---|---|
| `slide-16x9` | 1920×1080 | sim |

## Slots

| key | Tipo | Obrigatório | Limites | Orientação |
|---|---|---|---|---|
| `layout-variant` | variant | — | 12 opções | Ver seção Variações |
| `titulo` | text | não | 40 chars, 1 linha | Título da seção, exibido em caixa alta com espaçamento largo |
| `menu` | list | não | 4 itens × 20 chars | Breadcrumb/menu; o 1º item aparece destacado, os demais esmaecidos com separador |
| `destaque` | richtext | não | 220 chars | Parágrafo introdutório em negrito (Roboto Bold 32px) |
| `texto-1` | richtext | não | 360 chars | Coluna de texto 1; linha em branco separa parágrafos |
| `texto-2` | richtext | não | 360 chars | Coluna de texto 2 |
| `texto-3` | richtext | não | 360 chars | Coluna de texto 3 (só na variant `tres-colunas`) |
| `destaque-grande` | richtext | não | 300 chars | Frase de impacto em 48px |
| `titulo-grande` | richtext | não | 200 chars | Título de capa/transição em 72px; na transição, `<b>` vira o trecho em bold |
| `imagem` | image | não | fit `cover`, proporção livre | Nas variants de conteúdo entra numa moldura cinza; nas capas/transição é fundo de página inteira |

## Variações

| Variant | Quando usar |
|---|---|
| `capa-imagem` | Capa com foto de página inteira (prefira imagens claras — o texto é escuro) |
| `capa-lisa` | Capa sem foto, fundo na cor `cor-fundo-capa` |
| `transicao` | Separador de seção: fundo navy + foto esmaecida (30%) + frase em branco |
| `duas-colunas-img-direita` / `-esquerda` | Conteúdo denso (destaque + 2 colunas) com imagem emoldurada dentro das margens |
| `duas-colunas-img-direita-cheia` / `-esquerda-cheia` | Mesmo conteúdo, imagem sangrando até as bordas |
| `img-grande-esquerda` / `-direita` | Imagem dominante (56% do slide) + coluna estreita com um parágrafo ancorado embaixo |
| `tres-colunas` | Texto corrido distribuído em 3 colunas iguais |
| `uma-coluna` | Uma única afirmação em 48px, ancorada na parte inferior |
| `texto-destaque` | Duas colunas assimétricas: frase de 48px à esquerda, detalhamento em 32px à direita (feche com `<b>` para ênfase) |

## Diretrizes de conteúdo

- Os limites de caracteres foram calculados para o texto caber sem corte; o excedente é cortado no limite da mancha (o design governa).
- Em `texto-*`, separe parágrafos com uma linha em branco — o template aplica o respiro de 42px.
- `menu` funciona como localizador da apresentação (ex.: Introdução | Estratégia | Proposta); mantenha itens curtos.
- Fotos escuras funcionam melhor em `transicao`; claras em `capa-imagem` e nas molduras de conteúdo.
- Cores editáveis: `cor-texto`, `cor-fundo`, `cor-fundo-imagem`, `cor-fundo-capa`, `cor-overlay`. O tom esmaecido do menu deriva automaticamente de `cor-texto`.

## Changelog

- **1.0.0** — Versão inicial: 12 variants, fontes Roboto + Figtree (variáveis, OFL), 5 cores editáveis.
