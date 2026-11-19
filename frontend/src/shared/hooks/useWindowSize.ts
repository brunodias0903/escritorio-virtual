import { useEffect, useState } from 'react';

export type WindowSize = { width: number; height: number };

const readWindowSize = (): WindowSize => ({
  width: window.innerWidth,
  height: window.innerHeight,
});

/** Largura e altura da janela do navegador, atualizadas ao redimensionar. */
export function useWindowSize(): WindowSize {
  const [size, setSize] = useState<WindowSize>(readWindowSize);

  useEffect(() => {
    const onResize = () => setSize(readWindowSize());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return size;
}
