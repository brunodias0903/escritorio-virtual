import type { DeskDef, DeskMachine, DeskMonitor } from '@/shared/domain';

/** Tamanho (em pixels do mapa) da área de cada enfeite sobre a mesa (matriz 10x10 em 1.1px = 11x11px). */
export const DESK_ITEM_PX = 1.1;
export const DESK_ITEM_SIZE = 10 * DESK_ITEM_PX;

/**
 * Posições dos 4 enfeites dentro da área útil da superfície do tampo (`y + 2` até `y + h - 10`),
 * distribuídos nas alas laterais esquerda e direita (acima dos dois gaveteiros) para nunca
 * transbordar para fora da mesa nem colidir com monitores, teclado, mouse ou gabinete:
 * - Slot 0: Ala esquerda superior
 * - Slot 1: Ala direita superior
 * - Slot 2: Ala esquerda frontal
 * - Slot 3: Ala direita frontal (alinhado verticalmente ao Slot 1 quando há gabinete de PC)
 */
export const deskItemSlot = (
  desk: DeskDef,
  index: number,
  setup: { machine: DeskMachine; monitor: DeskMonitor },
) => {
  const hasTower = setup.machine === 'desktop';
  const wideMonitors = setup.monitor === 'triple' || setup.monitor === 'dual';
  const leftBackX = desk.x + 2;
  const leftFrontX = wideMonitors ? desk.x + 14 : desk.x + 15;
  const rightBackX = desk.x + desk.w - DESK_ITEM_SIZE - 2;
  const rightFrontX = hasTower
    ? rightBackX
    : desk.x + desk.w - 15 - DESK_ITEM_SIZE;
  const rightFrontY = hasTower ? desk.y + 12.5 : desk.y + 11;

  const slots = [
    { x: leftBackX, y: desk.y + 1 },
    { x: rightBackX, y: desk.y + 1 },
    { x: leftFrontX, y: desk.y + 11 },
    { x: rightFrontX, y: rightFrontY },
  ];
  return slots[index] ?? slots[0]!;
};
