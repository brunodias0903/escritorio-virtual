# Spec: Rebranding Mobile e Experiência PWA Nativa

## ADDED Requirements

### Requirement: Native-app Mobile UI/UX shell and server switching

The mobile interface (`isMobileViewport`) MUST provide a native-app-like shell that adapts cleanly to both Light and Dark themes using `@design-system` semantic tokens without hardcoded contrast-breaking colors.

The mobile experience SHALL include:

1. A floating glassmorphic Bottom Navigation dock with active pill indicators, safe-area inset handling, and unread/mention badges.
2. A compact floating top bar on the Map tab displaying the active server switcher pill and quick status/notification controls.
3. A native-style Bottom Sheet for switching between joined servers or opening the create/join server modal.

#### Scenario: Switching servers on mobile PWA

- **WHEN** a mobile user taps the active server pill in the Map top bar
- **THEN** a bottom sheet lists all servers the user belongs to along with an action to create or join a server, and selecting a server switches `activeServerId` immediately.

### Requirement: Preference-aware notification sounds and PWA native notifications

The system MUST honor the user's selected `ChatNotifyMode` (`all`, `mentions_and_dms`, `dms_only`, `mentions_only`, `muted`) for badge counts, document title, audio chimes, and OS notifications.

#### Scenario: Mention vs regular message notification

- **WHEN** new unread mentions arrive while the user is not `busy` and `notifyMode` is not `muted`
- **THEN** the system plays a distinct mention chime (unlocking `AudioContext` on first user gesture on mobile), updates the PWA app badge via the Badging API when supported, and dispatches a Service Worker notification if the app is in the background and permission was granted.
