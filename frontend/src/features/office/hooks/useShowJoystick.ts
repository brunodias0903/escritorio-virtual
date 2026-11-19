import { useEffect, useState } from 'react';

import { shouldShowJoystick } from '@/shared/lib/device';

const COARSE = '(pointer: coarse)';

const readCoarsePointer = (): boolean => window.matchMedia(COARSE).matches;

/** Diz se o joystick deve aparecer neste aparelho. Acompanha mudanças de ponteiro. */
export function useShowJoystick(): boolean {
  const [coarsePointer, setCoarsePointer] = useState(readCoarsePointer);

  useEffect(() => {
    const query = window.matchMedia(COARSE);
    const onChange = () => setCoarsePointer(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return shouldShowJoystick({ coarsePointer });
}
