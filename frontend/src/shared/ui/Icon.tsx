import {
  Armchair,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  EyeOff,
  Gamepad2,
  HeadphoneOff,
  Headphones,
  Loader2,
  Lock,
  LogOut,
  Maximize2,
  MessageSquare,
  Mic,
  MicOff,
  Minimize2,
  Minus,
  Monitor,
  Move,
  Palette,
  Pencil,
  Phone,
  PhoneOff,
  Plus,
  Search,
  Settings,
  Shield,
  Smile,
  Undo2,
  Unlock,
  User,
  Users,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  type LucideIcon,
} from 'lucide-react';

export type IconName =
  | 'mic'
  | 'micOff'
  | 'volume'
  | 'volumeOff'
  | 'headphones'
  | 'headphonesOff'
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
  | 'move'
  | 'chevronLeft'
  | 'chevronRight'
  | 'user'
  | 'phone'
  | 'phoneOff'
  | 'undo'
  | 'palette'
  | 'settings'
  | 'remote'
  | 'loader';

const LUCIDE_MAP: Record<IconName, LucideIcon> = {
  mic: Mic,
  micOff: MicOff,
  volume: Volume2,
  volumeOff: VolumeX,
  headphones: Headphones,
  headphonesOff: HeadphoneOff,
  video: Video,
  videoOff: VideoOff,
  screen: Monitor,
  smile: Smile,
  chat: MessageSquare,
  people: Users,
  exit: LogOut,
  plus: Plus,
  minus: Minus,
  pencil: Pencil,
  shield: Shield,
  chevronUp: ChevronUp,
  desk: Armchair,
  expand: Maximize2,
  shrink: Minimize2,
  eye: Eye,
  eyeOff: EyeOff,
  search: Search,
  lock: Lock,
  unlock: Unlock,
  move: Move,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  user: User,
  phone: Phone,
  phoneOff: PhoneOff,
  undo: Undo2,
  palette: Palette,
  settings: Settings,
  remote: Gamepad2,
  loader: Loader2,
};

type Props = { name: IconName; size?: number; color?: string };

/** Ícones vetoriais padronizados com Lucide em toda a interface. */
export function Icon({ name, size = 20, color = 'currentColor' }: Props) {
  const Component = LUCIDE_MAP[name];
  return (
    <Component
      size={size}
      color={color}
      strokeWidth={2}
      aria-hidden={true}
      focusable={false}
      style={{
        display: 'block',
        flexShrink: 0,
        animation:
          name === 'loader' ? 'dsIconSpin 0.8s linear infinite' : undefined,
      }}
    />
  );
}
