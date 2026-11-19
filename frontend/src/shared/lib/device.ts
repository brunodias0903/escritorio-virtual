type Options = {
  /** Resultado de `matchMedia('(pointer: coarse)')` no navegador. */
  coarsePointer: boolean;
};

/**
 * O joystick aparece na web só quando o aparelho usa toque como ponteiro
 * principal (celular ou tablet). Em notebook e desktop, o movimento é por
 * WASD e setas.
 */
export const shouldShowJoystick = ({ coarsePointer }: Options): boolean =>
  coarsePointer;
