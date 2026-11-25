/**
 * Ponto único de exportação do Atlas de Cenário, Decoração de Mesas (`desk-decor`) e Motor de Personagens.
 */
import {
  ACCESSORIES,
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
  FACE_STYLES,
  FACIAL_HAIRS,
  HAIR_COLORS,
  HAIR_LENGTHS,
  HAIR_STYLES,
  HAIR_TEMPLATES_FRONT,
  HAIR_TEMPLATES_SIDE,
  HEIGHT_TYPES,
  SHOE_COLORS,
  SHOE_STYLES,
  SKIN_PALETTES,
  TOP_STYLES,
  compileCharacterRects,
  renderCharacterGrid,
  shadeHex,
} from './characters.mjs';
import {
  ALL_DESK_DECOR_SPRITES,
  DESK_COMPUTER_SETUPS,
  DESK_DECOR_ITEMS,
  DESK_DECOR_TAG,
  DESK_SURFACES,
  composeCustomDeskRects,
  getDeskDecorByTag,
} from './desk-decor.mjs';
import { FLOOR_AND_WALL_SPRITES } from './floors-and-walls.mjs';
import { FURNITURE_AND_PROP_SPRITES } from './furniture-and-props.mjs';
import {
  ART_TILE,
  MAP_TILE,
  PALETTE,
  PIXEL_SCALE,
  compileSprite,
  validateSprite,
} from './palette.mjs';

export {
  ACCESSORIES,
  ALL_DESK_DECOR_SPRITES,
  ART_TILE,
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
  FLOOR_AND_WALL_SPRITES,
  FURNITURE_AND_PROP_SPRITES,
  HAIR_COLORS,
  HAIR_LENGTHS,
  HAIR_STYLES,
  HAIR_TEMPLATES_FRONT,
  HAIR_TEMPLATES_SIDE,
  HEIGHT_TYPES,
  MAP_TILE,
  PALETTE,
  PIXEL_SCALE,
  SHOE_COLORS,
  SHOE_STYLES,
  SKIN_PALETTES,
  TOP_STYLES,
  compileCharacterRects,
  compileSprite,
  composeCustomDeskRects,
  getDeskDecorByTag,
  renderCharacterGrid,
  shadeHex,
  validateSprite,
};

/** Lista completa de todos os sprites do cenário + decoração de mesas (`tag: 'desk-decor'`). */
export const ALL_SCENERY_SPRITES = [
  ...FLOOR_AND_WALL_SPRITES,
  ...FURNITURE_AND_PROP_SPRITES,
  ...ALL_DESK_DECOR_SPRITES,
];

/** Mapa indexado por `id` para busca em O(1). */
export const SCENERY_BY_ID = Object.fromEntries(
  ALL_SCENERY_SPRITES.map((sprite) => [sprite.id, sprite]),
);
