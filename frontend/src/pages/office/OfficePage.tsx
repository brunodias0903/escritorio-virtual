import { isMobileViewport, type MobileNavTab } from '@design-system';
import { useEffect, useRef, useState } from 'react';

import { authApi, workspaceApi } from '@/app/api';
import { WS_URL } from '@/app/config';
import { endSession, patchSessionUser } from '@/app/session';
import { useAccessibilityStore } from '@/features/accessibility/accessibilityStore';
import { AccountModal } from '@/features/auth/components/AccountModal';
import { EmailPrefsPrompt } from '@/features/auth/components/EmailPrefsPrompt';
import { VerifyEmailPrompt } from '@/features/auth/components/VerifyEmailPrompt';
import { useChatStore } from '@/features/chat/model/chatStore';
import {
  effectiveNotificationCounts,
  useNotificationPrefsStore,
} from '@/features/chat/model/notificationPrefsStore';
import { DeskEditor } from '@/features/desks/components/DeskEditor';
import { myDesk, useDeskStore } from '@/features/desks/model/deskStore';
import { CallTiles } from '@/features/media/components/CallTiles';
import { useCall } from '@/features/media/hooks/useCall';
import type { MediaAccess } from '@/features/media/model/callTypes';
import { useMediaPrefs } from '@/features/media/model/mediaPrefs';
import {
  connectOffice,
  type OfficeSocket,
  type SocketStatus,
} from '@/features/office/api/officeSocket';
import { AvatarEditor } from '@/features/office/components/AvatarEditor';
import { BottomBar } from '@/features/office/components/BottomBar';
import { Joystick } from '@/features/office/components/Joystick';
import { MobileBottomNav } from '@/features/office/components/mobile/MobileBottomNav';
import { MobileCallBar } from '@/features/office/components/mobile/MobileCallBar';
import { OfficeMap } from '@/features/office/components/OfficeMap';
import { PantryExitPrompt } from '@/features/office/components/PantryExitPrompt';
import { SessionDisplacedModal } from '@/features/office/components/SessionDisplacedModal';
import { WelcomeGuide } from '@/features/office/components/WelcomeGuide';
import {
  WorkspaceSidebar,
  type SidebarTab,
} from '@/features/office/components/WorkspaceSidebar';
import { ZoomControls } from '@/features/office/components/ZoomControls';
import { useKeyboardDirection } from '@/features/office/hooks/useKeyboardDirection';
import { useShowJoystick } from '@/features/office/hooks/useShowJoystick';
import { useZoomGestures } from '@/features/office/hooks/useZoomGestures';
import { useZoomKeys } from '@/features/office/hooks/useZoomKeys';
import {
  DEFAULT_ZOOM,
  MAX_ZOOM,
  MIN_ZOOM,
  ZOOM_STEP,
  clampZoom,
} from '@/features/office/model/camera';
import {
  OfficeWorld,
  type WorldSnapshot,
} from '@/features/office/model/officeWorld';
import { isInPantryArea } from '@/features/office/model/pathfind';
import { peopleList } from '@/features/office/model/people';
import { usePeopleStore } from '@/features/office/model/peopleStore';
import { ThemeModal } from '@/features/theme/ThemeModal';
import { useThemeStore } from '@/features/theme/themeStore';
import { CreateServerModal } from '@/features/workspace/components/CreateServerModal';
import { HelpFeedbackModal } from '@/features/workspace/components/HelpFeedbackModal';
import { ServerSettingsModal } from '@/features/workspace/components/ServerSettingsModal';
import { useServerStore } from '@/features/workspace/model/serverStore';
import {
  callKey,
  callZoneId,
  canCreateServer,
  deskKey,
  effectiveTiersOf,
  isNearCall,
  isUnavailableStatus,
  onlineCount,
  resolveMap,
  type Appearance,
  type DeskInfo,
  type Direction,
  type Session,
  type Status,
} from '@/shared/domain';
import { useElementSize } from '@/shared/hooks/useElementSize';
import { useWindowSize } from '@/shared/hooks/useWindowSize';
import { playNotifyChime, unlockNotifyAudio } from '@/shared/lib/notifySound';
import {
  showPwaNotification,
  syncAppBadge,
} from '@/shared/lib/pwaNotifications';

import styles from './OfficePage.module.css';
import { routeServerMessage, type OfficeSend } from './routeMessage';

/** Tempo parado numa zona antes de entrar na chamada (evita entrar só de passagem). */
const ZONE_DWELL_MS = 400;
/** Tempo parado sem falar/andar até mutar o microfone automaticamente (1 minuto). */
const IDLE_MIC_MUTE_MS = 60_000;
/** De quanto em quanto tempo a lista de pessoas é atualizada. */
const ONLINE_REFRESH_MS = 10_000;
// A partir desta largura, o chat fica ao lado do mapa, como no Slack.
const WIDE_BREAKPOINT = 900;
const COMPACT_BREAKPOINT = 700;

