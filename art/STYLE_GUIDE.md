# Guia de Estilo de Pixel Art — Escritório Virtual (Detailed Modern RPG Office)

Diretrizes visuais calibradas a partir das novas referências enviadas pelo usuário: **contorno externo nítido de 1px (`#1e191d`), geometria chanfrada nos cantos, alto nível de detalhamento interno bem desenhado (puxadores, molduras rebaixadas, botões, reflexos, objetos de escritório) e variedade de materiais corporativos modernos (reduzindo a madeira para que tenha cara de Escritório de Tecnologia, e não de casa)**.

---

## 1. Equilíbrio de Materiais (Cara de Escritório, Não de Casa)

Para eliminar o aspecto residencial/cabana, o escritório usa **materiais arquitetônicos corporativos**:

1. **Pisos Corporativos**:
   - **Porcelanato / Ladrilho de Pedra Acetinada (`floor_stone_slate` e `floor_ceramic_ivory`)**: Placas de pedra cinza-azulada ou marfim com rejunte fino e bisel de 1px.
   - **Carpete Comercial em Placas (`floor_office_carpet`)**: Azul-ardósia / grafite corporativo para as áreas de trabalho e salas de reunião.
   - **Piso Vinílico / Tacos Claros (`floor_light_parquet`)**: Tom areia/freixo neutro, usado apenas em zonas específicas (como recepção ou lounge).
2. **Paredes Arquitetônicas**:
   - **Tijolinho / Bloco Arquitetônico Cinza-Claro (`wall_stone_brick`)**: Inspirado diretamente na referência 3, trazendo textura limpa e moderna de estúdio/escritório.
   - **Drywall Off-White com Perfil Metálico (`wall_modern_drywall`)**: Pintura cinza-gelo / off-white com rodapé em alumínio anodizado grafite e faixa de destaque.
   - **Divisória Corporativa em Esquadria Preta e Vidro (`wall_office_glass`)**: Perfil metálico chumbo com vidro amplo e persiana horizontal.
3. **Mobiliário Bicolor e Metálico (Laca Branca, Grafite, Azul-Petróleo e Nogueira)**:
   - Em vez de móveis 100% madeira mel, as bancadas, mesas e armários combinam **estrutura em aço grafite ou laca branca/creme** (como na ref 1 e 2) com tampos chanfrados e detalhes em azul-petróleo, verde-sálvia e nogueira escura (como na ref 4).

---

## 2. Regras de Detalhamento Limpo (Como ter muitos detalhes sem ficar "sujo")

Observando as 4 novas imagens:

- **Cantos Chanfrados (1px Corner Cut)**: Quase todos os móveis, tapetes, quadros e eletrodomésticos não são quadrados secos — o pixel da ponta extrema é cortado ou arredondado pelo contorno `O`.
- **Painéis Rebaixados (Inset Panels)**: Portas de armário, frentes de gaveta e laterais de balcão têm uma **moldura interna retangular** com 1px de brilho embaixo e 1px de sombra em cima, dando profundidade 3D imediata (como nos balcões brancos da ref 1 e na mesa executiva da ref 4).
- **Objetos com Silhueta Própria**: Cada objeto sobre as mesas ou paredes (calendário de parede com grade, ar-condicionado split, quadros emoldurados, prateleira suspensa com vasinhos, cafeteira vermelha/inox, bandeja de documentos, abajur com halo, arquivo de aço) tem seu próprio contorno escuro fechado de 1px.

---

## 3. Paleta Master Corporativa & Detalhada

