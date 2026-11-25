# Arte e Sprites — Escritório Virtual

Diretório isolado para criação, organização, validação e catálogo visual dos sprites em pixel art 2D do Escritório Virtual (pisos, paredes, janelas, estações de trabalho, cadeiras, salas de reunião, sofás, copa com cafeteira, estação de impressão, luminárias e plantas), evitando conflitos com o restante do monorepo.

## Padrão Visual: Detailed Modern RPG Office (Low-Wood, Rich Props & Recessed Panels)

Consulte o [STYLE_GUIDE.md](./STYLE_GUIDE.md) para todas as especificações técnicas:

- **Materiais Corporativos (Cara de Escritório, Não de Casa)**: Pisos em **carpete comercial azul-ardósia** (`floor_office_carpet_slate`), **porcelanato técnico cinza-gelo** (`floor_porcelain_tech`), **ladrilho diagonal marfim** (`floor_diamond_cream`) e **lajota de ardósia escura** (`floor_dark_slate_entry`); paredes em **blocos arquitetônicos cinza** (`wall_stone_brick_studio`) e **drywall off-white com rodapé metálico** (`wall_modern_offwhite`).
- **Riqueza de Detalhes Estruturais**: Cantos chanfrados (_1px corner cut_), **painéis rebaixados (_recessed panels_)** nas frentes de bancadas e armários, puxadores, botões e equipamentos corporativos detalhados.
- **Props de Escritório & Vida Real**: Ar-condicionado split inverter na parede (`wall_prop_air_conditioner`), calendário/planner mensal em grade (`wall_prop_calendar_grid`), quadros corporativos (`wall_prop_framed_posters`), lousa dark mode com prateleira de vasos (`wall_prop_kanbanshelf`), estações dual-monitor brancas/grafite (`desk_tech_white_dual`), mesa executiva repleta de documentos (`desk_executive_detailed`), arquivo de aço (`cabinet_steel_drawers`), central de impressão (`print_corporate_hub`), copa em quartzo e verde-sálvia com cafeteira coral (`pantry_modern_kitchenette`) e ilha com banquetas lavanda (`pantry_island_bar` + `stool_pantry_lavender`).

## Estrutura da Pasta `art/`

```text
art/
├── README.md                  # Documentação geral do módulo de arte
├── STYLE_GUIDE.md             # Guia de estilo, escala, iluminação e Paleta Master
├── src/
│   ├── palette.mjs            # Paleta Master (36 tokens corporativos) e compilador Greedy 2D Meshing
│   ├── floors-and-walls.mjs   # Matrizes de pisos (porcelanato, carpete, diagonal, ardósia), paredes, janelas e props
│   ├── furniture-and-props.mjs# Matrizes de estações tech, mesa executiva, arquivos de aço, copa, impressora e plantas
│   ├── characters.mjs         # Motor modular de personagens (20x28 art px, 16 dimensões, templates de cabelo/barba e 36 presets)
│   └── index.mjs              # Exportação unificada de cenário e personagens
├── scripts/
│   └── build-preview.mjs      # Validador e gerador do atlas JSON, SVGs e catálogo HTML com Criador de Personagens
└── preview/                   # Artefatos visuais gerados para inspeção e aprovação
    ├── index.html             # Catálogo interativo com Prancha 6x6 de Personagens, Criador ao Vivo, Diorama e Tileset
    ├── characters-sheet.svg   # Prancha 6x6 com os 36 personagens diversos
    ├── scene-demo.svg         # Cenário completo do escritório populado com personagens
    ├── atlas-sheet.svg        # Prancha completa do tileset corporativo sobre porcelanato
    └── atlas.json             # Dados compilados em retângulos otimizados (cenário + personagens)
```

## Como Gerar / Atualizar o Catálogo e Atlas

A partir da raiz do repositório:

```bash
node art/scripts/build-preview.mjs
```

Depois, abra `art/preview/index.html` no navegador para inspecionar o cenário completo integrado, alternar o zoom (`1×`, `2×`, `3×`), ligar a grade de tiles (`32 × 32 px`) e exportar tanto o Atlas quanto o Cenário em **PNG**.
