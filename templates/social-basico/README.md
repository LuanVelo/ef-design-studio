# Social Básico

## Visão geral

Template social de referência do EF Design Studio: tipografia forte (Inter), chips de tópicos, pill de CTA na cor de destaque e três composições. Serve como exemplo canônico do contrato `.eftpl` para peças sociais — cobre formato único, carousel multi-página e todos os tipos de slot de conteúdo.

## Formatos

| key | Dimensões | Páginas |
|---|---|---|
| `stories` | 1080×1920 | única |
| `feed-square` | 1080×1080 | única |
| `feed-portrait` | 1080×1350 | única |
| `carousel-square` | 1080×1080 | 2–10 |

## Slots

| key | Tipo | Obrigatório | Limites | Orientação |
|---|---|---|---|---|
| `layout-variant` | variant | — | 3 opções | Escolha da composição |
| `titulo` | text | sim | 60 chars | Frase curta e forte; quebras de linha permitidas |
| `descricao` | richtext | não | 140 chars | Complemento do título; negrito/itálico permitidos |
| `cta` | text | não | 30 chars | Verbo de ação ("Saiba mais", "Garanta o seu") |
| `topicos` | list | não | 4 itens × 24 chars | Chips curtos em caps (categorias, benefícios) |
| `imagem-hero` | image | não | fit: cover | Foto de produto/ambiente; qualquer proporção |

## Variações

- **imagem-cheia** (default): a imagem cobre a peça inteira; texto branco sobre gradiente escuro na base. Use com fotos de boa qualidade e área inferior limpa.
- **imagem-metade**: imagem na metade superior, texto sobre o fundo claro embaixo. Use quando o texto precisa de máxima legibilidade.
- **so-texto**: sem imagem; círculo decorativo na cor de destaque. Use para avisos, frases e datas.

## Diretrizes de conteúdo

Título em até 2 linhas, sem ponto final. Descrição complementa (não repete) o título. CTA sempre no imperativo. Em carousel, mantenha o mesmo variant em todas as páginas e varie apenas o conteúdo; primeira página apresenta, últimas chamam para ação.

## Changelog

- 1.0.0 — versão inicial (fixture de referência do contrato).
