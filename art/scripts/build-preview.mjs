// Valida todas as matrizes de pixel art em art/src/ e gera:
//   - art/preview/atlas.json           (metadados + tags `desk-decor` + retângulos otimizados)
//   - art/preview/desk-decor-sheet.svg (prancha exclusiva com os 36 sprites `tag: 'desk-decor'`)
//   - art/preview/characters-sheet.svg (prancha 6x6 com 36 personagens variados)
//   - art/preview/atlas-sheet.svg      (prancha corporativa detalhada sobre fundo técnico)
//   - art/preview/scene-demo.svg       (diorama completo do Escritório populado)
//   - art/preview/index.html           (catálogo interativo + Customizador de Mesa + Criador de Avatar)
//
// Uso: node art/scripts/build-preview.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ACCESSORIES,
  ALL_DESK_DECOR_SPRITES,
  ALL_SCENERY_SPRITES,
  BEARD_TEMPLATES_FRONT,
  BEARD_TEMPLATES_SIDE,
  BODY_TYPES,
  BOTTOM_COLORS,
  BOTTOM_STYLES,
  CHARACTER_PRESETS,
  CHAR_H,
  CHAR_SCALE,
  CHAR_W,
  CLOTH_COLORS,
  DESK_COMPUTER_SETUPS,
  DESK_DECOR_ITEMS,
  DESK_DECOR_TAG,
  DESK_SURFACES,
  FACE_STYLES,
  FACIAL_HAIRS,
  HAIR_COLORS,
  HAIR_LENGTHS,
  HAIR_STYLES,
  HAIR_TEMPLATES_FRONT,
  HAIR_TEMPLATES_SIDE,
  HEIGHT_TYPES,
  PALETTE,
  PIXEL_SCALE,
  SHOE_COLORS,
  SHOE_STYLES,
  SKIN_PALETTES,
  TOP_STYLES,
  compileCharacterRects,
  compileSprite,
  composeCustomDeskRects,
  renderCharacterGrid,
  shadeHex,
  validateSprite,
} from '../src/index.mjs';
import { renderRealProjectMapSvg } from './real-maps-helper.mjs';

const ART_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PREVIEW_DIR = resolve(ART_ROOT, 'preview');

mkdirSync(PREVIEW_DIR, { recursive: true });

// 1. Validar e compilar todos os sprites (cenário + itens com tag `desk-decor`)
const compiledAtlas = ALL_SCENERY_SPRITES.map((sprite) => {
  validateSprite(sprite);
  const rects = compileSprite(sprite, PIXEL_SCALE);
  return {
    id: sprite.id,
    name: sprite.name,
    category: sprite.category,
    slotType: sprite.slotType ?? null,
    itemKey: sprite.itemKey ?? null,
    setupKey: sprite.setupKey ?? null,
    colorIndex: sprite.colorIndex ?? null,
    customizable: Boolean(sprite.customizable),
    tags: sprite.tags ?? [sprite.category],
    artWidth: sprite.width,
    artHeight: sprite.height,
    mapWidth: sprite.width * PIXEL_SCALE,
    mapHeight: sprite.height * PIXEL_SCALE,
    rectCount: rects.length,
    description: sprite.description,
    rects,
  };
});

// 2. Compilar os 36 personagens preset
const compiledCharacters = CHARACTER_PRESETS.map((preset) => {
  const downRects = compileCharacterRects(preset, 'down', 0, CHAR_SCALE);
  const upRects = compileCharacterRects(preset, 'up', 0, CHAR_SCALE);
  const leftRects = compileCharacterRects(preset, 'left', 0, CHAR_SCALE);
  const rightRects = compileCharacterRects(preset, 'right', 0, CHAR_SCALE);
  return {
    ...preset,
    tags: ['character', preset.bodyType, preset.heightType],
    artWidth: CHAR_W,
    artHeight: CHAR_H,
    mapWidth: CHAR_W * CHAR_SCALE,
    mapHeight: CHAR_H * CHAR_SCALE,
    rects: {
      down: downRects,
      up: upRects,
      left: leftRects,
      right: rightRects,
    },
  };
});

const byId = Object.fromEntries(compiledAtlas.map((s) => [s.id, s]));
const charById = Object.fromEntries(compiledCharacters.map((c) => [c.id, c]));

const renderRectsSvg = (rects, offsetX = 0, offsetY = 0) =>
  rects
    .map((r) => {
      const op = r.opacity !== undefined ? ` fill-opacity="${r.opacity}"` : '';
      return `<rect x="${offsetX + r.x}" y="${offsetY + r.y}" width="${r.w}" height="${r.h}" fill="${r.fill}"${op}/>`;
    })
    .join('');

const place = (id, x, y) => renderRectsSvg(byId[id].rects, x, y);
const placeChar = (id, x, y, dir = 'down') =>
  renderRectsSvg(charById[id].rects[dir], x, y);

