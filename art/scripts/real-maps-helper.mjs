// Gera um preview visual completo dos 2 mapas reais do projeto (Lobby/Recepção 960x640 e Andar 2 960x640)
// usando exatamente a lógica do MapLayer.tsx, DeskArt.tsx, maps.ts e sprite.ts integrados!
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { stripTypeScriptTypes } from 'node:module';
import { fileURLToPath } from 'node:url';

const ART_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = resolve(ART_ROOT, '..');
const PREVIEW_DIR = resolve(ART_ROOT, 'preview');

const loadTs = (relPath) => {
  let src = stripTypeScriptTypes(readFileSync(resolve(ROOT, relPath), 'utf8'));
  src = src.replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '');
  return src;
};

const prelude = `
const TILE = 32;
const z = {
  enum: () => ({ optional: () => ({}), default: () => ({}) }),
  object: () => ({ nullable: () => ({ default: () => ({}) }) }),
  number: () => ({ int: () => ({ min: () => ({ max: () => ({ optional: () => ({}), nullable: () => ({}) }) }) }) }),
  array: () => ({ max: () => ({ refine: () => ({}) }) }),
  string: () => ({ trim: () => ({ max: () => ({}) }), max: () => ({ regex: () => ({ nullable: () => ({ optional: () => ({}) }) }) }), default: () => ({}) }),
  boolean: () => ({ default: () => ({}) })
};
`;

const combined = [
  prelude,
  loadTs('frontend/src/shared/domain/appearance.ts'),
  loadTs('frontend/src/shared/domain/maps.ts'),
  loadTs('frontend/src/shared/domain/desks.ts'),
  loadTs('frontend/src/shared/domain/world.ts'),
  loadTs('frontend/src/features/office/model/sprite.ts'),
]
  .join('\n')
  .replace(/export\s+/g, '');

export const buildRealMapsData = new Function(
  `${combined}
  return {
    MAPS,
    DESK_COLORS,
    CHAIR_COLORS,
    RUG_COLORS,
    DESK_ITEMS,
    DESK_ITEM_LABELS,
    DESK_ITEM_TAGS,
    SKIN_TONES,
    HAIR_COLORS,
    SHIRT_COLORS,
    PANTS_COLORS,
    SHOE_COLORS,
    HAIR_STYLE_LABELS,
    AVATAR_BODY_SHAPES,
    AVATAR_BODY_SHAPE_LABELS,
    AVATAR_HEIGHTS,
    AVATAR_HEIGHT_LABELS,
    AVATAR_HAIR_LENGTHS,
    AVATAR_HAIR_LENGTH_LABELS,
    AVATAR_FACES,
    AVATAR_FACE_LABELS,
    AVATAR_BEARDS,
    AVATAR_BEARD_LABELS,
    AVATAR_TOPS,
    AVATAR_TOP_LABELS,
    AVATAR_BOTTOMS,
    AVATAR_BOTTOM_LABELS,
    AVATAR_SHOES,
    AVATAR_SHOE_LABELS,
    AVATAR_ACCESSORIES,
    AVATAR_ACCESSORY_LABELS,
    buildSprite,
    defaultAppearance,
  };`,
);

const INK = '#1e191d';
const TILE = 32;