const STATUS_LABEL: Record<SocketStatus, string> = {
  connecting: 'Conectando…',
  open: 'Conectado',
  closed: 'Sem conexão com o servidor',
};

const SIDEBAR_OPEN_KEY = 'ev.sidebar.open';
const SIDEBAR_TAB_KEY = 'ev.sidebar.tab';

const readSavedSidebarOpen = (fallback: boolean): boolean => {
  try {
    const raw = window.localStorage.getItem(SIDEBAR_OPEN_KEY);
    if (raw === 'true') return true;
    if (raw === 'false') return false;
  } catch {
    // ignore storage errors
  }
  return fallback;
};

const readSavedSidebarTab = (): SidebarTab => {
  try {
    const raw = window.localStorage.getItem(SIDEBAR_TAB_KEY);
    if (raw === 'channels' || raw === 'people') return raw;
  } catch {
    // ignore storage errors
  }
  return 'channels';
};

export function OfficePage({ session }: { session: Session }) {
  const windowSize = useWindowSize();
  const isMobile = isMobileViewport(windowSize.width, windowSize.height);
  const wide = !isMobile && windowSize.width >= WIDE_BREAKPOINT;
  const compact = isMobile || windowSize.width < COMPACT_BREAKPOINT;
  const showJoystick = useShowJoystick();
  const [mobileTab, setMobileTab] = useState<MobileNavTab>('map');

  const panelOpen = useChatStore((state) => state.panelOpen);
  const setPanelOpen = useChatStore((state) => state.setPanelOpen);
  const active = useChatStore((state) => state.active);
  const allChannels = useChatStore((state) => state.channels);
  const notifyMode = useNotificationPrefsStore((s) => s.mode);
  const notifyCounts = effectiveNotificationCounts(allChannels, notifyMode);
  const unread = notifyCounts.totalUnread;
  const mentions = notifyCounts.totalMentions;

  const [world] = useState(() => new OfficeWorld());
  const [view, setView] = useState<{ snapshot: WorldSnapshot; time: number }>(
    () => ({ snapshot: world.snapshot(), time: 0 }),
  );
  const [status, setStatus] = useState<SocketStatus>('connecting');
  const [media, setMedia] = useState<MediaAccess | null>(null);
  const [mediaUnavailable, setMediaUnavailable] = useState(false);
  /** Chamada (`map:callId`) da qual o usuário saiu manualmente, podendo voltar quando quiser. */
  const [leftCallKey, setLeftCallKey] = useState<string | null>(null);
  /** Câmera ampliada em destaque centralizado na parte inferior ('self' ou tile.key). */
  const [spotlightKey, setSpotlightKey] = useState<string | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [gameNode, setGameNode] = useState<HTMLElement | null>(null);
  const gameSize = useElementSize(gameNode, windowSize);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [serverSettingsOpen, setServerSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [displaced, setDisplaced] = useState(false);
  const [askVerifyEmail, setAskVerifyEmail] = useState(false);
  const [askEmailPrefs, setAskEmailPrefs] = useState(false);
  const serverSettings = useServerStore((s) => s.settings);
  const setServerSettings = useServerStore((s) => s.setSettings);
  const servers = useServerStore((s) => s.servers);
  const activeServerId = useServerStore((s) => s.activeServerId);
  const setServers = useServerStore((s) => s.setServers);
  const addServer = useServerStore((s) => s.addServer);
  const selectServer = useServerStore((s) => s.selectServer);
  const [createServerOpen, setCreateServerOpen] = useState(false);
  const [switchingServer, setSwitchingServer] = useState(false);
  const [pendingDeskAction, setPendingDeskAction] = useState<{
    deskId: string;
    action: 'adopt' | 'release' | 'lock';
  } | null>(null);

  const handleSelectServer = (id: string) => {
    if (id === activeServerId) return;
    setSwitchingServer(true);
    setPendingDeskAction(null);
    setServerSettingsOpen(false);
    setEditingDeskId(null);
    setMovingDeskId(null);
    setPantryExitPrompt(null);
    useChatStore.getState().reset();
    useDeskStore.getState().reset();
    usePeopleStore.getState().reset();
    selectServer(id);
    const target = servers.find((s) => s.id === id);
    if (target) setNotice(`Servidor ativo: ${target.name}`);
  };

  useEffect(() => {
    if (!switchingServer) return;
    const timer = window.setTimeout(() => setSwitchingServer(false), 6000);
    return () => window.clearTimeout(timer);
  }, [switchingServer]);

  useEffect(() => {
    if (!pendingDeskAction) return;
    const timer = window.setTimeout(() => setPendingDeskAction(null), 6000);
    return () => window.clearTimeout(timer);
  }, [pendingDeskAction]);

  useEffect(() => {
    let alive = true;
    void workspaceApi.getServerSettings(activeServerId).then((settings) => {
      if (alive) setServerSettings(settings);
    });
    void workspaceApi.listServers(session.token).then((res) => {
      if (alive && res.ok) setServers(res.data.servers);
    });
    return () => {
      alive = false;
    };
  }, [session.token, activeServerId, setServerSettings, setServers]);
  const [editingDeskId, setEditingDeskId] = useState<string | null>(null);
  const [movingDeskId, setMovingDeskId] = useState<string | null>(null);
  const [previewDesk, setPreviewDesk] = useState<DeskInfo | null>(null);
  const [notice, setNotice] = useState('');
  const [pantryExitPrompt, setPantryExitPrompt] = useState<
    'coffee' | 'lunch' | null
  >(null);
  const reachedPantryRef = useRef(false);
  const desks = useDeskStore((state) => state.desks);
  const allPeople = usePeopleStore((state) => state.people);
  const [peopleQuery, setPeopleQuery] = useState('');
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>(() =>
    readSavedSidebarTab(),
  );

  const persistSidebarOpen = (open: boolean) => {
    try {
      window.localStorage.setItem(SIDEBAR_OPEN_KEY, String(open));
    } catch {
      // ignore storage errors
    }
    setPanelOpen(open);
  };

  const persistSidebarTab = (next: SidebarTab) => {
    try {
      window.localStorage.setItem(SIDEBAR_TAB_KEY, next);
    } catch {
      // ignore storage errors
    }
    setSidebarTab(next);
  };

  const keyboard = useKeyboardDirection();
  const touch = useRef<Direction>({ dx: 0, dy: 0 });
  const socketRef = useRef<OfficeSocket | null>(null);
  const snapshotRef = useRef<WorldSnapshot>(view.snapshot);

  useEffect(() => {
    snapshotRef.current = view.snapshot;
  }, [view.snapshot]);

  const themePresetId = useThemeStore((s) => s.presetId);
  const themeMode = useThemeStore((s) => s.mode);
  const themeColors = useThemeStore((s) => s.colors);
  const themeCustomized = useThemeStore((s) => s.customized);
  const themeHydratedRef = useRef(false);
  const prevUnreadRef = useRef(notifyCounts.totalUnread);
  const prevMentionsRef = useRef(notifyCounts.totalMentions);

  // Carrega o tema salvo na conta ao entrar (sincroniza entre dispositivos).
  useEffect(() => {
    let alive = true;
    void authApi.account(session.token).then((res) => {
      if (!alive) return;
      if (res.ok) {
        if (res.data.uiTheme) {
          useThemeStore.getState().hydrate(res.data.uiTheme);
        }
        if (res.data.accessibilityPrefs) {
          useAccessibilityStore.getState().hydrate(res.data.accessibilityPrefs);
        }
        if (!res.data.emailVerified) {
          setAskVerifyEmail(true);
        }
        if (res.data.emailMarketingOptIn === null) {
          setAskEmailPrefs(true);
        }
      }
      themeHydratedRef.current = true;
    });
    return () => {
      alive = false;
    };
  }, [session.token]);

  // Persiste alterações de tema na conta (com pequeno debounce para o seletor de cor).
  useEffect(() => {
    if (!themeHydratedRef.current) return;
    const timer = window.setTimeout(() => {
      void authApi.updateTheme(session.token, {
        presetId: themePresetId,
        mode: themeMode,
        colors: themeColors,
        customized: themeCustomized,
      });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [session.token, themePresetId, themeMode, themeColors, themeCustomized]);

  const myStatus = view.snapshot.players.find(
    (p) => p.id === view.snapshot.meId,
  )?.status;

  // Desbloqueia AudioContext no primeiro toque/tecla (necessário em PWA mobile).
  useEffect(() => {
    const unlock = () => unlockNotifyAudio();
    window.addEventListener('pointerdown', unlock, {
      once: true,
      passive: true,
    });
    window.addEventListener('keydown', unlock, { once: true, passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // Atualiza título, badge PWA, som e notificação nativa respeitando ChatNotifyMode.
  useEffect(() => {
    const effectiveTotal = notifyCounts.totalUnread;
    const effectiveMentions = notifyCounts.totalMentions;
    document.title =
      effectiveTotal > 0
        ? `(${effectiveTotal}) Setter — Escritório Virtual`
        : 'Setter — Escritório Virtual';
    syncAppBadge(effectiveTotal);

    if (!isUnavailableStatus(myStatus)) {
      if (effectiveMentions > prevMentionsRef.current) {
        playNotifyChime('mention');
        void showPwaNotification({
          title: 'Nova menção no Setter',
          body: 'Você foi mencionado ou recebeu uma mensagem prioritária.',
          tag: 'setter-mention',
        });
      } else if (effectiveTotal > prevUnreadRef.current) {
        playNotifyChime('message');
        void showPwaNotification({
          title: 'Nova mensagem no Setter',
          body: `Você tem ${effectiveTotal} mensagem(ns) não lida(s).`,
          tag: 'setter-message',
        });
      }
    }
    prevUnreadRef.current = effectiveTotal;
    prevMentionsRef.current = effectiveMentions;
    return () => {
      document.title = 'Setter — Escritório Virtual';
    };
  }, [notifyCounts.totalUnread, notifyCounts.totalMentions, myStatus]);

  // Restaura como o usuário deixou a sidebar (aberta/fechada) ou usa `wide` na primeira vez.
  useEffect(() => {
    setPanelOpen(readSavedSidebarOpen(wide));
  }, [wide, setPanelOpen]);

  // Ao ver um canal ou DM na aba correspondente, ele conta como lido também no servidor.
  const activeChannelObj = useChatStore((s) =>
    s.channels.find((c) => c.id === s.active),
  );
  const channelUnread = notifyCounts.channelUnread;
  const channelMentions = notifyCounts.channelMentions;
  const dmUnread = notifyCounts.dmUnread;
  const dmMentions = notifyCounts.dmMentions;
  const chatVisible = isMobile
    ? mobileTab === 'chat'
    : panelOpen && sidebarTab === 'channels' && Boolean(activeChannelObj);
  useEffect(() => {
    if (chatVisible) {
      socketRef.current?.send({ type: 'markRead', channel: active });
    }
  }, [chatVisible, active]);

  useEffect(() => {
    useChatStore.getState().setMe(session.user.email);
    const socket = connectOffice({
      url: WS_URL,
      token: session.token,
      serverId: activeServerId,
      onMessage: (message) => {
        if (message.type === 'init') {
          setSwitchingServer(false);
          setPendingDeskAction(null);
        } else if (
          message.type === 'desk' ||
          message.type === 'desks' ||
          message.type === 'deskError'
        ) {
          setPendingDeskAction(null);
        }
        routeServerMessage(
          message,
          world,
          (m) => socket.send(m),
          { set: setMedia, setUnavailable: setMediaUnavailable },
          setNotice,
          setDisplaced,
          (action, reason) => {
            const labels: Record<typeof action, string> = {
              banned: 'Sua conta foi banida do servidor.',
              kicked: 'Você foi desconectado pela moderação.',
              restricted: 'Sua conta foi temporariamente restringida.',
              removed: 'Sua conta foi removida do servidor.',
            };
            const suffix = reason ? ` Motivo: ${reason}` : '';
            void endSession(session.token, `${labels[action]}${suffix}`);
          },
          (update) => {
            patchSessionUser(update);
          },
        );
      },
      onStatus: setStatus,
    });
    socketRef.current = socket;

    let frame = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      const step = world.moveMe(
        {
          dx: keyboard.current.dx + touch.current.dx,
          dy: keyboard.current.dy + touch.current.dy,
        },
        dt,
      );
      // Cada passo vira uma mensagem: o servidor confere o quadradinho.
      if (step) {
        socket.send({ type: 'move', x: step.x, y: step.y });
        const resolved = resolveMap(
          world.map,
          Object.values(useDeskStore.getState().desks),
        );
        setLeftCallKey((prev) => {
          if (!prev) return null;
          const nextZone = callZoneId(resolved, step);
          return prev === `${world.map}:${nextZone ?? ''}` ? prev : null;
        });
        const currentMe = world.me();
        const breakKind =
          currentMe?.status === 'coffee' || currentMe?.status === 'lunch'
            ? currentMe.status
            : null;
        if (!breakKind) {
          reachedPantryRef.current = false;
          setPantryExitPrompt(null);
        } else if (isInPantryArea(resolved, step)) {
          reachedPantryRef.current = true;
          setPantryExitPrompt(null);
        } else if (reachedPantryRef.current && !world.autoWalking) {
          reachedPantryRef.current = false;
          setPantryExitPrompt(breakKind);
        }
      }
      world.tick(dt);
      setView({ snapshot: world.snapshot(), time: now });
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      socket.close();
      socketRef.current = null;
      useChatStore.getState().reset();
      useDeskStore.getState().reset();
      usePeopleStore.getState().reset();
    };
  }, [session.token, session.user.email, activeServerId, world, keyboard]);

  const send: OfficeSend = (message) => socketRef.current?.send(message);
  const me = view.snapshot.players.find((p) => p.id === view.snapshot.meId);
  const map = resolveMap(view.snapshot.map, Object.values(desks));

  useEffect(() => {
    if (!movingDeskId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMovingDeskId(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [movingDeskId]);

  // A zona (mesa ou sala de reunião) em que estou. Fora delas, é a estrada.
  const zoneId = me ? callZoneId(map, me) : null;
  const zoneName = map.areas.find((a) => a.id === zoneId)?.name ?? null;

  // Avisos curtos (mesa já tem dono, mesa cheia...) somem sozinhos.
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const myEmail = session.user.email;
  const mine = myDesk(desks, myEmail);
  const people = peopleList(allPeople, desks, myEmail, peopleQuery);
  const onlinePeople = onlineCount(
    allPeople.filter((person) => person.email !== myEmail),
  );
  const goToDesk = (desk: DeskInfo) => {
    // Vai andando, um quadradinho por vez (até em outra sala, pela porta).
    world.goTo({ map: desk.map, deskId: desk.deskId });
    if (!wide) setPanelOpen(false);
  };
  const selectSidebarTab = (next: SidebarTab) => {
    if (panelOpen && sidebarTab === next) {
      return;
    }
    persistSidebarTab(next);
    persistSidebarOpen(true);
  };
  const openDm = (email: string) => {
    send({ type: 'openDm', email });
    persistSidebarTab('channels');
    persistSidebarOpen(true);
  };
  const openAccount = () => {
    setAccountOpen(true);
  };

  // Quem está online (em todas as salas): pede logo e de tempos em tempos.
  const peopleOpen = isMobile
    ? mobileTab === 'people'
    : panelOpen && sidebarTab === 'people';
  useEffect(() => {
    if (status !== 'open') return;
    const ask = () => socketRef.current?.send({ type: 'people' });
    ask();
    const timer = window.setInterval(
      ask,
      peopleOpen ? 2000 : ONLINE_REFRESH_MS,
    );
    return () => window.clearInterval(timer);
  }, [status, peopleOpen]);

  const editingDeskInfo = editingDeskId
    ? desks[deskKey(map.id, editingDeskId)]
    : undefined;
  const fullZoneCap = view.snapshot.fullZone
    ? (map.areas.find((a) => a.name === view.snapshot.fullZone)?.capacity ?? 3)
    : 3;
  const banner = view.snapshot.lockedZone
    ? `${view.snapshot.lockedZone} está bloqueada pelo dono.`
    : view.snapshot.fullZone
      ? `${view.snapshot.fullZone} está cheia (${fullZoneCap} de ${fullZoneCap}). Espere alguém sair.`
      : notice;

  // A chamada em que devo estar: a da zona, a conversa com quem está perto
  // na estrada, ou nenhuma. Usa as posições de destino (o passo já valeu).
  const isBusy = isUnavailableStatus(me?.status);
  const callId = me
    ? callKey(
        map,
        { id: me.id, x: me.tx, y: me.ty, status: me.status },
        view.snapshot.players.map((p) => ({
          id: p.id,
          x: p.tx,
          y: p.ty,
          status: p.status,
        })),
      )
    : null;

  const meInPantry = Boolean(me && isInPantryArea(map, { x: me.tx, y: me.ty }));
  const activePantryPrompt =
    me?.status === 'coffee' || me?.status === 'lunch' ? pantryExitPrompt : null;
  const nearCall = isNearCall(callId);
  const currentCallKey = callId ? `${view.snapshot.map}:${callId}` : null;
  const optedOut = currentCallKey !== null && leftCallKey === currentCallKey;

  // O acesso só vale enquanto conectado ao servidor, online (não Ocupado), sem ter saído manualmente e na mesma chamada/sala.
  // Se a conexão WebSocket cair (ex.: túnel fechado) ou o usuário ficar Ocupado, desconecta do LiveKit na hora.
  const access =
    status === 'open' &&
    !isBusy &&
    !optedOut &&
    media &&
    media.zone === callId &&
    media.map === view.snapshot.map
      ? media
      : null;

  // Parou um instante numa zona ou perto de alguém: pede o acesso à chamada.
  // Se o servidor respondeu com outra chamada (alguém se mexeu), pede de novo.
  const accessOk = access !== null;
  useEffect(() => {
    if (!callId || isBusy || optedOut || status !== 'open' || accessOk) return;
    const timer = window.setTimeout(
      () => socketRef.current?.send({ type: 'media' }),
      ZONE_DWELL_MS,
    );
    return () => window.clearTimeout(timer);
  }, [callId, isBusy, optedOut, view.snapshot.map, status, accessOk, media]);

  const call = useCall({
    access,
    inCall: status === 'open' && !isBusy && !optedOut && callId !== null,
    unavailable:
      status === 'open' &&
      !isBusy &&
      !optedOut &&
      mediaUnavailable &&
      callId !== null,
    lockedByBusy: isBusy,
    snapshotRef,
  });

  const micPref = useMediaPrefs((state) => state.mic);
  const muteMicRef = useRef(call.muteMic);
  useEffect(() => {
    muteMicRef.current = call.muteMic;
  }, [call.muteMic]);

  const localSpeaking = Boolean(me && call.speakingIds.includes(me.id));
  const activityKey = `${me?.tx ?? 0}:${me?.ty ?? 0}:${me?.moving ? 1 : 0}:${localSpeaking ? 1 : 0}`;
  const micActive = micPref || call.mic;

  // Muta o microfone automaticamente após ~1 minuto parado (sem andar nem falar).
  useEffect(() => {
    if (!micActive || me?.moving || localSpeaking) return;
    const timer = window.setTimeout(() => {
      muteMicRef.current();
      setNotice('Microfone mutado automaticamente após 1 minuto parado.');
    }, IDLE_MIC_MUTE_MS);
    return () => window.clearTimeout(timer);
  }, [micActive, activityKey, me?.moving, localSpeaking]);

  const handleStatusChange = (next: Status) => {
    const prev = me?.status;
    setPantryExitPrompt(null);
    send({ type: 'status', status: next });
    if (next === 'coffee' || next === 'lunch') {
      // Tomando café ou Almoçando: fica indisponível (sai da chamada e silencia) e caminha até a copa/cafeteria.
      reachedPantryRef.current = meInPantry;
      setSpotlightKey(null);
      setMedia(null);
      call.setAudioOn(false);
      call.silenceLocal();
      world.goToPantry();
      setNotice(
        next === 'coffee'
          ? 'Indo para a copa tomar um café (você está indisponível para chamadas).'
          : 'Indo para a copa almoçar (você está indisponível para chamadas).',
      );
    } else if (next === 'busy') {
      reachedPantryRef.current = false;
      // Ocupado: sai da chamada imediatamente e pausa áudio, microfone, câmera e tela.
      setSpotlightKey(null);
      setMedia(null);
      call.setAudioOn(false);
      call.silenceLocal();
    } else if (next === 'away') {
      reachedPantryRef.current = false;
      // Ausente: muta microfone, desliga câmera e para tela, mas mantém os botões liberados.
      call.silenceLocal();
      if (isUnavailableStatus(prev)) call.setAudioOn(true);
    } else if (isUnavailableStatus(prev)) {
      reachedPantryRef.current = false;
      // Ficar online: desmuta somente o áudio e libera os demais controles.
      call.setAudioOn(true);
    }
  };
  const zoomIn = () => setZoom((z) => clampZoom(z * ZOOM_STEP));
  const zoomOut = () => setZoom((z) => clampZoom(z / ZOOM_STEP));
  useZoomKeys(zoomIn, zoomOut);
  const mapTouch = useZoomGestures(gameNode, zoom, setZoom);

  const sendConnected = (
    message: Parameters<typeof send>[0],
    offlineNotice: string,
  ): boolean => {
    if (status !== 'open') {
      setNotice(offlineNotice);
      return false;
    }
    send(message);
    return true;
  };

  const saveAppearance = (appearance: Appearance) => {
    if (
      !sendConnected(
        { type: 'appearance', appearance },
        'Sem conexão com o servidor para salvar a aparência.',
      )
    ) {
      return;
    }
    if (me) {
      world.apply(
        { type: 'appearance', id: me.id, appearance },
        performance.now(),
      );
    }
    setAvatarOpen(false);
  };

  const saveDeskConfig = (deskId: string, config: DeskInfo['config']) => {
    const info = desks[deskKey(map.id, deskId)];
    if (
      !sendConnected(
        { type: 'deskConfig', deskId, config },
        'Sem conexão com o servidor para salvar a mesa.',
      )
    ) {
      return false;
    }
    if (info) {
      useDeskStore.getState().upsert({ ...info, config });
    }
    return true;
  };

  const callName = callId
    ? (zoneName ?? (nearCall ? 'Conversa por perto' : null))
    : null;

  return (
    <div className={styles.container}>
      {isMobile ? (
        <MobileBottomNav
          activeTab={mobileTab}
          onSelectTab={setMobileTab}
          serverName={
            servers.find((s) => s.id === activeServerId)?.name ??
            serverSettings.name
          }
          servers={servers}
          activeServerId={activeServerId}
          onSelectServer={handleSelectServer}
          onCreateOrJoinServer={() => setCreateServerOpen(true)}
          session={session}
          status={me?.status ?? 'available'}
          appearance={me?.appearance}
          unread={notifyCounts.totalUnread}
          mentions={notifyCounts.totalMentions}
          online={onlinePeople}
          peopleMe={people.me}
          peopleOthers={people.others}
          peopleQuery={peopleQuery}
          onPeopleQuery={setPeopleQuery}
          onGoToDesk={goToDesk}
          onOpenDm={openDm}
          onOpenAccount={openAccount}
          onOpenTheme={() => setThemeOpen(true)}
          onOpenServerSettings={() => setServerSettingsOpen(true)}
          onExit={() => void endSession(session.token)}
          send={send}
          inActiveCall={
            callId !== null &&
            status === 'open' &&
            !isBusy &&
            !optedOut &&
            call.status === 'on'
          }
          callLabel={callName}
          micOn={call.mic}
          onToggleMic={call.toggleMic}
        />
      ) : (
        <WorkspaceSidebar
          serverName={
            servers.find((s) => s.id === activeServerId)?.name ??
            serverSettings.name
          }
          serverIcon={serverSettings.icon}
          servers={servers}
          activeServerId={activeServerId}
          onSelectServer={handleSelectServer}
          session={session}
          status={me?.status ?? 'available'}
          appearance={me?.appearance}
          wide={wide}
          open={panelOpen}
          tab={sidebarTab}
          channelUnread={channelUnread}
          channelMentions={channelMentions}
          dmUnread={dmUnread}
          dmMentions={dmMentions}
          online={onlinePeople}
          peopleMe={people.me}
          peopleOthers={people.others}
          peopleQuery={peopleQuery}
          onPeopleQuery={setPeopleQuery}
          onSelectTab={selectSidebarTab}
          onToggleOpen={() => persistSidebarOpen(!panelOpen)}
          onClose={() => persistSidebarOpen(false)}
          onGoToDesk={goToDesk}
          onOpenDm={openDm}
          accountOpen={accountOpen}
          onOpenAccount={openAccount}
          onOpenServerSettings={() => setServerSettingsOpen(true)}
          onOpenCreateServer={() => setCreateServerOpen(true)}
          onExit={() => void endSession(session.token)}
          onNotify={setNotice}
          send={send}
        />
      )}

      <main ref={setGameNode} className={styles.game} {...mapTouch}>
        <OfficeMap
          snapshot={view.snapshot}
          time={view.time}
          zoom={zoom}
          viewport={gameSize}
          speakingIds={call.speakingIds}
          onGoToArea={(areaId) =>
            world.goTo({ map: view.snapshot.map, areaId })
          }
          myEmail={myEmail}
          iHaveDesk={mine !== undefined}
          isAdmin={session.user.admin}
          inCall={call.tiles.length > 0}
          previewDeskId={
            previewDesk && previewDesk.map === view.snapshot.map
              ? previewDesk.deskId
              : null
          }
          pendingDeskAction={pendingDeskAction}
          onAdoptDesk={(deskId) => {
            if (pendingDeskAction) return;
            setPendingDeskAction({ deskId, action: 'adopt' });
            if (
              !sendConnected(
                { type: 'deskAdopt', deskId },
                'Sem conexão com o servidor para adotar a mesa.',
              )
            ) {
              setPendingDeskAction(null);
            }
          }}
          onSitDesk={(deskId) => world.goTo({ map: view.snapshot.map, deskId })}
          onMoveDesk={(deskId) => setMovingDeskId(deskId)}
          onToggleDeskLock={(deskId) => {
            if (pendingDeskAction) return;
            const info = desks[deskKey(map.id, deskId)];
            if (!info) return;
            setPendingDeskAction({ deskId, action: 'lock' });
            if (
              !saveDeskConfig(deskId, {
                ...info.config,
                locked: !info.config.locked,
              })
            ) {
              setPendingDeskAction(null);
            }
          }}
          onEditDesk={(deskId) => setEditingDeskId(deskId)}
          onReleaseDesk={(deskId) => {
            if (pendingDeskAction) return;
            setPendingDeskAction({ deskId, action: 'release' });
            if (
              !sendConnected(
                { type: 'deskRelease', deskId },
                'Sem conexão com o servidor para devolver a mesa.',
              )
            ) {
              setPendingDeskAction(null);
            }
          }}
          movingDeskId={
            movingDeskId && mine?.map === view.snapshot.map
              ? movingDeskId
              : null
          }
          onPlaceDesk={(col, row) => {
            if (!movingDeskId) return;
            if (
              sendConnected(
                { type: 'deskMove', deskId: movingDeskId, col, row },
                'Sem conexão com o servidor para mover a mesa.',
              )
            ) {
              setMovingDeskId(null);
            }
          }}
        />
        <CallTiles
          tiles={call.tiles}
          width={gameSize.width}
          compact={compact}
          spotlightKey={
            callId !== null && status === 'open' && !isBusy && !optedOut
              ? spotlightKey
              : null
          }
          onSpotlightChange={setSpotlightKey}
        />

        {status !== 'open' ? (
          <div className={styles.topBar}>
            <span className={styles.pill}>{STATUS_LABEL[status]}</span>
          </div>
        ) : null}

        {movingDeskId && mine?.map === view.snapshot.map ? (
          <div className={styles.moveBanner} role="status">
            <span className={styles.bannerText}>
              Clique no mapa para posicionar sua mesa (Esc para cancelar)
            </span>
            <button
              type="button"
              className={styles.moveCancel}
              onClick={() => setMovingDeskId(null)}
            >
              Cancelar
            </button>
          </div>
        ) : null}

        {banner ? (
          <div className={styles.banner} role="status">
            <span className={styles.bannerText}>{banner}</span>
          </div>
        ) : null}

        <ZoomControls
          canZoomIn={zoom < MAX_ZOOM}
          canZoomOut={zoom > MIN_ZOOM}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onOpenHelp={() => setHelpOpen(true)}
        />

        <WelcomeGuide />

        {showJoystick ? (
          <div className={styles.joystick}>
            <Joystick
              onChange={(direction) => {
                touch.current = direction;
              }}
            />
          </div>
        ) : null}

        {isMobile ? (
          <MobileCallBar
            me={me}
            call={call}
            hasDesk={mine !== undefined}
            onGoToMyDesk={() => mine && goToDesk(mine)}
            inCallZone={callId !== null && status === 'open' && !isBusy}
            optedOut={optedOut}
            onLeaveCall={() => {
              setLeftCallKey(currentCallKey);
              setSpotlightKey(null);
              setMedia(null);
            }}
            onJoinCall={() => setLeftCallKey(null)}
            selfCamExpanded={
              callId !== null &&
              status === 'open' &&
              !isBusy &&
              !optedOut &&
              spotlightKey === 'self'
            }
            onToggleSelfCamExpand={() =>
              setSpotlightKey((prev) => (prev === 'self' ? null : 'self'))
            }
            onStatus={handleStatusChange}
            onEmote={(emote) => send({ type: 'emote', emote })}
          />
        ) : (
          <BottomBar
            me={me}
            call={call}
            hasDesk={mine !== undefined}
            onGoToMyDesk={() => mine && goToDesk(mine)}
            onHoverMyDesk={(hover) =>
              setPreviewDesk(hover && mine ? mine : null)
            }
            inCallZone={callId !== null && status === 'open' && !isBusy}
            optedOut={optedOut}
            onLeaveCall={() => {
              setLeftCallKey(currentCallKey);
              setSpotlightKey(null);
              setMedia(null);
            }}
            onJoinCall={() => setLeftCallKey(null)}
            selfCamExpanded={
              callId !== null &&
              status === 'open' &&
              !isBusy &&
              !optedOut &&
              spotlightKey === 'self'
            }
            onToggleSelfCamExpand={() =>
              setSpotlightKey((prev) => (prev === 'self' ? null : 'self'))
            }
            showMenuButton={!wide}
            unread={unread}
            mentions={mentions}
            onOpenSidebar={() => persistSidebarOpen(true)}
            onStatus={handleStatusChange}
            onEmote={(emote) => send({ type: 'emote', emote })}
            onAvatar={() => setAvatarOpen(true)}
            onAccount={openAccount}
            onThemes={() => setThemeOpen(true)}
          />
        )}
      </main>

      {editingDeskId && editingDeskInfo?.owner?.email === myEmail ? (
        <DeskEditor
          initial={editingDeskInfo.config}
          onSave={(config) => {
            if (saveDeskConfig(editingDeskId, config)) {
              setEditingDeskId(null);
            }
          }}
          onClose={() => setEditingDeskId(null)}
        />
      ) : null}

      {avatarOpen && me ? (
        <AvatarEditor
          initial={me.appearance}
          onSave={saveAppearance}
          onClose={() => setAvatarOpen(false)}
        />
      ) : null}

      {themeOpen ? <ThemeModal onClose={() => setThemeOpen(false)} /> : null}

      {accountOpen ? (
        <AccountModal
          session={session}
          status={me?.status ?? 'available'}
          appearance={me?.appearance}
          onStatus={handleStatusChange}
          onEditAvatar={() => setAvatarOpen(true)}
          onOpenThemes={() => setThemeOpen(true)}
          onExit={() => void endSession(session.token)}
          onClose={() => setAccountOpen(false)}
        />
      ) : null}

      {serverSettingsOpen ? (
        <ServerSettingsModal
          session={session}
          onClose={() => setServerSettingsOpen(false)}
          onNotify={setNotice}
        />
      ) : null}

      {createServerOpen ? (
        <CreateServerModal
          token={session.token}
          canCreate={canCreateServer(
            effectiveTiersOf(
              session.user.tier ?? (session.user.admin ? 'admin' : 'member'),
              session.user.secondaryTiers,
            ),
          )}
          onJoinedOrCreated={(server, action) => {
            setSwitchingServer(true);
            useChatStore.getState().reset();
            useDeskStore.getState().reset();
            usePeopleStore.getState().reset();
            addServer(server);
            setNotice(
              action === 'create'
                ? `Servidor "${server.name}" criado!`
                : `Você entrou no servidor "${server.name}"!`,
            );
          }}
          onClose={() => setCreateServerOpen(false)}
        />
      ) : null}

      {helpOpen ? (
        <HelpFeedbackModal
          session={session}
          onClose={() => setHelpOpen(false)}
          onNotify={setNotice}
        />
      ) : null}

      {activePantryPrompt ? (
        <PantryExitPrompt
          kind={activePantryPrompt}
          onFinishBreak={() => {
            setPantryExitPrompt(null);
            handleStatusChange('available');
            setNotice('Você voltou a ficar Disponível.');
          }}
          onReturnToPantry={() => {
            setPantryExitPrompt(null);
            world.goToPantry();
          }}
        />
      ) : null}

      {displaced ? (
        <SessionDisplacedModal
          onTakeover={() => {
            setDisplaced(false);
            send({ type: 'takeover' });
          }}
          onLogout={() => void endSession(session.token)}
        />
      ) : null}

      {askVerifyEmail ? (
        <VerifyEmailPrompt
          token={session.token}
          email={session.user.email}
          onVerified={() => {
            setAskVerifyEmail(false);
            setNotice('E-mail verificado com sucesso!');
          }}
          onDismiss={() => setAskVerifyEmail(false)}
        />
      ) : askEmailPrefs ? (
        <EmailPrefsPrompt
          token={session.token}
          onDone={() => setAskEmailPrefs(false)}
        />
      ) : null}

      {switchingServer ? (
        <div
          className={styles.serverSwitchOverlay}
          role="status"
          aria-live="polite"
        >
          <div className={styles.serverSwitchCard}>
            <div className={styles.serverSwitchSpinner} aria-hidden="true" />
            <span>Trocando de servidor…</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
