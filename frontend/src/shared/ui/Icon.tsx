export type IconName =
  | 'mic'
  | 'micOff'
  | 'volume'
  | 'volumeOff'
  | 'video'
  | 'videoOff'
  | 'screen'
  | 'smile'
  | 'chat'
  | 'people'
  | 'exit'
  | 'plus'
  | 'minus'
  | 'pencil'
  | 'shield'
  | 'chevronUp'
  | 'desk'
  | 'expand'
  | 'shrink'
  | 'eye'
  | 'eyeOff'
  | 'search'
  | 'lock'
  | 'unlock'
  | 'move';

type Props = { name: IconName; size?: number; color?: string };

/** Ícones de traço simples, desenhados numa grade de 24 x 24. */
export function Icon({ name, size = 22, color = '#ffffff' }: Props) {
  const stroke = {
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block', flexShrink: 0 }}
    >
      {name === 'mic' || name === 'micOff' ? (
        <>
          <rect x={9} y={3} width={6} height={11} rx={3} {...stroke} />
          <path d="M5 11a7 7 0 0 0 14 0M12 18v3" {...stroke} />
        </>
      ) : null}
      {name === 'video' || name === 'videoOff' ? (
        <>
          <rect x={3} y={7} width={12} height={10} rx={2} {...stroke} />
          <path d="M15 11l6-3v8l-6-3z" {...stroke} />
        </>
      ) : null}
      {name === 'micOff' || name === 'videoOff' || name === 'volumeOff' ? (
        <path d="M4 4l16 16" {...stroke} stroke="#ff8a9b" />
      ) : null}
      {name === 'volume' || name === 'volumeOff' ? (
        <>
          <path d="M11 5L6 9H3v6h3l5 4V5z" {...stroke} />
          {name === 'volume' ? (
            <>
              <path d="M15.5 8.5a5 5 0 0 1 0 7" {...stroke} />
              <path d="M18.5 6a8.5 8.5 0 0 1 0 12" {...stroke} />
            </>
          ) : null}
        </>
      ) : null}
      {name === 'lock' ? (
        <>
          <rect x={5} y={11} width={14} height={9} rx={2} {...stroke} />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" {...stroke} />
        </>
      ) : null}
      {name === 'unlock' ? (
        <>
          <rect x={5} y={11} width={14} height={9} rx={2} {...stroke} />
          <path d="M8 11V8a4 4 0 0 1 7.6-1.7" {...stroke} />
        </>
      ) : null}
      {name === 'move' ? (
        <>
          <path d="M12 3v18M3 12h18" {...stroke} />
          <path
            d="M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3"
            {...stroke}
          />
        </>
      ) : null}
      {name === 'screen' ? (
        <>
          <rect x={3} y={4} width={18} height={12} rx={2} {...stroke} />
          <path d="M8 20h8M12 16v4" {...stroke} />
        </>
      ) : null}
      {name === 'smile' ? (
        <>
          <circle cx={12} cy={12} r={9} {...stroke} />
          <path d="M8 14a5 5 0 0 0 8 0" {...stroke} />
          <circle cx={9} cy={10} r={0.9} fill={color} />
          <circle cx={15} cy={10} r={0.9} fill={color} />
        </>
      ) : null}
      {name === 'chat' ? (
        <path d="M4 5h16v11H10l-4 4v-4H4z" {...stroke} />
      ) : null}
      {name === 'people' ? (
        <>
          <circle cx={9} cy={8} r={3} {...stroke} />
          <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" {...stroke} />
          <circle cx={17} cy={9} r={2.4} {...stroke} />
          <path d="M17 14c2.5 0 4.5 2 4.5 5" {...stroke} />
        </>
      ) : null}
      {name === 'exit' ? (
        <>
          <path d="M10 4H5v16h5" {...stroke} />
          <path d="M14 8l4 4-4 4M18 12H9" {...stroke} />
        </>
      ) : null}
      {name === 'plus' ? <path d="M12 5v14M5 12h14" {...stroke} /> : null}
      {name === 'minus' ? <path d="M5 12h14" {...stroke} /> : null}
      {name === 'pencil' ? (
        <path d="M4 20l1-4 11-11 3 3-11 11z" {...stroke} />
      ) : null}
      {name === 'shield' ? (
        <path
          d="M12 3l8 3v6c0 4.5-3.4 7.8-8 9-4.6-1.2-8-4.5-8-9V6z"
          {...stroke}
        />
      ) : null}
      {name === 'chevronUp' ? <path d="M6 15l6-6 6 6" {...stroke} /> : null}
      {name === 'eye' || name === 'eyeOff' ? (
        <>
          <path
            d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"
            {...stroke}
          />
          <circle cx={12} cy={12} r={3} {...stroke} />
        </>
      ) : null}
      {name === 'eyeOff' ? <path d="M4 4l16 16" {...stroke} /> : null}
      {name === 'search' ? (
        <>
          <circle cx={11} cy={11} r={6} {...stroke} />
          <path d="M20 20l-4.5-4.5" {...stroke} />
        </>
      ) : null}
      {name === 'expand' ? (
        <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" {...stroke} />
      ) : null}
      {name === 'shrink' ? (
        <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" {...stroke} />
      ) : null}
      {name === 'desk' ? (
        <>
          <rect x={7} y={4} width={10} height={7} rx={1} {...stroke} />
          <path d="M12 11v2M3 13h18M5 13v7M19 13v7" {...stroke} />
        </>
      ) : null}
    </svg>
  );
}