/** Renderiza exatamente a cena dos mapas `lobby` (960x640) e `andar-2` (960x640) como no `MapLayer.tsx` + `DeskArt.tsx` + `PixelAvatar.tsx`! */
export const renderRealProjectMapSvg = (mapId, compiledById, charPresets) => {
  const data = buildRealMapsData();
  const map = data.MAPS[mapId];
  const cols = map.width / TILE;
  const rows = map.height / TILE;

  const wallSet = new Set();
  for (const s of map.solids) {
    if (s.kind !== 'wall') continue;
    for (let ty = s.y / TILE; ty < (s.y + s.h) / TILE; ty++) {
      for (let tx = s.x / TILE; tx < (s.x + s.w) / TILE; tx++) {
        wallSet.add(`${tx},${ty}`);
      }
    }
  }

  const parts = [];

  // 1. Defs de pisos e tapete
  parts.push(`<defs>
    <pattern id="wood-${mapId}" width="32" height="32" patternUnits="userSpaceOnUse">
      <rect width="32" height="32" fill="#4a505c"/>
      <rect x="0" y="0" width="16" height="16" fill="#545b69"/>
      <rect x="16" y="16" width="16" height="16" fill="#545b69"/>
      <rect x="2" y="2" width="12" height="12" fill="#4e5562"/>
      <rect x="18" y="18" width="12" height="12" fill="#4e5562"/>
      <rect x="18" y="2" width="12" height="12" fill="#464c58"/>
      <rect x="2" y="18" width="12" height="12" fill="#464c58"/>
      <rect x="0" y="15" width="32" height="1" fill="#393e48"/>
      <rect x="15" y="0" width="1" height="32" fill="#393e48"/>
    </pattern>
    <pattern id="carpet-${mapId}" width="32" height="32" patternUnits="userSpaceOnUse">
      <rect width="32" height="32" fill="#42526b"/>
      <rect x="0" y="0" width="16" height="16" fill="#536582"/>
      <rect x="16" y="16" width="16" height="16" fill="#536582"/>
      <rect x="2" y="2" width="12" height="12" fill="#42526b"/>
      <rect x="18" y="18" width="12" height="12" fill="#42526b"/>
      <rect x="0" y="15" width="32" height="1" fill="#323f54"/>
      <rect x="15" y="0" width="1" height="32" fill="#323f54"/>
    </pattern>
    <pattern id="rug-${mapId}" width="16" height="16" patternUnits="userSpaceOnUse">
      <rect width="16" height="16" fill="#59804b"/>
      <rect x="0" y="0" width="8" height="8" fill="#628a53"/>
      <rect x="8" y="8" width="8" height="8" fill="#628a53"/>
    </pattern>
  </defs>`);

  // 2. Piso base e Tapetes de acolhimento (`map.rugs`)
  parts.push(
    `<rect width="${map.width}" height="${map.height}" fill="url(#${map.floor}-${mapId})"/>`,
  );
  for (const rug of map.rugs) {
    parts.push(`<g>
      <rect x="${rug.x}" y="${rug.y}" width="${rug.w}" height="${rug.h}" fill="${INK}" fill-opacity="0.45"/>
      <rect x="${rug.x + 2}" y="${rug.y + 2}" width="${rug.w - 4}" height="${rug.h - 4}" fill="${rug.color}" fill-opacity="0.82"/>
      <rect x="${rug.x + 5}" y="${rug.y + 5}" width="${rug.w - 10}" height="${rug.h - 10}" fill="none" stroke="#f7e8d0" stroke-width="1.5" stroke-dasharray="6 3" stroke-opacity="0.55"/>
    </g>`);
  }

  // 3. Áreas (Sala de Reunião e Zonas das Mesas)
  for (const area of map.areas) {
    if (area.desk) {
      parts.push(
        `<rect x="${area.x + 1}" y="${area.y + 1}" width="${area.w - 2}" height="${area.h - 2}" fill="#58a6b8" fill-opacity="0.11" stroke="#58a6b8" stroke-width="2" stroke-opacity="0.65"/>`,
      );
    } else {
      parts.push(`<g>
        <rect x="${area.x}" y="${area.y}" width="${area.w}" height="${area.h}" fill="url(#rug-${mapId})"/>
        <rect x="${area.x + 2}" y="${area.y + 2}" width="${area.w - 4}" height="${area.h - 4}" fill="none" stroke="#3d5c33" stroke-width="3"/>
        <rect x="${area.x + 6}" y="${area.y + 6}" width="${area.w - 12}" height="${area.h - 12}" fill="none" stroke="#8cd668" stroke-width="1.5" stroke-dasharray="6 3"/>
        <text x="${area.x + area.w - 12}" y="${area.y + area.h - 12}" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#f5f7fa" text-anchor="end">${area.name}</text>
      </g>`);
    }
  }

  // 4. Portas
  for (const door of map.doors) {
    const leftSide = door.x < map.width / 2;
    parts.push(`<g>
      <rect x="${door.x}" y="${door.y}" width="${door.w}" height="${door.h}" fill="#2d313b"/>
      <rect x="${door.x + 2}" y="${door.y + 2}" width="${door.w - 4}" height="${door.h - 4}" fill="#397f94"/>
      <rect x="${door.x + 4}" y="${door.y + 4}" width="${door.w - 8}" height="${door.h - 8}" fill="none" stroke="#8cd8f5" stroke-width="1.5"/>
      <text x="${leftSide ? door.x + door.w + 8 : door.x - 8}" y="${door.y + door.h / 2 + 4}" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#f5f7fa" text-anchor="${leftSide ? 'start' : 'end'}">${door.label}</text>
    </g>`);
  }

  // 5. Paredes (Externas, Divisórias de Vidro e Parede Superior de Blocos Arquitetônicos)
  for (const key of wallSet) {
    const [tx, ty] = key.split(',').map(Number);
    const x = tx * TILE;
    const y = ty * TILE;
    const outer = ty >= 2 && (tx === 0 || tx === cols - 1 || ty === rows - 1);
    if (outer) {
      const side = tx === 0 || tx === cols - 1;
      const lightX = tx === 0 ? x + TILE - 4 : x;
      parts.push(`<g>
        <rect x="${x}" y="${y}" width="32" height="32" fill="#2d313b"/>
        <rect x="${side ? lightX : x}" y="${y}" width="${side ? 4 : 32}" height="${side ? 32 : 4}" fill="#697387"/>
      </g>`);
    } else if (ty >= 2) {
      const base = !wallSet.has(`${tx},${ty + 1}`);
      parts.push(`<g>
        <rect x="${x}" y="${y}" width="32" height="32" fill="${INK}"/>
        <rect x="${x + 2}" y="${y + 2}" width="28" height="28" fill="#454c5c"/>
        <rect x="${x + 4}" y="${y + 4}" width="24" height="20" fill="#8cd8f5"/>
        <rect x="${x + 6}" y="${y + 4}" width="6" height="20" fill="#d9f5ff"/>
        <rect x="${x + 4}" y="${y + 12}" width="24" height="4" fill="#f5f7fa" fill-opacity="0.75"/>
        ${base ? `<rect x="${x}" y="${y + 32}" width="32" height="5" fill="#141218" fill-opacity="0.22"/>` : ''}
      </g>`);
    } else {
      const cap = !wallSet.has(`${tx},${ty - 1}`);
      const base = !wallSet.has(`${tx},${ty + 1}`);
      parts.push(`<g>
        <rect x="${x}" y="${y}" width="32" height="32" fill="#d9d4cc"/>
        <rect x="${x}" y="${y + 14}" width="32" height="2" fill="#bab3a8"/>
        <rect x="${x}" y="${y + 28}" width="32" height="2" fill="#bab3a8"/>
        <rect x="${x + (ty % 2 === 0 ? 14 : 22)}" y="${y}" width="2" height="14" fill="#bab3a8"/>
        <rect x="${x + (ty % 2 === 0 ? 24 : 10)}" y="${y + 16}" width="2" height="12" fill="#bab3a8"/>
        ${cap ? `<rect x="${x}" y="${y}" width="32" height="6" fill="${INK}"/><rect x="${x}" y="${y + 6}" width="32" height="3" fill="#c3ccd9"/><rect x="${x}" y="${y + 9}" width="32" height="2" fill="#697387"/>` : ''}
        ${base ? `<rect x="${x}" y="${y + 18}" width="32" height="2" fill="${INK}"/><rect x="${x}" y="${y + 20}" width="32" height="3" fill="#c3ccd9"/><rect x="${x}" y="${y + 23}" width="32" height="7" fill="#454c5c"/><rect x="${x}" y="${y + 30}" width="32" height="2" fill="${INK}"/><rect x="${x}" y="${y + 32}" width="32" height="6" fill="#141218" fill-opacity="0.22"/>` : ''}
      </g>`);
    }
  }

  // 6. Decoração da Parede Superior (Janelas, Split, Calendário e Quadros)
  const windowCols = mapId === 'lobby' ? [3, 8, 25] : [7, 17, 26];
  const acCol = mapId === 'lobby' ? 12 : 4;
  const calCol = mapId === 'lobby' ? 18 : 11;
  const postersCol = mapId === 'lobby' ? 23 : 20;

  for (const col of windowCols) {
    const wx = col * TILE;
    const wy = 10;
    parts.push(`<g>
      <rect x="${wx}" y="${wy}" width="64" height="44" fill="${INK}"/>
      <rect x="${wx + 2}" y="${wy + 2}" width="60" height="40" fill="#454c5c"/>
      <rect x="${wx + 4}" y="${wy + 4}" width="27" height="34" fill="#4fa3c7"/>
      <rect x="${wx + 33}" y="${wy + 4}" width="27" height="34" fill="#4fa3c7"/>
      <rect x="${wx + 6}" y="${wy + 14}" width="23" height="22" fill="#8cd8f5"/>
      <rect x="${wx + 35}" y="${wy + 14}" width="23" height="22" fill="#8cd8f5"/>
      <rect x="${wx + 10}" y="${wy + 16}" width="6" height="18" fill="#d9f5ff"/>
      <rect x="${wx + 40}" y="${wy + 16}" width="6" height="18" fill="#d9f5ff"/>
      <rect x="${wx + 4}" y="${wy + 4}" width="27" height="3" fill="#c3ccd9"/>
      <rect x="${wx + 4}" y="${wy + 9}" width="27" height="3" fill="#c3ccd9"/>
      <rect x="${wx + 33}" y="${wy + 4}" width="27" height="3" fill="#c3ccd9"/>
      <rect x="${wx + 33}" y="${wy + 9}" width="27" height="3" fill="#c3ccd9"/>
      <rect x="${wx - 2}" y="${wy + 40}" width="68" height="4" fill="#c3ccd9"/>
    </g>`);
  }

  parts.push(`<g transform="translate(${acCol * TILE}, 12)">
    <rect x="0" y="0" width="44" height="18" rx="2" fill="${INK}"/>
    <rect x="2" y="2" width="40" height="14" fill="#f5f7fa"/>
    <rect x="4" y="8" width="30" height="2" fill="#c5cddb"/>
    <rect x="35" y="7" width="4" height="3" fill="#7ca36b"/>
    <rect x="4" y="12" width="36" height="3" fill="#454c5c"/>
  </g>`);

  parts.push(`<g transform="translate(${calCol * TILE}, 14)">
    <rect x="0" y="0" width="28" height="24" fill="${INK}"/>
    <rect x="2" y="2" width="24" height="4" fill="#2d313b"/>
    <rect x="2" y="6" width="24" height="16" fill="#f5f7fa"/>
    <rect x="4" y="8" width="4" height="3" fill="#96a1b5"/>
    <rect x="10" y="8" width="4" height="3" fill="#e05a52"/>
    <rect x="16" y="8" width="4" height="3" fill="#96a1b5"/>
    <rect x="4" y="13" width="4" height="3" fill="#58a6b8"/>
    <rect x="10" y="13" width="4" height="3" fill="#96a1b5"/>
    <rect x="16" y="13" width="4" height="3" fill="#f7cf59"/>
  </g>`);

  parts.push(`<g transform="translate(${postersCol * TILE}, 14)">
    <rect x="0" y="0" width="22" height="24" fill="${INK}"/>
    <rect x="2" y="2" width="18" height="20" fill="#f5f7fa"/>
    <rect x="5" y="5" width="12" height="14" fill="#397f94"/>
    <rect x="7" y="7" width="8" height="5" fill="#8cd8f5"/>
    <rect x="26" y="0" width="22" height="24" fill="${INK}"/>
    <rect x="28" y="2" width="18" height="20" fill="#f5f7fa"/>
    <rect x="31" y="5" width="12" height="14" fill="#e05a52"/>
    <rect x="33" y="7" width="8" height="6" fill="#f7cf59"/>
  </g>`);

  // 7. Mesas Adotáveis (`map.desks`) com variações de cores, setups e enfeites `#desk-decor`
  const surfaces = [
    'desk_surface_white_tech',
    'desk_surface_walnut_exec',
    'desk_surface_ash_nordic',
    'desk_surface_stealth_dark',
    'desk_surface_sage_studio',
    'desk_surface_teal_petrol',
  ];
  const setups = [
    'setup_dual_monitor',
    'setup_ultrawide_curved',
    'setup_single_desktop',
    'setup_laptop_plus_monitor',
    'setup_triple_cockpit',
    'setup_laptop_stand',
  ];
  const itemPool = [
    'item_plant',
    'item_lamp',
    'item_mug',
    'item_duck',
    'item_bonsai',
    'item_lava_lamp',
    'item_cat',
    'item_headphones',
    'item_rubiks_cube',
    'item_teapot',
    'item_action_figure',
    'item_hourglass',
    'item_retro_camera',
    'item_trophy',
  ];

  map.desks.forEach((desk, idx) => {
    const { x, y, w, h } = desk;
    const chairHex = data.CHAIR_COLORS[idx % data.CHAIR_COLORS.length];
    const rugHex =
      idx % 2 === 0 ? data.RUG_COLORS[idx % data.RUG_COLORS.length] : null;
    const surf = compiledById[surfaces[idx % surfaces.length]];
    const setp = compiledById[setups[idx % setups.length]];
    const it0 = compiledById[itemPool[(idx * 3) % itemPool.length]];
    const it1 = compiledById[itemPool[(idx * 3 + 1) % itemPool.length]];
    const it2 = compiledById[itemPool[(idx * 3 + 2) % itemPool.length]];

    if (rugHex) {
      parts.push(`<g>
        <rect x="${x + 2}" y="${y + h}" width="${w - 4}" height="32" fill="${INK}"/>
        <rect x="${x + 4}" y="${y + h + 2}" width="${w - 8}" height="28" fill="${rugHex}"/>
        <rect x="${x + 7}" y="${y + h + 5}" width="${w - 14}" height="22" fill="none" stroke="#ffffff" stroke-width="2" stroke-opacity="0.35"/>
      </g>`);
    }

    // Poltrona Executiva Giratória
    parts.push(`<g>
      <ellipse cx="${x + w / 2}" cy="${y + h + 25}" rx="11" ry="3" fill="#141218" fill-opacity="0.25"/>
      <rect x="${x + w / 2 - 2}" y="${y + h + 19}" width="4" height="6" fill="${INK}"/>
      <rect x="${x + w / 2 - 8}" y="${y + h + 23}" width="16" height="3" fill="${INK}"/>
      <rect x="${x + w / 2 - 6}" y="${y + h + 23}" width="12" height="2" fill="#697387"/>
      <rect x="${x + w / 2 - 9}" y="${y + h + 2}" width="18" height="18" fill="${INK}"/>
      <rect x="${x + w / 2 - 7}" y="${y + h + 4}" width="14" height="14" fill="${chairHex}"/>
      <rect x="${x + w / 2 - 7}" y="${y + h + 4}" width="14" height="3" fill="#ffffff" fill-opacity="0.26"/>
    </g>`);

    // Bancada + Setup + Itens `#desk-decor`
    const renderRects = (rects, ox, oy) =>
      rects
        .map(
          (r) =>
            `<rect x="${ox + r.x}" y="${oy + r.y}" width="${r.w}" height="${r.h}" fill="${r.fill}"${r.opacity !== undefined ? ` fill-opacity="${r.opacity}"` : ''}/>`,
        )
        .join('');

    parts.push(renderRects(surf.rects, x, y));
    parts.push(renderRects(setp.rects, x + 20, y - 6));
    parts.push(renderRects(it0.rects, x + 2, y - 4));
    parts.push(renderRects(it1.rects, x + 74, y - 4));
    parts.push(renderRects(it2.rects, x + 74, y + 6));
  });

  // 8. Objetos Sólidos do Cenário (`table`, `plant`, `sofa`, `shelf`, `pantry`, `fridge`, `printer`, `cabinet`, `lamp`)
  const BOOKS = ['#e05a52', '#58a6b8', '#f7cf59', '#7ca36b', '#8478a6'];
  for (const solid of map.solids) {
    if (solid.kind === 'wall' || solid.kind === 'desk') continue;
    const { x, y, w, h } = solid;

    if (solid.kind === 'table') {
      const topChairs = [0.16, 0.38, 0.62, 0.84]
        .map((f, idx) => {
          const cx = x + w * f;
          const cy = y - 11;
          const seatColor = idx % 2 === 0 ? '#397f94' : '#59804b';
          return `<ellipse cx="${cx}" cy="${cy + 9}" rx="9" ry="2.5" fill="#141218" fill-opacity="0.25"/>
            <rect x="${cx - 10}" y="${cy + 3}" width="3" height="7" fill="${INK}"/>
            <rect x="${cx + 7}" y="${cy + 3}" width="3" height="7" fill="${INK}"/>
            <rect x="${cx - 8}" y="${cy}" width="16" height="11" fill="${INK}"/>
            <rect x="${cx - 6}" y="${cy + 2}" width="12" height="8" fill="${seatColor}"/>
            <rect x="${cx - 6}" y="${cy + 2}" width="12" height="2.5" fill="#ffffff" fill-opacity="0.28"/>`;
        })
        .join('');
      const bottomChairs = [0.16, 0.38, 0.62, 0.84]
        .map((f, idx) => {
          const cx = x + w * f;
          const cy = y + h - 1;
          const seatColor = idx % 2 === 0 ? '#397f94' : '#59804b';
          return `<ellipse cx="${cx}" cy="${cy + 16}" rx="9" ry="2.5" fill="#141218" fill-opacity="0.25"/>
            <rect x="${cx - 2}" y="${cy + 11}" width="4" height="5" fill="${INK}"/>
            <rect x="${cx - 7}" y="${cy + 14}" width="14" height="2.5" fill="#697387"/>
            <rect x="${cx - 10}" y="${cy + 2}" width="3" height="8" fill="${INK}"/>
            <rect x="${cx + 7}" y="${cy + 2}" width="3" height="8" fill="${INK}"/>
            <rect x="${cx - 8}" y="${cy}" width="16" height="13" fill="${INK}"/>
            <rect x="${cx - 6}" y="${cy + 2}" width="12" height="9" fill="${seatColor}"/>
            <rect x="${cx - 6}" y="${cy + 2}" width="12" height="2.5" fill="#ffffff" fill-opacity="0.26"/>`;
        })
        .join('');
      parts.push(`<g>
        ${topChairs}
        <rect x="${x - 14}" y="${y + h / 2 - 11}" width="13" height="22" fill="${INK}"/>
        <rect x="${x - 12}" y="${y + h / 2 - 9}" width="10" height="18" fill="#397f94"/>
        <rect x="${x + w + 1}" y="${y + h / 2 - 11}" width="13" height="22" fill="${INK}"/>
        <rect x="${x + w + 2}" y="${y + h / 2 - 9}" width="10" height="18" fill="#397f94"/>
        <rect x="${x + 2}" y="${y + h}" width="${w - 4}" height="5" fill="#141218" fill-opacity="0.26"/>
        <rect x="${x - 2}" y="${y - 2}" width="${w + 4}" height="${h + 4}" fill="${INK}"/>
        <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#9c653e"/>
        <rect x="${x + 3}" y="${y + 3}" width="${w - 6}" height="${h - 14}" fill="#cfa06e"/>
        <rect x="${x + 8}" y="${y + 8}" width="${w - 16}" height="${h - 24}" fill="#e1e6ef"/>
        <rect x="${x + 24}" y="${y + (h - 12) / 2 - 5}" width="${w - 48}" height="10" fill="${INK}"/>
        <rect x="${x + 26}" y="${y + (h - 12) / 2 - 3}" width="${w - 52}" height="6" fill="#454c5c"/>
        <rect x="${x}" y="${y + h - 10}" width="${w}" height="10" fill="#454c5c"/>
        <rect x="${x}" y="${y + h - 10}" width="${w}" height="2" fill="${INK}"/>
        ${[0.22, 0.5, 0.78]
          .map(
            (
              f,
            ) => `<rect x="${x + w * f - 11}" y="${y + 10}" width="22" height="15" fill="${INK}"/>
          <rect x="${x + w * f - 9}" y="${y + 12}" width="18" height="10" fill="#4fa3c7"/>
          <rect x="${x + w * f - 9}" y="${y + 12}" width="7" height="3" fill="#d9f5ff"/>`,
          )
          .join('')}
        ${bottomChairs}
      </g>`);
    } else if (solid.kind === 'plant') {
      parts.push(`<g>
        <ellipse cx="${x + 16}" cy="${y + 29}" rx="9" ry="2.5" fill="#141218" fill-opacity="0.25"/>
        <rect x="${x + 7}" y="${y + 17}" width="18" height="13" fill="${INK}"/>
        <rect x="${x + 9}" y="${y + 19}" width="14" height="9" fill="#c3ccd9"/>
        <rect x="${x + 9}" y="${y + 19}" width="14" height="3" fill="#f5f7fa"/>
        <rect x="${x + 4}" y="${y + 4}" width="24" height="14" fill="${INK}"/>
        <rect x="${x + 6}" y="${y + 6}" width="20" height="10" fill="#52ab3a"/>
        <rect x="${x + 8}" y="${y + 6}" width="12" height="4" fill="#8cd668"/>
      </g>`);
    } else if (solid.kind === 'sofa') {
      parts.push(`<g>
        <rect x="${x + 2}" y="${y + h}" width="${w - 4}" height="4" fill="#141218" fill-opacity="0.24"/>
        <rect x="${x - 2}" y="${y - 2}" width="${w + 4}" height="${h + 4}" fill="${INK}"/>
        <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#397f94"/>
        <rect x="${x}" y="${y}" width="${w}" height="6" fill="#58a6b8"/>
        <rect x="${x}" y="${y + 6}" width="10" height="${h - 6}" fill="#245566"/>
        <rect x="${x + w - 10}" y="${y + 6}" width="10" height="${h - 6}" fill="#245566"/>
        <rect x="${x + 10}" y="${y + 10}" width="${w - 20}" height="${h - 14}" fill="#58a6b8"/>
        <rect x="${x + 14}" y="${y + 11}" width="10" height="8" fill="${INK}"/>
        <rect x="${x + 15}" y="${y + 12}" width="8" height="6" fill="#f7cf59"/>
      </g>`);
    } else if (solid.kind === 'shelf') {
      parts.push(`<g>
        <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${INK}"/>
        <rect x="${x + 2}" y="${y + 2}" width="${w - 4}" height="${h - 4}" fill="#454c5c"/>
        <rect x="${x + 4}" y="${y + 6}" width="${w - 8}" height="${h - 10}" fill="#2d313b"/>
        ${Array.from({ length: Math.floor((w - 10) / 7) }, (_, i) => `<rect x="${x + 6 + i * 7}" y="${y + 8 + (i % 2)}" width="5" height="${h - 14 - (i % 2)}" fill="${BOOKS[i % BOOKS.length]}"/>`).join('')}
      </g>`);
    } else if (solid.kind === 'pantry') {
      parts.push(`<g>
        <rect x="${x - 1}" y="${y - 1}" width="${w + 2}" height="${h + 2}" fill="${INK}"/>
        <rect x="${x}" y="${y}" width="${w}" height="16" fill="#f5f7fa"/>
        <rect x="${x + 8}" y="${y + 3}" width="22" height="10" fill="${INK}"/>
        <rect x="${x + 9}" y="${y + 4}" width="20" height="8" fill="#96a1b5"/>
        <rect x="${x + 11}" y="${y + 6}" width="16" height="5" fill="#8cd8f5"/>
        <rect x="${x + 40}" y="${y - 4}" width="20" height="16" fill="${INK}"/>
        <rect x="${x + 41}" y="${y - 3}" width="18" height="14" fill="#e05a52"/>
        <rect x="${x + 42}" y="${y - 2}" width="16" height="3" fill="#c3ccd9"/>
        <rect x="${x}" y="${y + 18}" width="${w}" height="14" fill="#59804b"/>
        ${[4, 34, 64].map((dx) => `<rect x="${x + dx}" y="${y + 20}" width="26" height="10" fill="${INK}"/><rect x="${x + dx + 1}" y="${y + 21}" width="24" height="8" fill="#7ca36b"/>`).join('')}
      </g>`);
    } else if (solid.kind === 'fridge') {
      parts.push(`<g>
        <rect x="${x + 2}" y="${y - 6}" width="${w - 4}" height="${h + 6}" fill="${INK}"/>
        <rect x="${x + 4}" y="${y - 4}" width="${w - 8}" height="18" fill="#f5f7fa"/>
        <rect x="${x + 4}" y="${y + 14}" width="${w - 8}" height="2" fill="${INK}"/>
        <rect x="${x + 4}" y="${y + 16}" width="${w - 8}" height="14" fill="#e1e6ef"/>
        <rect x="${x + 7}" y="${y + 4}" width="7" height="7" fill="#2d313b"/>
      </g>`);
    } else if (solid.kind === 'printer') {
      parts.push(`<g>
        <rect x="${x}" y="${y - 2}" width="${w}" height="${h + 2}" fill="${INK}"/>
        <rect x="${x + 2}" y="${y}" width="36" height="16" fill="#e1e6ef"/>
        <rect x="${x + 4}" y="${y + 2}" width="22" height="8" fill="#2d313b"/>
        <rect x="${x + 6}" y="${y + 4}" width="8" height="4" fill="#8cd8f5"/>
        <rect x="${x + 28}" y="${y + 4}" width="9" height="8" fill="#f5f7fa"/>
        <rect x="${x + 38}" y="${y + 4}" width="24" height="12" fill="#96a1b5"/>
        <rect x="${x + 42}" y="${y - 1}" width="16" height="9" fill="${INK}"/>
        <rect x="${x + 43}" y="${y}" width="14" height="7" fill="#f5f7fa"/>
        <rect x="${x + 2}" y="${y + 18}" width="${w - 4}" height="12" fill="#96a1b5"/>
      </g>`);
    } else if (solid.kind === 'cabinet') {
      parts.push(`<g>
        <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${INK}"/>
        <rect x="${x + 2}" y="${y + 2}" width="${w - 4}" height="10" fill="#c3ccd9"/>
        <rect x="${x + 2}" y="${y + 12}" width="${w - 4}" height="18" fill="#96a1b5"/>
        <rect x="${x + 5}" y="${y + 14}" width="24" height="14" fill="${INK}"/>
        <rect x="${x + 6}" y="${y + 15}" width="22" height="12" fill="#c3ccd9"/>
        <rect x="${x + 35}" y="${y + 14}" width="24" height="14" fill="${INK}"/>
        <rect x="${x + 36}" y="${y + 15}" width="22" height="12" fill="#c3ccd9"/>
      </g>`);
    } else if (solid.kind === 'lamp') {
      parts.push(`<g>
        <rect x="${x + 9}" y="${y + 24}" width="14" height="5" fill="${INK}"/>
        <rect x="${x + 14}" y="${y + 11}" width="4" height="14" fill="${INK}"/>
        <rect x="${x + 15}" y="${y + 11}" width="2" height="14" fill="#c3ccd9"/>
        <rect x="${x + 6}" y="${y + 1}" width="20" height="11" fill="${INK}"/>
        <rect x="${x + 8}" y="${y + 3}" width="16" height="7" fill="#f7cf59"/>
      </g>`);
    }
  }

  // 9. Avatares (`sprite.ts` 16x24 * SCALE 2 = 32x48) andando e trabalhando pelo mapa real!
  const samplePlayers =
    mapId === 'lobby'
      ? [
          {
            name: 'Ana',
            col: 5,
            row: 6,
            facing: 'down',
            spec: {
              skin: 1,
              hair: 2,
              style: 6,
              shirt: 5,
              pants: 0,
              bodyShape: 'regular',
              accessory: 'glasses',
            },
          },
          {
            name: 'Bruno',
            col: 14,
            row: 5,
            facing: 'up',
            spec: {
              skin: 2,
              hair: 1,
              style: 2,
              shirt: 7,
              pants: 1,
              bodyShape: 'chubby',
              beard: 'full_beard',
              bottomStyle: 'shorts',
            },
          },
          {
            name: 'Clara',
            col: 19,
            row: 9,
            facing: 'up',
            spec: {
              skin: 0,
              hair: 3,
              style: 1,
              hairLength: 'long',
              shirt: 0,
              pants: 0,
              bodyShape: 'slim',
            },
          },
          {
            name: 'Kenji',
            col: 6,
            row: 17,
            facing: 'down',
            spec: {
              skin: 1,
              hair: 0,
              style: 0,
              shirt: 3,
              pants: 2,
              topStyle: 'overalls',
              accessory: 'cap',
            },
          },
          {
            name: 'Dandara',
            col: 15,
            row: 16,
            facing: 'down',
            spec: {
              skin: 7,
              hair: 0,
              style: 5,
              shirt: 6,
              pants: 1,
              accessory: 'headphones',
            },
          },
        ]
      : [
          {
            name: 'Arthur',
            col: 7,
            row: 5,
            facing: 'down',
            spec: {
              skin: 0,
              hair: 0,
              style: 0,
              shirt: 8,
              pants: 2,
              topStyle: 'shirt_tie',
              accessory: 'glasses',
            },
          },
          {
            name: 'Luna',
            col: 14,
            row: 6,
            facing: 'up',
            spec: {
              skin: 1,
              hair: 10,
              style: 6,
              hairLength: 'medium',
              shirt: 6,
              pants: 0,
              bottomStyle: 'shorts',
            },
          },
          {
            name: 'Marcos',
            col: 19,
            row: 11,
            facing: 'up',
            spec: {
              skin: 3,
              hair: 2,
              style: 0,
              shirt: 2,
              pants: 1,
              bodyShape: 'chubby',
              beard: 'mustache',
            },
          },
          {
            name: 'Tiana',
            col: 3,
            row: 3,
            facing: 'up',
            spec: { skin: 5, hair: 0, style: 5, shirt: 0, pants: 3 },
          },
        ];

  for (const p of samplePlayers) {
    const px = p.col * TILE + 16;
    const py = p.row * TILE + 16;
    const rects = data.buildSprite(
      { ...data.defaultAppearance(p.name), ...p.spec },
      p.facing,
      0,
    );
    const top = 16 - 24 * 2;
    parts.push(`<g transform="translate(${px}, ${py})">
      <ellipse cx="0" cy="14" rx="9" ry="3" fill="#000000" fill-opacity="0.25"/>
      <g transform="translate(-16, ${top})">
        ${rects.map((r) => `<rect x="${r.x * 2}" y="${r.y * 2}" width="${r.w * 2}" height="${r.h * 2}" fill="${r.fill}"/>`).join('')}
      </g>
      <g transform="translate(0, ${top - 10})">
        <rect x="-26" y="-14" width="52" height="16" rx="8" fill="#0f1430" fill-opacity="0.9" stroke="rgba(170,178,230,0.35)"/>
        <circle cx="-17" cy="-6" r="3" fill="#31e0c1"/>
        <text x="4" y="-3" font-family="system-ui, sans-serif" font-size="9" font-weight="600" fill="#ffffff" text-anchor="middle">${p.name}</text>
      </g>
    </g>`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${map.width} ${map.height}" width="${map.width}" height="${map.height}" shape-rendering="crispEdges">
    ${parts.join('\n')}
  </svg>`;
};
