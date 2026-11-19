import { useEffect, useRef, useState } from 'react';

import { WS_URL } from '@/app/config';
import { endSession } from '@/app/session';
import { AccountEditor } from '@/features/auth/components/AccountEditor';
import { ChatPanel } from '@/features/chat/components/ChatPanel';
import {
  totalMentions,
  totalUnread,
  useChatStore,
} from '@/features/chat/model/chatStore';
import { DeskCard } from '@/features/desks/components/DeskCard';
import { DeskEditor } from '@/features/desks/components/DeskEditor';
import { deskCardState } from '@/features/desks/model/deskCard';
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
import { OfficeMap } from '@/features/office/components/OfficeMap';
import { PeoplePanel } from '@/features/office/components/PeoplePanel';
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
  const wide = windowSize.width >= WIDE_BREAKPOINT;
  const compact = windowSize.width < COMPACT_BREAKPOINT;
  const showJoystick = useShowJoystick();

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
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [gameNode, setGameNode] = useState<HTMLElement | null>(null);
  const gameSize = useElementSize(gameNode, windowSize);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [deskEditorOpen, setDeskEditorOpen] = useState(false);
  const [movingDeskId, setMovingDeskId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const desks = useDeskStore((state) => state.desks);
  const allPeople = usePeopleStore((state) => state.people);
  const [peopleQuery, setPeopleQuery] = useState('');
  const [peopleOpen, setPeopleOpen] = useState(false);

  const keyboard = useKeyboardDirection();
  const touch = useRef<Direction>({ dx: 0, dy: 0 });
  const socketRef = useRef<OfficeSocket | null>(null);
  const snapshotRef = useRef<WorldSnapshot>(view.snapshot);

  useEffect(() => {
    snapshotRef.current = view.snapshot;
  }, [view.snapshot]);

  // Largo: o chat começa aberto. Estreito: começa fechado. Depois, o botão manda.
  useEffect(() => {
    setPanelOpen(wide);
  }, [wide, setPanelOpen]);

  // Ao ver um canal, ele conta como lido também no servidor.
  useEffect(() => {
    if (panelOpen) {
      socketRef.current?.send({ type: 'markRead', channel: active });
    }
  }, [panelOpen, active]);

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
      if (step) socket.send({ type: 'move', x: step.x, y: step.y });
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
  const zoneArea = map.areas.find((a) => a.id === zoneId);

  // Avisos curtos (mesa já tem dono, mesa cheia...) somem sozinhos.
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const myEmail = session.user.email;
  const mine = myDesk(desks, myEmail);
  const people = peopleList(allPeople, desks, myEmail, peopleQuery);
  const onlinePeople = onlineCount(allPeople);
  const goToDesk = (desk: DeskInfo) => {
    // Vai andando, um quadradinho por vez (até em outra sala, pela porta).
    world.goTo({ map: desk.map, deskId: desk.deskId });
    if (!wide) setPeopleOpen(false);
  };
  const openDm = (email: string) => {
    send({ type: 'openDm', email });
    setPeopleOpen(false);
    setPanelOpen(true);
  };
  const togglePeople = () => {
    if (!peopleOpen) setPanelOpen(false);
    setPeopleOpen(!peopleOpen);
  };
  const toggleChat = () => {
    if (!panelOpen) setPeopleOpen(false);
    setPanelOpen(!panelOpen);
  };

  // Quem está online (em todas as salas): pede logo e de tempos em tempos.
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

  const deskInfo = zoneArea?.desk
    ? desks[deskKey(map.id, zoneArea.id)]
    : undefined;
  const deskCard =
    zoneArea?.desk && zoneId
      ? deskCardState({
          name: zoneArea.name,
          people: view.snapshot.players.filter(
            (p) => callZoneId(map, p) === zoneId,
          ).length,
          info: deskInfo,
          myEmail,
          iHaveDesk: mine !== undefined,
          isAdmin: session.user.admin,
        })
      : null;
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

  // O acesso só vale na chamada e na sala para as quais foi emitido. Ao sair, a chamada cai.
  const access =
    media && media.zone === callId && media.map === view.snapshot.map
      ? media
      : null;

  // Parou um instante numa zona ou perto de alguém: pede o acesso à chamada.
  // Se o servidor respondeu com outra chamada (alguém se mexeu), pede de novo.
  const accessOk = access !== null;
  useEffect(() => {
    if (!callId || status !== 'open' || accessOk) return;
    const timer = window.setTimeout(
      () => socketRef.current?.send({ type: 'media' }),
      ZONE_DWELL_MS,
    );
    return () => window.clearTimeout(timer);
  }, [callId, view.snapshot.map, status, accessOk, media]);

  const call = useCall({
    access,
    inCall: callId !== null,
    unavailable: mediaUnavailable && callId !== null,
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

  const callName = zoneName ?? (nearCall ? 'Conversa por perto' : null);
  const zoneLabel = callName
    ? call.status === 'on'
      ? `${callName} · em chamada`
      : `${callName} · ${call.status === 'unavailable' ? 'sem chamadas' : 'entrando na chamada…'}`
    : 'Estrada · microfone e câmera desligados';

  return (
    <div className={styles.container}>
      <main ref={setGameNode} className={styles.game} {...mapTouch}>
        <OfficeMap
          snapshot={view.snapshot}
          time={view.time}
          zoom={zoom}
          viewport={gameSize}
          speakingIds={call.speakingIds}
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
        />

        <div className={styles.topBar}>
          <span className={styles.pill}>
            {status === 'open' ? map.name : STATUS_LABEL[status]}
          </span>
          {status === 'open' ? (
            <span
              className={`${styles.pill} ${callName ? styles.pillZone : ''}`}
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

        {deskCard && zoneId && !movingDeskId ? (
          <DeskCard
            state={deskCard}
            onAdopt={() => send({ type: 'deskAdopt', deskId: zoneId })}
            onEdit={() => setDeskEditorOpen(true)}
            onMove={() => setMovingDeskId(zoneId)}
            onToggleLock={() => {
              if (!deskInfo) return;
              send({
                type: 'deskConfig',
                deskId: zoneId,
                config: { ...deskInfo.config, locked: !deskInfo.config.locked },
              });
            }}
            onRelease={() => send({ type: 'deskRelease', deskId: zoneId })}
          />
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
        />

        {showJoystick ? (
          <div className={styles.joystick}>
            <Joystick
              onChange={(direction) => {
                touch.current = direction;
              }}
            />
          </div>
        ) : null}

        <BottomBar
          me={me}
          call={call}
          playerCount={onlinePeople || view.snapshot.players.length}
          peopleOpen={peopleOpen}
          onTogglePeople={togglePeople}
          hasDesk={mine !== undefined}
          onGoToMyDesk={() => mine && goToDesk(mine)}
          chatOpen={panelOpen}
          unread={unread}
          mentions={mentions}
          compact={compact}
          onStatus={handleStatusChange}
          onEmote={(emote) => send({ type: 'emote', emote })}
          onAvatar={() => setAvatarOpen(true)}
          onAccount={() => setAccountOpen(true)}
          onToggleChat={toggleChat}
          onExit={() => void endSession(session.token)}
        />
      </main>

      {wide && panelOpen ? (
        <div className={styles.sidePanel}>
          <ChatPanel send={send} />
        </div>
      ) : null}
      {!wide && panelOpen ? (
        <div className={styles.overlay}>
          <ChatPanel send={send} onClose={() => setPanelOpen(false)} />
        </div>
      ) : null}

      {peopleOpen ? (
        <div className={wide ? styles.sidePanel : styles.overlay}>
          <PeoplePanel
            me={people.me}
            others={people.others}
            online={onlinePeople}
            query={peopleQuery}
            onQuery={setPeopleQuery}
            onGoToDesk={goToDesk}
            onMessage={openDm}
            onClose={() => setPeopleOpen(false)}
          />
        </div>
      ) : null}

      {accountOpen ? (
        <AccountEditor
          session={session}
          onClose={() => setAccountOpen(false)}
        />
      ) : null}

      {deskEditorOpen && deskInfo?.owner?.email === myEmail && zoneId ? (
        <DeskEditor
          initial={deskInfo.config}
          onSave={(config) => {
            send({ type: 'deskConfig', deskId: zoneId, config });
            setDeskEditorOpen(false);
          }}
          onClose={() => setDeskEditorOpen(false)}
        />
      ) : null}

      {avatarOpen && me ? (
        <AvatarEditor
          initial={me.appearance}
          onSave={saveAppearance}
          onClose={() => setAvatarOpen(false)}
        />
      ) : null}
    </div>
  );
}