// 3. Gerar Prancha Exclusiva de Decoração de Mesas (`desk-decor-sheet.svg` — tag: `desk-decor`)
const buildDeskDecorSheetSvg = () => {
  const width = 660;
  const height = 390;

  // 6 Bancadas Base (`slotType: 'desk-surface'`)
  const surfacesSvg = DESK_SURFACES.map((s, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const x = 18 + col * 214;
    const y = 32 + row * 68;
    const compiled = byId[s.id];
    return `<g>
      <rect x="${x}" y="${y}" width="202" height="60" rx="6" fill="#1b202e" stroke="#323b54"/>
      ${renderRectsSvg(compiled.rects, x + 16, y + 6)}
      <text x="${x + 124}" y="${y + 24}" font-family="system-ui, sans-serif" font-size="9.5" font-weight="700" fill="#f2f5fa">${s.name.replace('Bancada ', '')}</text>
      <text x="${x + 124}" y="${y + 38}" font-family="monospace" font-size="8.5" fill="#8cd8f5">#desk-surface</text>
      <text x="${x + 124}" y="${y + 50}" font-family="monospace" font-size="8" fill="#7ca36b">colorIndex: ${s.colorIndex}</text>
    </g>`;
  }).join('\n');

  // 6 Setups de Computador (`slotType: 'desk-setup'`)
  const setupsSvg = DESK_COMPUTER_SETUPS.map((s, idx) => {
    const x = 18 + idx * 106;
    const y = 186;
    const compiled = byId[s.id];
    return `<g>
      <rect x="${x}" y="${y}" width="98" height="64" rx="6" fill="#1b202e" stroke="#323b54"/>
      ${renderRectsSvg(compiled.rects, x + 21, y + 8)}
      <text x="${x + 49}" y="${y + 50}" font-family="monospace" font-size="8.5" font-weight="700" fill="#f2f5fa" text-anchor="middle">${s.setupKey}</text>
      <text x="${x + 49}" y="${y + 60}" font-family="monospace" font-size="7.5" fill="#8cd8f5" text-anchor="middle">#desk-setup</text>
    </g>`;
  }).join('\n');

  // 24 Itens de Decoração de Mesa (`slotType: 'desk-item'`) em 2 linhas de 12
  const itemsSvg = DESK_DECOR_ITEMS.map((item, idx) => {
    const col = idx % 12;
    const row = Math.floor(idx / 12);
    const x = 18 + col * 53;
    const y = 272 + row * 54;
    const compiled = byId[item.id];
    const isCore = item.tags.includes('core-14');
    return `<g>
      <rect x="${x}" y="${y}" width="48" height="48" rx="6" fill="#1b202e" stroke="${isCore ? '#397f94' : '#59804b'}"/>
      ${renderRectsSvg(compiled.rects, x + 14, y + 6)}
      <text x="${x + 24}" y="${y + 37}" font-family="monospace" font-size="7.5" font-weight="700" fill="#f2f5fa" text-anchor="middle">${item.itemKey}</text>
      <text x="${x + 24}" y="${y + 45}" font-family="monospace" font-size="6.5" fill="${isCore ? '#8cd8f5' : '#8cd668'}" text-anchor="middle">${isCore ? 'core-14' : '+novo'}</text>
    </g>`;
  }).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" shape-rendering="crispEdges">
    <rect width="${width}" height="${height}" rx="10" fill="#12151f"/>
    <text x="18" y="21" font-family="system-ui, sans-serif" font-size="11.5" font-weight="700" fill="#8cd8f5">1. BANCADAS PERSONALIZÁVEIS (tag: "desk-decor", slotType: "desk-surface")</text>
    ${surfacesSvg}
    <text x="18" y="178" font-family="system-ui, sans-serif" font-size="11.5" font-weight="700" fill="#8cd8f5">2. SETUPS DE COMPUTADOR (tag: "desk-decor", slotType: "desk-setup")</text>
    ${setupsSvg}
    <text x="18" y="264" font-family="system-ui, sans-serif" font-size="11.5" font-weight="700" fill="#8cd8f5">3. 24 ENFEITES DE MESA (tag: "desk-decor", slotType: "desk-item" — 14 core + 10 novos)</text>
    ${itemsSvg}
  </svg>`;
};

// 4. Gerar Prancha 6x6 de Personagens (characters-sheet.svg)
const buildCharactersSheetSvg = () => {
  const cols = 6;
  const rows = 6;
  const cellW = 76;
  const cellH = 82;
  const pad = 16;
  const width = cols * cellW + pad * 2;
  const height = rows * cellH + pad * 2;

  const cells = compiledCharacters.map((char, idx) => {
    const c = idx % cols;
    const r = Math.floor(idx / cols);
    const cx = pad + c * cellW;
    const cy = pad + r * cellH;
    const spriteX = cx + Math.floor((cellW - char.mapWidth) / 2);
    const spriteY = cy + 6;
    const shortLabel = char.name.split(' (')[0];

    return `<g>
      ${renderRectsSvg(char.rects.down, spriteX, spriteY)}
      <text x="${cx + cellW / 2}" y="${cy + 72}" font-family="system-ui, sans-serif" font-size="9.5" font-weight="700" fill="#2d313b" text-anchor="middle">${shortLabel}</text>
    </g>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" shape-rendering="crispEdges">
    <rect width="${width}" height="${height}" rx="8" fill="#ffffff"/>
    ${cells.join('\n')}
  </svg>`;
};

// 5. Gerar Prancha Completa de Objetos do Cenário (atlas-sheet.svg)
const buildAtlasSheetSvg = () => {
  const sheetW = 640;
  const sheetH = 384;
  const tile = 32;

  const bgFloor = [];
  for (let y = 0; y < sheetH; y += tile) {
    for (let x = 0; x < sheetW; x += tile) {
      bgFloor.push(place('floor_porcelain_tech', x, y));
    }
  }

  const items = [
    place('wall_stone_brick_studio', 16, 16),
    place('wall_modern_offwhite', 56, 16),
    place('window_corporate_blinds', 96, 16),
    place('wall_prop_air_conditioner', 176, 16),
    place('wall_prop_calendar_grid', 232, 16),
    place('wall_prop_framed_posters', 280, 16),
    place('wall_prop_kanbanshelf', 344, 16),
    place('rug_geometric_office', 432, 16),

    place('desk_tech_white_dual', 16, 96),
    place('desk_executive_detailed', 128, 96),
    place('cabinet_steel_drawers', 240, 96),
    place('bookshelf_arch_detailed', 320, 88),
    place('print_corporate_hub', 376, 100),

    place('pantry_modern_kitchenette', 16, 176),
    place('pantry_island_bar', 128, 184),
    place('pantry_fridge_retro_white', 240, 172),
    place('table_meeting_glass_steel', 288, 172),

    place('chair_executive_swivel_back', 16, 268),
    place('chair_executive_swivel_front', 60, 268),
    place('stool_pantry_lavender', 104, 276),
    place('sofa_modern_cream_tufted', 144, 268),
    place('plant_rack_two_tier', 224, 264),
    place('plant_ficus_stand', 272, 264),
    place('light_floor_dome_modern', 316, 260),

    place('floor_office_carpet_slate', 464, 280),
    place('floor_diamond_cream', 504, 280),
    place('floor_dark_slate_entry', 544, 280),
    place('floor_porcelain_tech', 584, 280),
  ];

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sheetW} ${sheetH}" width="${sheetW}" height="${sheetH}" shape-rendering="crispEdges">
    ${bgFloor.join('\n')}
    ${items.join('\n')}
  </svg>`;
};