| Código | Cor Hex   | Material / Uso                                                     |
| ------ | --------- | ------------------------------------------------------------------ |
| `O`    | `#1e191d` | Contorno universal externo de 1px (Chumbo-Café profundo)           |
| `x`    | `#2d313b` | Grafite Profundo — Esquadrias pretas, base de cadeira, telas       |
| `A`    | `#454c5c` | Aço Grafite Escuro — Estrutura de mesas, arquivos, ar-condicionado |
| `a`    | `#697387` | Aço Médio / Ardósia — Sombras de metal, carpete escuro             |
| `s`    | `#96a1b5` | Aço Claro / Alumínio — Frente de armários metálicos, pedras        |
| `S`    | `#c3ccd9` | Prata / Cinza Gelo — Topo de metais, bordas iluminadas             |
| `f`    | `#f5f7fa` | Branco Puro — Laca branca iluminada, papel A4, louças, luz         |
| `F`    | `#e1e6ef` | Laca Branca / Off-White — Corpo de móveis modernos, paredes        |
| `e`    | `#c5cddb` | Sombra de Laca Branca / Rejunte de piso claro                      |
| `P`    | `#d9d4cc` | Concreto / Pedra Arquitetônica Clara (Parede ref 3)                |
| `q`    | `#bab3a8` | Concreto Médio / Bloco de pedra                                    |
| `Q`    | `#968e83` | Junta de bloco de pedra / Sombra de parede                         |
| `C`    | `#42526b` | Carpete Corporativo Azul-Ardósia — Base                            |
| `c`    | `#536582` | Carpete Corporativo — Placa alternada                              |
| `k`    | `#323f54` | Carpete Corporativo — Borda / Sombra                               |
| `U`    | `#58a6b8` | Azul-Petróleo / Ciano Corporativo — Brilho (Cadeira ref 4)         |
| `y`    | `#397f94` | Azul-Petróleo — Corpo de cadeiras, poltronas e detalhes            |
| `J`    | `#245566` | Azul-Petróleo Escuro — Sombra de estofado                          |
| `G`    | `#7ca36b` | Verde-Sálvia / Menta — Brilho (Tapetes e estofados ref 2 e 3)      |
| `g`    | `#59804b` | Verde-Sálvia — Corpo de tapete, plantas e painéis                  |
| `t`    | `#3d5c33` | Verde-Sálvia Escuro — Sombra e borda de tapete                     |
| `j`    | `#8cd668` | Folhagem Viva — Brilho superior de plantas                         |
| `L`    | `#52ab3a` | Folhagem Viva — Folhas médias                                      |
| `T`    | `#2d6e22` | Folhagem Viva — Sombra profunda da planta                          |
| `w`    | `#e8be8e` | Madeira Clara / Freixo — Brilho de borda                           |
| `W`    | `#cfa06e` | Madeira Clara / Freixo — Tampo de mesa (moderado)                  |
| `m`    | `#ab7b4b` | Madeira Média — Borda chanfrada                                    |
| `n`    | `#9c653e` | Nogueira Executiva (Ref 4) — Brilho                                |
| `N`    | `#754728` | Nogueira Executiva — Corpo de mesa diretoria / estante             |
| `d`    | `#522f18` | Nogueira Executiva — Painel rebaixado / Sombra                     |
| `h`    | `#f7e8d0` | Creme / Marfim — Piso claro, tapete felpudo, páginas               |
| `H`    | `#dfd0b8` | Marfim Médio — Sombra suave de piso/tapete                         |
| `l`    | `#bdaea0` | Greige — Junta de piso marfim                                      |
| `R`    | `#e05a52` | Vermelho Coral (Ref 2) — Cafeteira, pastas, post-its, livros       |
| `b`    | `#a33631` | Vermelho Carmim — Sombra de objetos vermelhos                      |
| `Y`    | `#f7cf59` | Amarelo Âmbar / Latão — Luminárias, post-its, puxadores, luz       |
| `2`    | `#cc962b` | Laranja / Bronze — Sombra de abajur, vasos de cerâmica             |
| `v`    | `#d9f5ff` | Vidro / Tela — Reflexo branco-azulado                              |
| `V`    | `#8cd8f5` | Vidro / Tela — Azul celeste                                        |
| `i`    | `#4fa3c7` | Vidro / Tela — Fundo de monitor e janela                           |
| `8`    | `#8478a6` | Lilás / Lavanda Corporativo — Banquetas e detalhes (Ref 1)         |
| `9`    | `#5b4e7a` | Lilás Escuro — Sombra de banqueta/puff                             |

---

## 4. Especificação dos Personagens Modulares (`20 × 28` art px)

Definidos em [`art/src/characters.mjs`](./src/characters.mjs), todos os avatares seguem as regras de proporção e legibilidade facial:

1. **Cabeça de Tamanho Único (`12 × 10` art px frontal / `11 × 10` art px perfil)**:
   - A cabeça **nunca** muda de largura entre `slim`, `regular` e `chubby`. Quando o personagem é `chubby`, apenas o tronco (`12–14 px`), a barriga e as pernas (`4 px`) alargam.
2. **Zona de Respiro Facial e Legibilidade**:
   - **Proibido contorno preto (`O`) interno na pele**: As pontas da franja na testa e o topo da barba nas bochechas usam exclusivamente o tom de sombra do pelo (`d`), nunca `#1e191d`.
   - **Testa e Bochechas Livres**: As franjas terminam em `headTop + 3`, liberando a testa (`+4`), os olhos (`+5`) e as maçãs do rosto (`+6..+7`).
   - **Óculos Compactos (`3 × 2` art px)**: Posicionados em `eyeY..eyeY+1`, sem encostar na franja nem no bigode.
3. **Oclusão Realista por Boné (`cap`) e Touca (`beanie`)**:
   - Quando `cap` ou `beanie` está ativo, o topo e a franja do cabelo somem sob o chapéu. Se o cabelo for `short`, ele fica 100% oculto; se for `medium` ou `long`, apenas a parte inferior aparece saindo depois do boné/touca (na nuca e nos ombros).
