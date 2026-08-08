# Social Editorial

## Visão geral

Template de post para Instagram da marca **Espíndola Fonseca**. Composição editorial de
alto contraste: fundo azul-marinho, manchete em serifada de display ancorada no topo,
grande respiro no miolo, lockup da marca na base e faixa dourada fechando a peça.

Serve a posts de conteúdo — manchete de notícia, tese jurídica, frase de posicionamento.
Não usa imagem: a força da peça está no texto e no vazio ao redor dele.

Origem: Figma "Social Media template" (`F79TjyIx9DEb3WK9Gl19Fe`), frame `1080x1080` (node `13:5`).
Todas as medidas (margem 72, título a 128 do topo em caixa de 565, logo 414×234.337,
faixa de 61) vieram direto do arquivo.

## Formatos

| key | Dimensões | Páginas |
|---|---|---|
| `feed-square` | 1080×1080 | única |

## Slots

| key | tipo | obrigatório | limites | orientação |
|---|---|---|---|---|
| `layout-variant` | variant | — | `manchete` (padrão) | única variação por enquanto |
| `titulo` | text | sim | 140 caracteres, multilinha | manchete da peça; quebra automática, quebra manual respeitada |

Cores editáveis: `cor-fundo` (#01233C), `cor-texto` (#F7F7F7), `cor-marca` (#BEA57C),
`cor-faixa` (#C6B08C). O logo é SVG inline e acompanha `cor-marca` (lockup) e
`cor-texto` (assinatura "ADVOCACIA"), então inverter a peça para fundo claro é só
trocar as quatro cores.

## Variações

- **`manchete`** — única composição: título no topo, marca na base, faixa no rodapé.
  Use para qualquer post de texto. Novas variações entram aqui conforme os demais
  frames do Figma forem aprovados.

## Diretrizes de conteúdo

- A manchete respira melhor entre **3 e 5 linhas** (aprox. 60 a 120 caracteres). Uma
  linha só deixa a peça vazia demais; acima de 140 o app trunca.
- A caixa do título tem altura fixa de 565px e recorta o excesso — é proposital,
  espelha o frame do Figma. Se o texto encostar no limite, corte a manchete em vez de
  reduzir o corpo.
- Aspas tipográficas (“ ”) e acentuação completa do pt-BR estão no subset da fonte.
- O texto é ancorado no topo: o vazio entre manchete e logo faz parte do desenho, não
  é erro de composição.

## Changelog

- **1.0.0** — versão inicial: formato `feed-square`, variação `manchete`, logo inline
  temático. Tipografia de display em **Playfair Display** (OFL) como substituta de
  **Presti Display**, que é a fonte do arquivo original e ainda não tem `.woff2`
  licenciado no repositório — ao receber o arquivo, basta trocar
  `fonts/playfair-display-var.woff2` e o `@font-face`/`font-family` em `styles/base.css`.