// 6. Gerar Cenário Completo de Escritório Populado com Mesas Customizadas (18×12 Tiles)
const buildDioramaSvg = () => {
  const cols = 18;
  const rows = 12;
  const tile = 32;
  const width = cols * tile;
  const height = rows * tile;

  const floor = [];
  for (let r = 2; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (c <= 6 && r <= 6) {
        floor.push(place('floor_porcelain_tech', c * tile, r * tile));
      } else if (c <= 2 && r >= 7) {
        floor.push(place('floor_dark_slate_entry', c * tile, r * tile));
      } else if (c >= 12 && r >= 6) {
        floor.push(place('floor_diamond_cream', c * tile, r * tile));
      } else {
        floor.push(place('floor_office_carpet_slate', c * tile, r * tile));
      }
    }
  }

  const walls = [];
  for (let c = 0; c < cols; c++) {
    if (c <= 6) {
      walls.push(place('wall_modern_offwhite', c * tile, 0));
    } else {
      walls.push(place('wall_stone_brick_studio', c * tile, 0));
    }
  }

  walls.push(place('wall_prop_kanbanshelf', 0.4 * tile, 10));
  walls.push(place('wall_prop_air_conditioner', 4.5 * tile, 4));
  walls.push(place('window_corporate_blinds', 7.2 * tile, 6));
  walls.push(place('wall_prop_calendar_grid', 9.6 * tile, 12));
  walls.push(place('wall_prop_framed_posters', 11.2 * tile, 14));
  walls.push(place('window_corporate_blinds', 14.2 * tile, 6));

  const rugs = [place('rug_geometric_office', 3.5 * tile, 7.5 * tile)];

  // Duas mesas montadas pelo novo compositor `composeCustomDeskRects` (`tag: 'desk-decor'`)
  const customDeskKai = renderRectsSvg(
    composeCustomDeskRects({
      surfaceId: 'desk_surface_stealth_dark',
      setupId: 'setup_ultrawide_curved',
      itemIds: ['item_lava_lamp', 'item_headphones', 'item_cat', 'item_coffee'],
    }),
    7.2 * tile,
    4.5 * tile,
  );

  const customDeskLuna = renderRectsSvg(
    composeCustomDeskRects({
      surfaceId: 'desk_surface_sage_studio',
      setupId: 'setup_laptop_plus_monitor',
      itemIds: ['item_bonsai', 'item_lamp', 'item_teapot', 'item_rubiks_cube'],
    }),
    13.5 * tile,
    3.4 * tile,
  );

  const scene = [
    place('pantry_modern_kitchenette', 0.4 * tile, 1.45 * tile),
    place('pantry_fridge_retro_white', 3.7 * tile, 1.2 * tile),
    place('plant_rack_two_tier', 5.1 * tile, 1.35 * tile),
    placeChar('char_05_kenji', 1.8 * tile, 2.2 * tile, 'down'),
    place('pantry_island_bar', 0.5 * tile, 4.1 * tile),
    place('stool_pantry_lavender', 0.8 * tile, 5.25 * tile),
    place('stool_pantry_lavender', 1.7 * tile, 5.25 * tile),
    place('stool_pantry_lavender', 2.6 * tile, 5.25 * tile),
    placeChar('char_12_nina', 3.7 * tile, 4.3 * tile, 'left'),

    place('cabinet_steel_drawers', 6.8 * tile, 1.45 * tile),
    place('print_corporate_hub', 9.2 * tile, 1.6 * tile),
    place('bookshelf_arch_detailed', 11.6 * tile, 1.05 * tile),
    placeChar('char_03_bruno', 9.6 * tile, 2.3 * tile, 'up'),

    // Mesas personalizadas dos usuários no meio do escritório!
    customDeskKai,
    placeChar('char_25_dj_kai', 8.0 * tile, 4.2 * tile, 'up'),
    place('chair_executive_swivel_back', 8.2 * tile, 5.4 * tile),

    customDeskLuna,
    placeChar('char_24_luna', 14.3 * tile, 3.1 * tile, 'up'),
    place('chair_executive_swivel_back', 14.5 * tile, 4.3 * tile),

    placeChar('char_02_arthur', 4.6 * tile, 6.2 * tile, 'down'),
    placeChar('char_15_caio', 5.8 * tile, 6.2 * tile, 'down'),
    place('table_meeting_glass_steel', 4.0 * tile, 7.6 * tile),
    place('chair_executive_swivel_back', 4.4 * tile, 9.4 * tile),
    place('chair_executive_swivel_back', 5.6 * tile, 9.4 * tile),
    place('sofa_modern_cream_tufted', 8.2 * tile, 8.2 * tile),
    placeChar('char_36_tiana', 8.8 * tile, 7.3 * tile, 'down'),
    place('light_floor_dome_modern', 10.4 * tile, 7.8 * tile),
    place('plant_ficus_stand', 3.0 * tile, 8.2 * tile),

    place('bookshelf_arch_detailed', 16.3 * tile, 5.5 * tile),
    place('chair_executive_swivel_front', 14.0 * tile, 6.8 * tile),
    placeChar('char_10_dandara', 13.9 * tile, 6.3 * tile, 'down'),
    place('desk_executive_detailed', 13.0 * tile, 7.6 * tile),
    place('chair_executive_swivel_back', 14.0 * tile, 9.1 * tile),
    placeChar('char_35_vovo_mentor', 12.2 * tile, 6.8 * tile, 'right'),
    place('plant_rack_two_tier', 11.8 * tile, 8.4 * tile),
    place('plant_ficus_stand', 16.5 * tile, 8.6 * tile),
  ];

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-12 -12 ${width + 24} ${height + 24}" width="${width + 24}" height="${height + 24}" shape-rendering="crispEdges">
    <rect x="-12" y="-12" width="${width + 24}" height="${height + 24}" fill="#171920"/>
    <rect x="-4" y="-4" width="${width + 8}" height="${height + 8}" fill="#2d313b"/>
    <rect x="-2" y="-2" width="${width + 4}" height="${height + 4}" fill="#1e191d"/>
    ${floor.join('\n')}
    ${rugs.join('\n')}
    ${walls.join('\n')}
    ${scene.join('\n')}
  </svg>`;
};

const deskDecorSheetSvg = buildDeskDecorSheetSvg();
const charactersSheetSvg = buildCharactersSheetSvg();
const atlasSheetSvg = buildAtlasSheetSvg();
const dioramaSvg = buildDioramaSvg();
const realLobbySvg = renderRealProjectMapSvg('lobby', byId, compiledCharacters);
const realAndar2Svg = renderRealProjectMapSvg(
  'andar-2',
  byId,
  compiledCharacters,
);

const deskDecorSprites = compiledAtlas.filter((s) =>
  s.tags.includes(DESK_DECOR_TAG),
);

writeFileSync(
  resolve(PREVIEW_DIR, 'atlas.json'),
  `${JSON.stringify(
    {
      style:
        'Detailed Modern RPG Office + Desk Decor System + Modular Character Generator',
      artTileSize: 16,
      mapTileSize: 32,
      pixelScale: PIXEL_SCALE,
      deskDecorTag: DESK_DECOR_TAG,
      deskDecorCount: deskDecorSprites.length,
      palette: PALETTE,
      sprites: compiledAtlas,
      characterPresets: compiledCharacters,
    },
    null,
    2,
  )}\n`,
);

writeFileSync(
  resolve(PREVIEW_DIR, 'desk-decor-sheet.svg'),
  `${deskDecorSheetSvg}\n`,
);
writeFileSync(
  resolve(PREVIEW_DIR, 'characters-sheet.svg'),
  `${charactersSheetSvg}\n`,
);
writeFileSync(resolve(PREVIEW_DIR, 'atlas-sheet.svg'), `${atlasSheetSvg}\n`);
writeFileSync(resolve(PREVIEW_DIR, 'scene-demo.svg'), `${dioramaSvg}\n`);
writeFileSync(resolve(PREVIEW_DIR, 'map-lobby.svg'), `${realLobbySvg}\n`);
writeFileSync(resolve(PREVIEW_DIR, 'map-andar2.svg'), `${realAndar2Svg}\n`);

// 7. Gerar Catálogo HTML Interativo + Customizador de Mesa + Criador de Personagens
const CATEGORY_LABELS = {
  desk_decor:
    'Decoração & Personalização de Mesa do Usuário (tag: "desk-decor")',
  floors:
    'Pisos Corporativos (Porcelanato, Carpete, Ladrilho Diagonal & Ardósia)',
  walls: 'Paredes de Pedra/Drywall, Janelas com Persiana, Split & Quadros',
  furniture: 'Estações Tech, Mesa Executiva, Arquivos de Aço & Cadeiras',
  pantry:
    'Copa Corporativa (Quartzo, Sálvia, Ilha com Painéis Rebaixados & Geladeira)',
  print_area: 'Central de Impressão & Copiadora Multifuncional',
  lighting: 'Iluminação Moderna',
  plants: 'Estantes Metálicas de Plantas & Vasos Cerâmicos',
};

const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Atlas Pixel Art, Decoração de Mesas &amp; Personagens — Escritório Virtual</title>
    <style>
      :root {
        --bg: #11131a;
        --panel: #191d28;
        --panel-alt: #232838;
        --border: #333b52;
        --text: #f2f5fa;
        --muted: #9aa5bd;
        --accent: #58a6b8;
        --tag-bg: rgba(124, 163, 107, 0.18);
        --tag-border: #7ca36b;
        --tag-text: #8cd668;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: var(--bg);
        color: var(--text);
        line-height: 1.5;
        padding: 28px 24px 64px;
      }
      .container {
        max-width: 1380px;
        margin: 0 auto;
      }
      header {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: flex-end;
        gap: 16px;
        padding-bottom: 20px;
        border-bottom: 1px solid var(--border);
        margin-bottom: 28px;
      }
      h1 {
        margin: 0 0 6px;
        font-size: 25px;
      }
      .subtitle {
        margin: 0;
        color: var(--muted);
        font-size: 14px;
      }
      .controls {
        display: flex;
        gap: 10px;
        align-items: center;
        flex-wrap: wrap;
      }
      button, select {
        background: var(--panel-alt);
        color: var(--text);
        border: 1px solid var(--border);
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
      }
      button:hover,
      button.active {
        border-color: var(--accent);
        color: #8cd8f5;
      }
      .showcase-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 28px;
        margin-bottom: 36px;
      }
      .two-col {
        display: grid;
        grid-template-columns: 1.15fr 1fr;
        gap: 24px;
      }
      @media (max-width: 1024px) {
        .two-col {
          grid-template-columns: 1fr;
        }
      }
      .diorama-card {
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 14px;
        padding: 20px;
      }
      .diorama-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 14px;
        flex-wrap: wrap;
        gap: 12px;
      }
      .diorama-header h2 {
        margin: 0;
        font-size: 18px;
      }
      .diorama-viewport {
        width: 100%;
        overflow-x: auto;
        background: #0c0e14;
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 18px;
        display: flex;
        justify-content: center;
        align-items: center;
      }
      .diorama-viewport svg {
        width: 100%;
        max-width: 1100px;
        height: auto;
        image-rendering: pixelated;
        border-radius: 6px;
      }
      .builder-panel {
        display: grid;
        grid-template-columns: 220px 1fr;
        gap: 18px;
        align-items: start;
      }
      @media (max-width: 680px) {
        .builder-panel {
          grid-template-columns: 1fr;
        }
      }
      .builder-stage {
        background: #ffffff;
        border: 3px solid #1e191d;
        border-radius: 12px;
        padding: 18px 12px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
      }
      .desk-stage {
        background: #42526b;
        border: 3px solid #1e191d;
        border-radius: 12px;
        padding: 20px 12px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
      }
      .builder-poses {
        display: flex;
        gap: 8px;
        justify-content: center;
        align-items: center;
      }
      .builder-controls {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .field label {
        font-size: 11.5px;
        color: var(--muted);
        font-weight: 600;
      }
      .section-title {
        font-size: 18px;
        margin: 32px 0 14px;
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }
      .badge {
        font-size: 11px;
        padding: 2px 8px;
        border-radius: 999px;
        background: rgba(88, 166, 184, 0.16);
        color: #8cd8f5;
        border: 1px solid rgba(88, 166, 184, 0.4);
      }
      .tag-pill {
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 10.5px;
        padding: 2px 7px;
        border-radius: 6px;
        background: var(--tag-bg);
        color: var(--tag-text);
        border: 1px solid var(--tag-border);
      }
      .tag-row {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 16px;
      }
      .card {
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .stage {
        height: 148px;
        background-color: #42526b;
        border: 2px solid #1e191d;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        position: relative;
      }
      .stage.light-bg {
        background-color: #d9d4cc;
      }
      .stage svg {
        image-rendering: pixelated;
        transform: scale(var(--zoom, 2));
        transform-origin: center center;
        transition: transform 0.15s ease;
      }
      .card-title {
        font-weight: 700;
        font-size: 14px;
        margin: 0;
      }
      .card-meta {
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 11px;
        color: #8cd8f5;
        display: flex;
        justify-content: space-between;
      }
      .card-desc {
        margin: 0;
        font-size: 12.5px;
        color: var(--muted);
      }
    </style>
  </head>
  <body>
    <div class="container" id="app">
      <header>
        <div>
          <h1>Escritório Virtual — Cenário, Decoração de Mesas (<code>#desk-decor</code>) &amp; Personagens</h1>
          <p class="subtitle">
            36 Ativos de Personalização de Mesa com Tag <code>desk-decor</code> (6 Bancadas, 6 Setups de PC e 24 Enfeites) + Gerador de Personagens + Cenário Corporativo
          </p>
        </div>
        <div class="controls">
          <button onclick="setZoom(1)" id="z1">Zoom 1×</button>
          <button onclick="setZoom(2)" id="z2" class="active">Zoom 2×</button>
          <button onclick="setZoom(3)" id="z3">Zoom 3×</button>
          <button onclick="toggleStageBg()" id="bgBtn">Fundo Cards: Carpete / Pedra</button>
        </div>
      </header>

      <div class="showcase-grid">
        <!-- SEÇÃO 0: OS DOIS MAPAS REAIS DO PROJETO (LOBBY E ANDAR 2) -->
        <div class="diorama-card" style="border-color:#58a6b8">
          <div class="diorama-header">
            <div>
              <h2>🗺️ Mapas Reais do Projeto Integrados: Recepção (Lobby 30×20) &amp; Andar 2 (30×20)</h2>
              <p class="subtitle">
                Renderização direta de <code>MapLayer.tsx</code> + <code>DeskArt.tsx</code> + <code>maps.ts</code> + <code>sprite.ts</code> como ficaram no projeto real!
              </p>
            </div>
            <div class="controls">
              <button onclick="switchRealMap('lobby')" id="btnMapLobby" class="active">Recepção (Lobby)</button>
              <button onclick="switchRealMap('andar2')" id="btnMapAndar2">Andar 2</button>
            </div>
          </div>
          <div class="diorama-viewport" id="realLobbyView">
            ${realLobbySvg}
          </div>
          <div class="diorama-viewport" id="realAndar2View" style="display:none">
            ${realAndar2Svg}
          </div>
        </div>

        <!-- SEÇÃO 1: DECORAÇÃO DE MESA DOS USUÁRIOS (TAG: desk-decor) -->
        <div class="two-col">
          <div class="diorama-card">
            <div class="diorama-header">
              <div>
                <h2>1. Prancha de Personalização de Mesa <span class="tag-pill">tag: "desk-decor"</span></h2>
                <p class="subtitle">
                  Todos os 36 sprites marcados com <code>tags: ["desk-decor", ...]</code> prontos para o <code>DeskEditor</code>.
                </p>
              </div>
              <button onclick="exportSvgPng('#deskDecorSheetContainer svg', 'escritorio-desk-decor-sheet.png')">Baixar Prancha PNG</button>
            </div>
            <div class="diorama-viewport" id="deskDecorSheetContainer">
              ${deskDecorSheetSvg}
            </div>
          </div>

          <div class="diorama-card">
            <div class="diorama-header">
              <div>
                <h2>2. Simulador Interativo de Mesa do Usuário</h2>
                <p class="subtitle">
                  Combine acabamento da bancada, setup de monitores e 4 enfeites de canto em tempo real.
                </p>
              </div>
              <button onclick="randomizeDesk()" style="border-color:#8cd668;color:#8cd668">🎲 Sortear Mesa</button>
            </div>

            <div class="desk-stage">
              <svg id="liveDeskSvg" xmlns="http://www.w3.org/2000/svg" viewBox="-4 -10 104 52" width="312" height="156" shape-rendering="crispEdges"></svg>
              <div class="tag-row">
                <span class="tag-pill">tag: "desk-decor"</span>
                <span class="tag-pill" id="liveDeskTagSurface">surface: white_tech</span>
                <span class="tag-pill" id="liveDeskTagSetup">setup: dualMonitor</span>
              </div>
            </div>

            <div class="builder-controls" id="deskBuilderControls" style="margin-top:14px"></div>
          </div>
        </div>

        <!-- SEÇÃO 2: PERSONAGENS -->
        <div class="two-col">
          <div class="diorama-card">
            <div class="diorama-header">
              <div>
                <h2>3. Prancha de 36 Personagens (Grade 6×6)</h2>
                <p class="subtitle">
                  Cabeça padronizada de tamanho único, zona de respiro facial, cabelos e barbas esculpidos à mão.
                </p>
              </div>
              <button onclick="exportSvgPng('#charSheetContainer svg', 'escritorio-personagens-36.png')">Baixar 36 Personagens PNG</button>
            </div>
            <div class="diorama-viewport" id="charSheetContainer" style="background:#ffffff">
              ${charactersSheetSvg}
            </div>
          </div>

          <div class="diorama-card">
            <div class="diorama-header">
              <div>
                <h2>4. Criador Interativo de Personagens</h2>
                <p class="subtitle">
                  Customize biotipo, altura, pele, rosto, cabelo, tamanho, barba, roupa, bermuda e tênis.
                </p>
              </div>
              <button onclick="randomizeChar()" style="border-color:#8cd8f5;color:#8cd8f5">🎲 Sortear Personagem</button>
            </div>

            <div class="builder-panel">
              <div class="builder-stage">
                <svg id="liveCharMain" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 56" width="120" height="168" shape-rendering="crispEdges"></svg>
                <div class="builder-poses">
                  <svg id="liveCharUp" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 56" width="48" height="67" shape-rendering="crispEdges"></svg>
                  <svg id="liveCharLeft" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 56" width="48" height="67" shape-rendering="crispEdges"></svg>
                  <svg id="liveCharRight" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 56" width="48" height="67" shape-rendering="crispEdges"></svg>
                </div>
                <button onclick="exportSvgPng('#liveCharMain', 'meu-avatar-pixel.png', 4)" style="width:100%">Baixar Avatar PNG</button>
              </div>

              <div class="builder-controls" id="builderControls"></div>
            </div>
          </div>
        </div>

        <!-- SEÇÃO 3: CENÁRIO COMPLETO -->
        <div class="diorama-card">
          <div class="diorama-header">
            <div>
              <h2>5. Escritório Moderno Populado com Mesas Customizadas &amp; Personagens</h2>
              <p class="subtitle">
                Veja no centro do mapa as mesas personalizadas com <code>composeCustomDeskRects</code> (Stealth Dark com Ultrawide + Luminária Lava + Gatinho, e Verde-Sálvia com Notebook + Monitor + Bonsai + Bule).
              </p>
            </div>
            <button onclick="exportSvgPng('#dioramaContainer svg', 'escritorio-populado.png')">Baixar Cenário PNG</button>
          </div>
          <div class="diorama-viewport" id="dioramaContainer">
            ${dioramaSvg}
          </div>
        </div>

        <div class="diorama-card">
          <div class="diorama-header">
            <div>
              <h2>6. Prancha do Tileset Corporativo sobre Porcelanato Técnico</h2>
              <p class="subtitle">
                Elementos arquitetônicos e mobiliário corporativo do escritório.
              </p>
            </div>
            <button onclick="exportSvgPng('#sheetContainer svg', 'escritorio-tileset-corporativo.png')">Baixar Prancha PNG</button>
          </div>
          <div class="diorama-viewport" id="sheetContainer">
            ${atlasSheetSvg}
          </div>
        </div>
      </div>

      ${Object.entries(CATEGORY_LABELS)
        .map(([catKey, catTitle]) => {
          const items = compiledAtlas.filter((s) => s.category === catKey);
          return `<h2 class="section-title">${catTitle} <span class="badge">${items.length} sprites</span></h2>
          <div class="grid">
            ${items
              .map(
                (item) => `<div class="card">
                <div class="stage">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 ${item.mapWidth + 4} ${item.mapHeight + 6}" width="${item.mapWidth + 4}" height="${item.mapHeight + 6}" shape-rendering="crispEdges">
                    ${renderRectsSvg(item.rects, 0, 0)}
                  </svg>
                </div>
                <div class="card-meta">
                  <span>${item.id}</span>
                  <span>${item.artWidth}×${item.artHeight} px (${item.rectCount} rects)</span>
                </div>
                <h3 class="card-title">${item.name}</h3>
                <div class="tag-row">
                  ${(item.tags ?? []).map((t) => `<span class="tag-pill">#${t}</span>`).join('')}
                </div>
                <p class="card-desc">${item.description}</p>
              </div>`,
              )
              .join('')}
          </div>`;
        })
        .join('')}
    </div>

    <script>
      // Motor inline para funcionar direto via file://
      const OUTLINE_HEX = '#1e191d';
      const CHAR_W = 20;
      const CHAR_H = 28;
      const SKIN_PALETTES = ${JSON.stringify(SKIN_PALETTES)};
      const HAIR_COLORS = ${JSON.stringify(HAIR_COLORS)};
      const CLOTH_COLORS = ${JSON.stringify(CLOTH_COLORS)};
      const BOTTOM_COLORS = ${JSON.stringify(BOTTOM_COLORS)};
      const SHOE_COLORS = ${JSON.stringify(SHOE_COLORS)};
      const BODY_TYPES = ${JSON.stringify(BODY_TYPES)};
      const HEIGHT_TYPES = ${JSON.stringify(HEIGHT_TYPES)};
      const FACE_STYLES = ${JSON.stringify(FACE_STYLES)};
      const HAIR_STYLES = ${JSON.stringify(HAIR_STYLES)};
      const HAIR_LENGTHS = ${JSON.stringify(HAIR_LENGTHS)};
      const HAIR_TEMPLATES_FRONT = ${JSON.stringify(HAIR_TEMPLATES_FRONT)};
      const HAIR_TEMPLATES_SIDE = ${JSON.stringify(HAIR_TEMPLATES_SIDE)};
      const BEARD_TEMPLATES_FRONT = ${JSON.stringify(BEARD_TEMPLATES_FRONT)};
      const BEARD_TEMPLATES_SIDE = ${JSON.stringify(BEARD_TEMPLATES_SIDE)};
      const FACIAL_HAIRS = ${JSON.stringify(FACIAL_HAIRS)};
      const TOP_STYLES = ${JSON.stringify(TOP_STYLES)};
      const BOTTOM_STYLES = ${JSON.stringify(BOTTOM_STYLES)};
      const SHOE_STYLES = ${JSON.stringify(SHOE_STYLES)};
      const ACCESSORIES = ${JSON.stringify(ACCESSORIES)};
      const shadeHex = ${shadeHex.toString()};
      const createCanvas = () => Array.from({ length: CHAR_H }, () => Array(CHAR_W).fill(null));
      const setPx = (grid, x, y, hex) => { if (x >= 0 && x < CHAR_W && y >= 0 && y < CHAR_H && hex) grid[y][x] = hex; };
      const fillRect = (grid, x, y, w, h, hex) => { for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) setPx(grid, x + dx, y + dy, hex); };
      const strokeBox = (grid, x, y, w, h, fillHex, outlineHex = OUTLINE_HEX) => { fillRect(grid, x, y, w, h, outlineHex); if (w > 2 && h > 2) fillRect(grid, x + 1, y + 1, w - 2, h - 2, fillHex); };
      const mirrorCanvas = (grid) => grid.map((row) => [...row].reverse());
      const applyHairTemplate = (grid, rows, startY, palette) => {
        for (let r = 0; r < rows.length; r++) {
          const row = rows[r];
          const y = startY + r;
          for (let x = 0; x < row.length; x++) {
            const ch = row[x];
            if (ch !== '.' && ch !== ' ' && palette[ch]) setPx(grid, x, y, palette[ch]);
          }
        }
      };
      const renderCharacterGrid = ${renderCharacterGrid.toString()};
      const compileCharacterRects = ${compileCharacterRects.toString()};

      // Dados pré-compilados para o Simulador Interativo de Mesa (tag: 'desk-decor')
      const COMPILED_BY_ID = ${JSON.stringify(
        Object.fromEntries(
          compiledAtlas
            .filter((s) => s.tags.includes(DESK_DECOR_TAG))
            .map((s) => [s.id, s]),
        ),
      )};
      const SURFACES_LIST = ${JSON.stringify(
        DESK_SURFACES.map((s) => ({ id: s.id, name: s.name })),
      )};
      const SETUPS_LIST = ${JSON.stringify(
        DESK_COMPUTER_SETUPS.map((s) => ({
          id: s.id,
          name: s.name,
          setupKey: s.setupKey,
        })),
      )};
      const ITEMS_LIST = ${JSON.stringify(
        DESK_DECOR_ITEMS.map((i) => ({
          id: i.id,
          name: `${i.name} (${i.itemKey})`,
          itemKey: i.itemKey,
        })),
      )};

      const rectsToSvg = (rects, ox = 0, oy = 0) =>
        rects
          .map((r) => {
            const op = r.opacity !== undefined ? \` fill-opacity="\${r.opacity}"\` : '';
            return \`<rect x="\${ox + r.x}" y="\${oy + r.y}" width="\${r.w}" height="\${r.h}" fill="\${r.fill}"\${op}/>\`;
          })
          .join('');

      // --- SIMULADOR DE MESA ---
      const deskState = {
        surfaceId: 'desk_surface_white_tech',
        setupId: 'setup_dual_monitor',
        slot0: 'item_plant',
        slot1: 'item_lamp',
        slot2: 'item_mug',
        slot3: 'item_duck',
      };

      const itemOptionsWithNone = [
        { value: 'none', text: '— Vazio —' },
        ...ITEMS_LIST.map((i) => ({ value: i.id, text: i.name })),
      ];

      const DESK_FIELDS = [
        { key: 'surfaceId', label: 'Acabamento da Bancada (#desk-surface)', options: SURFACES_LIST.map((s) => ({ value: s.id, text: s.name })) },
        { key: 'setupId', label: 'Setup de Computador (#desk-setup)', options: SETUPS_LIST.map((s) => ({ value: s.id, text: s.name })) },
        { key: 'slot0', label: 'Enfeite 1 (Canto Sup. Esquerdo)', options: itemOptionsWithNone },
        { key: 'slot1', label: 'Enfeite 2 (Canto Sup. Direito)', options: itemOptionsWithNone },
        { key: 'slot3', label: 'Enfeite 3 (Canto Inf. Esquerdo)', options: itemOptionsWithNone },
        { key: 'slot2', label: 'Enfeite 4 (Canto Inf. Direito)', options: itemOptionsWithNone },
      ];

      const deskControlsEl = document.getElementById('deskBuilderControls');
      DESK_FIELDS.forEach((f) => {
        const wrap = document.createElement('div');
        wrap.className = 'field';
        const lbl = document.createElement('label');
        lbl.textContent = f.label;
        const sel = document.createElement('select');
        sel.id = 'desk_ctrl_' + f.key;
        f.options.forEach((opt) => {
          const o = document.createElement('option');
          o.value = opt.value;
          o.textContent = opt.text;
          if (deskState[f.key] === opt.value) o.selected = true;
          sel.appendChild(o);
        });
        sel.addEventListener('change', (e) => {
          deskState[f.key] = e.target.value;
          renderLiveDesk();
        });
        wrap.appendChild(lbl);
        wrap.appendChild(sel);
        deskControlsEl.appendChild(wrap);
      });

      function renderLiveDesk() {
        const surface = COMPILED_BY_ID[deskState.surfaceId];
        const setup = COMPILED_BY_ID[deskState.setupId];
        const slots = [
          { id: deskState.slot0, x: 2, y: -4 },
          { id: deskState.slot1, x: 74, y: -4 },
          { id: deskState.slot2, x: 74, y: 6 },
          { id: deskState.slot3, x: 2, y: 6 },
        ];
        let svgParts = [
          rectsToSvg(surface.rects, 0, 0),
          rectsToSvg(setup.rects, 20, -6),
        ];
        slots.forEach((slot) => {
          if (slot.id && slot.id !== 'none' && COMPILED_BY_ID[slot.id]) {
            svgParts.push(rectsToSvg(COMPILED_BY_ID[slot.id].rects, slot.x, slot.y));
          }
        });
        document.getElementById('liveDeskSvg').innerHTML = svgParts.join('');
        document.getElementById('liveDeskTagSurface').textContent = 'surface: ' + deskState.surfaceId.replace('desk_surface_', '');
        document.getElementById('liveDeskTagSetup').textContent = 'setup: ' + deskState.setupId.replace('setup_', '');
      }

      window.randomizeDesk = () => {
        DESK_FIELDS.forEach((f) => {
          const pool = f.key.startsWith('slot') ? ITEMS_LIST.map((i) => ({ value: i.id })) : f.options;
          const pick = pool[Math.floor(Math.random() * pool.length)];
          deskState[f.key] = pick.value;
          document.getElementById('desk_ctrl_' + f.key).value = pick.value;
        });
        renderLiveDesk();
      };

      renderLiveDesk();

      // --- CRIADOR DE PERSONAGENS ---
      const state = {
        bodyType: 'regular',
        heightType: 'average',
        skinTone: 2,
        faceStyle: 'happy',
        hairStyle: 'spiky',
        hairLength: 'short',
        hairColor: 1,
        facialHair: 'full_beard',
        topStyle: 'hoodie',
        topColor: 0,
        accentColor: 3,
        bottomStyle: 'shorts',
        bottomColor: 0,
        shoeStyle: 'sneakers',
        shoeColor: 0,
        accessory: 'glasses',
      };

      const FIELDS = [
        { key: 'bodyType', label: 'Biotipo (Largura)', options: BODY_TYPES.map((v) => ({ value: v, text: v === 'slim' ? 'Magro (Slim)' : v === 'chubby' ? 'Gordo (Chubby)' : 'Médio (Regular)' })) },
        { key: 'heightType', label: 'Estatura (Altura)', options: HEIGHT_TYPES.map((v) => ({ value: v, text: v === 'short' ? 'Baixo (Short)' : v === 'tall' ? 'Alto (Tall)' : 'Médio (Average)' })) },
        { key: 'skinTone', label: 'Tom de Pele', isNumber: true, options: SKIN_PALETTES.map((p, i) => ({ value: i, text: p.name })) },
        { key: 'faceStyle', label: 'Rosto / Expressão', options: FACE_STYLES.map((v) => ({ value: v, text: v })) },
        { key: 'hairStyle', label: 'Estilo de Cabelo', options: HAIR_STYLES.map((v) => ({ value: v, text: v })) },
        { key: 'hairLength', label: 'Tamanho do Cabelo', options: HAIR_LENGTHS.map((v) => ({ value: v, text: v === 'short' ? 'Curto' : v === 'medium' ? 'Médio (Ombros)' : 'Longo' })) },
        { key: 'hairColor', label: 'Cor do Cabelo', isNumber: true, options: HAIR_COLORS.map((p, i) => ({ value: i, text: p.name })) },
        { key: 'facialHair', label: 'Barba / Bigode', options: FACIAL_HAIRS.map((v) => ({ value: v, text: v })) },
        { key: 'topStyle', label: 'Roupa Superior', options: TOP_STYLES.map((v) => ({ value: v, text: v })) },
        { key: 'topColor', label: 'Cor da Roupa', isNumber: true, options: CLOTH_COLORS.map((p, i) => ({ value: i, text: p.name })) },
        { key: 'accentColor', label: 'Cor Secundária / Detalhe', isNumber: true, options: CLOTH_COLORS.map((p, i) => ({ value: i, text: p.name })) },
        { key: 'bottomStyle', label: 'Bermuda / Calça / Saia', options: BOTTOM_STYLES.map((v) => ({ value: v, text: v })) },
        { key: 'bottomColor', label: 'Cor da Bermuda/Calça', isNumber: true, options: BOTTOM_COLORS.map((p, i) => ({ value: i, text: p.name })) },
        { key: 'shoeStyle', label: 'Tênis / Calçado', options: SHOE_STYLES.map((v) => ({ value: v, text: v })) },
        { key: 'shoeColor', label: 'Cor do Tênis', isNumber: true, options: SHOE_COLORS.map((p, i) => ({ value: i, text: p.name })) },
        { key: 'accessory', label: 'Acessório', options: ACCESSORIES.map((v) => ({ value: v, text: v })) },
      ];

      const controlsContainer = document.getElementById('builderControls');
      FIELDS.forEach((f) => {
        const wrap = document.createElement('div');
        wrap.className = 'field';
        const lbl = document.createElement('label');
        lbl.textContent = f.label;
        const sel = document.createElement('select');
        sel.id = 'ctrl_' + f.key;
        f.options.forEach((opt) => {
          const o = document.createElement('option');
          o.value = opt.value;
          o.textContent = opt.text;
          if (String(state[f.key]) === String(opt.value)) o.selected = true;
          sel.appendChild(o);
        });
        sel.addEventListener('change', (e) => {
          state[f.key] = f.isNumber ? Number(e.target.value) : e.target.value;
          renderLive();
        });
        wrap.appendChild(lbl);
        wrap.appendChild(sel);
        controlsContainer.appendChild(wrap);
      });

      let walkTick = 0;
      function renderLive() {
        const cycle = [1, 0, 2, 0];
        const frame = cycle[walkTick % cycle.length];
        document.getElementById('liveCharMain').innerHTML = rectsToSvg(
          compileCharacterRects(state, 'down', frame, 2),
        );
        document.getElementById('liveCharUp').innerHTML = rectsToSvg(
          compileCharacterRects(state, 'up', frame, 2),
        );
        document.getElementById('liveCharLeft').innerHTML = rectsToSvg(
          compileCharacterRects(state, 'left', frame, 2),
        );
        document.getElementById('liveCharRight').innerHTML = rectsToSvg(
          compileCharacterRects(state, 'right', frame, 2),
        );
      }

      setInterval(() => {
        walkTick++;
        renderLive();
      }, 320);

      window.randomizeChar = () => {
        FIELDS.forEach((f) => {
          const pick = f.options[Math.floor(Math.random() * f.options.length)];
          state[f.key] = f.isNumber ? Number(pick.value) : pick.value;
          document.getElementById('ctrl_' + f.key).value = pick.value;
        });
        renderLive();
      };

      renderLive();
    </script>

    <script>
      function setZoom(z) {
        document.documentElement.style.setProperty('--zoom', z);
        ['z1', 'z2', 'z3'].forEach((id, idx) => {
          document.getElementById(id).classList.toggle('active', idx + 1 === z);
        });
      }
      function toggleStageBg() {
        document.querySelectorAll('.stage').forEach((el) => el.classList.toggle('light-bg'));
      }
      function switchRealMap(which) {
        document.getElementById('realLobbyView').style.display = which === 'lobby' ? 'flex' : 'none';
        document.getElementById('realAndar2View').style.display = which === 'andar2' ? 'flex' : 'none';
        document.getElementById('btnMapLobby').classList.toggle('active', which === 'lobby');
        document.getElementById('btnMapAndar2').classList.toggle('active', which === 'andar2');
      }
      function exportSvgPng(selector, filename, scale = 2) {
        const svgEl = document.querySelector(selector);
        const serializer = new XMLSerializer();
        const source = serializer.serializeToString(svgEl);
        const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = svgEl.viewBox.baseVal.width * scale;
          canvas.height = svgEl.viewBox.baseVal.height * scale;
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(url);
          const a = document.createElement('a');
          a.download = filename;
          a.href = canvas.toDataURL('image/png');
          a.click();
        };
        img.src = url;
      }
    </script>
  </body>
</html>
`;

writeFileSync(resolve(PREVIEW_DIR, 'index.html'), html);
console.log(
  `Atlas completo compilado com sucesso: ${compiledAtlas.length} sprites (${deskDecorSprites.length} com tag "${DESK_DECOR_TAG}") + ${compiledCharacters.length} presets de personagens em ${PREVIEW_DIR}`,
);
