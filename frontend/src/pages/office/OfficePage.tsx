import { isMobileViewport, type MobileNavTab } from '@design-system';
import { useEffect, useRef, useState } from 'react';

import { authApi, workspaceApi } from '@/app/api';
import { WS_URL } from '@/app/config';
import { endSession } from '@/app/session';
import { useAccessibilityStore } from '@/features/accessibility/accessibilityStore';
import { AccountModal } from '@/features/auth/components/AccountModal';
import { EmailPrefsPrompt } from '@/features/auth/components/EmailPrefsPrompt';
import { VerifyEmailPrompt } from '@/features/auth/components/VerifyEmailPrompt';
import {
  totalMentions,
  totalUnread,
  useChatStore,
} from '@/features/chat/model/chatStore';
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
import { peopleList } from '@/features/office/model/people';
import { usePeopleStore } from '@/features/office/model/peopleStore';
import { ThemeModal } from '@/features/theme/ThemeModal';
import { useThemeStore } from '@/features/theme/themeStore';
import { HelpFeedbackModal } from '@/features/workspace/components/HelpFeedbackModal';
import { ServerSettingsModal } from '@/features/workspace/components/ServerSettingsModal';
import { useServerStore } from '@/features/workspace/model/serverStore';
import {
  callKey,
  callZoneId,
  deskKey,
  isNearCall,
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
import { playNotifyChime } from '@/shared/lib/notifySound';

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
  const unread = useChatStore((state) => totalUnread(state.channels));
  const mentions = useChatStore((state) => totalMentions(state.channels));

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

  useEffect(() => {
    let alive = true;
    void workspaceApi.getServerSettings().then((settings) => {
      if (alive) setServerSettings(settings);
    });
    return () => {
      alive = false;
    };
  }, [setServerSettings]);
  const [editingDeskId, setEditingDeskId] = useState<string | null>(null);
  const [movingDeskId, setMovingDeskId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const desks = useDeskStore((state) => state.desks);
  const allPeople = usePeopleStore((state) => state.people);
  const [peopleQuery, setPeopleQuery] = useState('');
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('chat');

  const keyboard = useKeyboardDirection();
  const touch = useRef<Direction>({ dx: 0, dy: 0 });
  const socketRef = useRef<OfficeSocket | null>(null);
  const snapshotRef = useRef<WorldSnapshot>(view.snapshot);

  useEffect(() => {
    snapshotRef.current = view.snapshot;
  }, [view.snapshot]);

  const themePresetId = useThemeStore((s) => s.presetId);
  const themeColors = useThemeStore((s) => s.colors);
  const themeCustomized = useThemeStore((s) => s.customized);
  const themeHydratedRef = useRef(false);
  const prevUnreadRef = useRef(unread + mentions);

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
        colors: themeColors,
        customized: themeCustomized,
      });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [session.token, themePresetId, themeColors, themeCustomized]);

  const myStatus = view.snapshot.players.find(
    (p) => p.id === view.snapshot.meId,
  )?.status;

  // Atualiza título da aba e toca som sutil ao receber novas mensagens/menções.
  useEffect(() => {
    const total = unread + mentions;
    document.title =
      total > 0 ? `(${total}) Escritório Virtual` : 'Escritório Virtual';
    if (total > prevUnreadRef.current && myStatus !== 'busy') {
      playNotifyChime('message');
    }
    prevUnreadRef.current = total;
    return () => {
      document.title = 'Escritório Virtual';
    };
  }, [unread, mentions, myStatus]);

  // Largo: o chat começa aberto. Estreito: começa fechado. Depois, o botão manda.
  useEffect(() => {
    setPanelOpen(wide);
  }, [wide, setPanelOpen]);

  // Ao ver um canal na aba Chat, ele conta como lido também no servidor.
  const chatVisible = isMobile
    ? mobileTab === 'chat'
    : panelOpen && sidebarTab === 'chat';
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
      onMessage: (message) =>
        routeServerMessage(
          message,
          world,
          (m) => socket.send(m),
          { set: setMedia, setUnavailable: setMediaUnavailable },
          setNotice,
          setDisplaced,
        ),
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
        setLeftCallKey((prev) => {
          if (!prev) return null;
          const resolved = resolveMap(
            world.map,
            Object.values(useDeskStore.getState().desks),
          );
          const nextZone = callZoneId(resolved, step);
          return prev === `${world.map}:${nextZone ?? ''}` ? prev : null;
        });
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
  }, [session.token, session.user.email, world, keyboard]);

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
      setPanelOpen(false);
    } else {
      setSidebarTab(next);
      setPanelOpen(true);
    }
  };
  const openDm = (email: string) => {
    send({ type: 'openDm', email });
    setSidebarTab('chat');
    setPanelOpen(true);
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
  const banner = view.snapshot.lockedZone
    ? `${view.snapshot.lockedZone} está bloqueada pelo dono.`
    : view.snapshot.fullZone
      ? `${view.snapshot.fullZone} está cheia (3 de 3). Espere alguém sair.`
      : notice;

  // A chamada em que devo estar: a da zona, a conversa com quem está perto
  // na estrada, ou nenhuma. Usa as posições de destino (o passo já valeu).
  const callId = me
    ? callKey(
        map,
        { id: me.id, x: me.tx, y: me.ty },
        view.snapshot.players.map((p) => ({ id: p.id, x: p.tx, y: p.ty })),
      )
    : null;
  const nearCall = isNearCall(callId);
  const currentCallKey = callId ? `${view.snapshot.map}:${callId}` : null;
  const optedOut = currentCallKey !== null && leftCallKey === currentCallKey;

  // O acesso só vale enquanto conectado ao servidor, sem ter saído manualmente e na mesma chamada/sala.
  // Se a conexão WebSocket cair (ex.: túnel fechado), desconecta do LiveKit na hora para não deixar "fantasmas".
  const access =
    status === 'open' &&
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
    if (!callId || optedOut || status !== 'open' || accessOk) return;
    const timer = window.setTimeout(
      () => socketRef.current?.send({ type: 'media' }),
      ZONE_DWELL_MS,
    );
    return () => window.clearTimeout(timer);
  }, [callId, optedOut, view.snapshot.map, status, accessOk, media]);

  const call = useCall({
    access,
    inCall: status === 'open' && !optedOut && callId !== null,
    unavailable:
      status === 'open' && !optedOut && mediaUnavailable && callId !== null,
    lockedByBusy: me?.status === 'busy',
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
    send({ type: 'status', status: next });
    if (next === 'busy') {
      // Ocupado: muta áudio, microfone, desliga câmera e interrompe tela.
      call.setAudioOn(false);
      call.silenceLocal();
    } else if (next === 'away') {
      // Ausente: muta microfone, desliga câmera e para tela, mas mantém os botões liberados.
      call.silenceLocal();
      if (prev === 'busy') call.setAudioOn(true);
    } else if (prev === 'busy') {
      // Ficar online: desmuta somente o áudio e libera os demais controles.
      call.setAudioOn(true);
    }
  };
  const zoomIn = () => setZoom((z) => clampZoom(z * ZOOM_STEP));
  const zoomOut = () => setZoom((z) => clampZoom(z / ZOOM_STEP));
  useZoomKeys(zoomIn, zoomOut);
  const mapTouch = useZoomGestures(gameNode, zoom, setZoom);

  const saveAppearance = (appearance: Appearance) => {
    send({ type: 'appearance', appearance });
    setAvatarOpen(false);
  };

  const callName = callId
    ? (zoneName ?? (nearCall ? 'Conversa por perto' : null))
    : null;
  const zoneLabel = callName
    ? optedOut
      ? `${callName} · fora da chamada`
      : call.status === 'on'
        ? `${callName} · em chamada`
        : `${callName} · ${call.status === 'unavailable' ? 'sem chamadas' : 'entrando na chamada…'}`
    : 'Estrada · aproxime-se de alguém para conversar';

  return (
    <div className={styles.container}>
      {isMobile ? (
        <MobileBottomNav
          activeTab={mobileTab}
          onSelectTab={setMobileTab}
          serverName={serverSettings.name}
          floorName={status === 'open' ? map.name : STATUS_LABEL[status]}
          session={session}
          status={me?.status ?? 'available'}
          appearance={me?.appearance}
          unread={unread}
          mentions={mentions}
          online={onlinePeople}
          peopleMe={people.me}
          peopleOthers={people.others}
          peopleQuery={peopleQuery}
          onPeopleQuery={setPeopleQuery}
          onGoToDesk={goToDesk}
          onOpenDm={openDm}
          onOpenAccount={openAccount}
          onOpenServerSettings={() => setServerSettingsOpen(true)}
          onExit={() => void endSession(session.token)}
          send={send}
          inActiveCall={
            callId !== null &&
            status === 'open' &&
            !optedOut &&
            call.status === 'on'
          }
          callLabel={callName}
          micOn={call.mic}
          onToggleMic={call.toggleMic}
        />
      ) : (
        <WorkspaceSidebar
          serverName={serverSettings.name}
          serverIcon={serverSettings.icon}
          floorName={status === 'open' ? map.name : STATUS_LABEL[status]}
          session={session}
          status={me?.status ?? 'available'}
          appearance={me?.appearance}
          wide={wide}
          open={panelOpen}
          tab={sidebarTab}
          unread={unread}
          mentions={mentions}
          online={onlinePeople}
          peopleMe={people.me}
          peopleOthers={people.others}
          peopleQuery={peopleQuery}
          onPeopleQuery={setPeopleQuery}
          onSelectTab={selectSidebarTab}
          onToggleOpen={() => setPanelOpen(!panelOpen)}
          onClose={() => setPanelOpen(false)}
          onGoToDesk={goToDesk}
          onOpenDm={openDm}
          accountOpen={accountOpen}
          onOpenAccount={openAccount}
          onOpenServerSettings={() => setServerSettingsOpen(true)}
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
          onWalkToPoint={(point) =>
            world.goTo({ map: view.snapshot.map, point })
          }
          myEmail={myEmail}
          iHaveDesk={mine !== undefined}
          isAdmin={session.user.admin}
          onAdoptDesk={(deskId) => send({ type: 'deskAdopt', deskId })}
          onMoveDesk={(deskId) => setMovingDeskId(deskId)}
          onToggleDeskLock={(deskId) => {
            const info = desks[deskKey(map.id, deskId)];
            if (!info) return;
            send({
              type: 'deskConfig',
              deskId,
              config: { ...info.config, locked: !info.config.locked },
            });
          }}
          onEditDesk={(deskId) => setEditingDeskId(deskId)}
          onReleaseDesk={(deskId) => send({ type: 'deskRelease', deskId })}
          movingDeskId={
            movingDeskId && mine?.map === view.snapshot.map
              ? movingDeskId
              : null
          }
          onPlaceDesk={(col, row) => {
            if (!movingDeskId) return;
            send({ type: 'deskMove', deskId: movingDeskId, col, row });
            setMovingDeskId(null);
          }}
        />
        <CallTiles
          tiles={call.tiles}
          width={gameSize.width}
          compact={compact}
          spotlightKey={
            callId !== null && status === 'open' && !optedOut
              ? spotlightKey
              : null
          }
          onSpotlightChange={setSpotlightKey}
        />

        <div className={styles.topBar}>
          <span className={styles.pill}>
            {status === 'open' ? map.name : STATUS_LABEL[status]}
          </span>
          {status === 'open' ? (
            <span
              className={`${styles.pill} ${callName && !optedOut ? styles.pillZone : ''}`}
            >
              {zoneLabel}
            </span>
          ) : null}
        </div>

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
            inCallZone={callId !== null && status === 'open'}
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
            inCallZone={callId !== null && status === 'open'}
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
              !optedOut &&
              spotlightKey === 'self'
            }
            onToggleSelfCamExpand={() =>
              setSpotlightKey((prev) => (prev === 'self' ? null : 'self'))
            }
            showMenuButton={!wide}
            unread={unread}
            mentions={mentions}
            onOpenSidebar={() => setPanelOpen(true)}
            compact={compact}
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
            send({ type: 'deskConfig', deskId: editingDeskId, config });
            setEditingDeskId(null);
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

      {helpOpen ? (
        <HelpFeedbackModal
          session={session}
          onClose={() => setHelpOpen(false)}
          onNotify={setNotice}
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
    </div>
  );
}
