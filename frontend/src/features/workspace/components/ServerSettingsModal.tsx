import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';

import { workspaceApi } from '@/app/api';
import type { ManagedChannel } from '@/features/workspace/api/workspaceApi';
import { useServerStore } from '@/features/workspace/model/serverStore';
import {
  ACCOUNT_TIERS,
  ACCOUNT_TIER_LABELS,
  errorMessage,
  type AccountTier,
  type Session,
} from '@/shared/domain';
import { useI18n } from '@/shared/i18n';
import { compressProfilePhoto } from '@/shared/lib/photo';

import styles from './ServerSettingsModal.module.css';

type Props = {
  session: Session;
  onClose: () => void;
  onNotify: (msg: string) => void;
};

type Tab = 'general' | 'channels';

export function ServerSettingsModal({ session, onClose, onNotify }: Props) {
  const { t } = useI18n();
  const settings = useServerStore((s) => s.settings);
  const setSettings = useServerStore((s) => s.setSettings);

  const [tab, setTab] = useState<Tab>('general');
  const [name, setName] = useState(settings.name);
  const [description, setDescription] = useState(settings.description);
  const [welcomeMessage, setWelcomeMessage] = useState(settings.welcomeMessage);
  const [allowPublicRegistration, setAllowPublicRegistration] = useState(
    settings.allowPublicRegistration,
  );
  const [icon, setIcon] = useState<string | null>(settings.icon);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [channels, setChannels] = useState<ManagedChannel[]>([]);
  const [channelsLoaded, setChannelsLoaded] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelTopic, setNewChannelTopic] = useState('');
  const [newChannelTiers, setNewChannelTiers] = useState<AccountTier[]>([
    ...ACCOUNT_TIERS,
  ]);
  const [busyChannelId, setBusyChannelId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadingChannels = tab === 'channels' && !channelsLoaded;

  useEffect(() => {
    if (tab !== 'channels' || channelsLoaded) return;
    let alive = true;
    void workspaceApi.listChannels(session.token).then((res) => {
      if (!alive) return;
      setChannelsLoaded(true);
      if (res.ok) setChannels(res.data.channels);
      else setError(errorMessage(res.error));
    });
    return () => {
      alive = false;
    };
  }, [tab, channelsLoaded, session.token]);

  const handleIconPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const dataUrl = await compressProfilePhoto(file);
      setIcon(dataUrl);
    } catch {
      setError('Não foi possível processar esta imagem.');
    }
    e.target.value = '';
  };

  const handleSaveGeneral = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res = await workspaceApi.updateServerSettings(session.token, {
      name: name.trim() || 'Setter',
      description: description.trim(),
      icon,
      welcomeMessage: welcomeMessage.trim(),
      allowPublicRegistration,
    });
    setSaving(false);
    if (!res.ok) {
      setError(errorMessage(res.error));
      return;
    }
    setSettings(res.data);
    onNotify(t('server.saved'));
  };

  const toggleTierIn = (
    list: AccountTier[],
    tier: AccountTier,
  ): AccountTier[] => {
    if (tier === 'master') return list; // Master sempre mantém acesso total
    const has = list.includes(tier);
    const next = has ? list.filter((x) => x !== tier) : [...list, tier];
    return next.includes('master') ? next : ['master', ...next];
  };

  const handleSaveChannel = async (ch: ManagedChannel) => {
    setBusyChannelId(ch.id);
    setError('');
    const res = await workspaceApi.updateChannel(session.token, ch.id, {
      topic: ch.topic,
      writeTiers: ch.writeTiers,
    });
    setBusyChannelId(null);
    if (!res.ok) {
      setError(errorMessage(res.error));
      return;
    }
    setChannels((prev) =>
      prev.map((c) => (c.id === ch.id ? res.data.channel : c)),
    );
    onNotify(t('server.channels.updated'));
  };

  const handleCreateChannel = async (e: FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    setBusyChannelId('__new__');
    setError('');
    const res = await workspaceApi.createChannel(session.token, {
      name: newChannelName.trim().toLowerCase(),
      topic: newChannelTopic.trim(),
      writeTiers: newChannelTiers,
    });
    setBusyChannelId(null);
    if (!res.ok) {
      setError(errorMessage(res.error));
      return;
    }
    setChannels((prev) => [...prev, res.data.channel]);
    setNewChannelName('');
    setNewChannelTopic('');
    setNewChannelTiers([...ACCOUNT_TIERS]);
    onNotify(t('server.channels.created'));
  };

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={t('server.title')}
      data-scroll-lock="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>{t('server.title')}</h2>
            <p className={styles.subtitle}>{t('server.subtitle')}</p>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            aria-label={t('common.close')}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tabBtn} ${tab === 'general' ? styles.tabActive : ''}`}
            onClick={() => setTab('general')}
          >
            ⚙️ {t('server.tab.general')}
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${tab === 'channels' ? styles.tabActive : ''}`}
            onClick={() => setTab('channels')}
          >
            # {t('server.tab.channels')}
          </button>
        </div>

        {error ? <div className={styles.error}>{error}</div> : null}

        <div className={styles.body}>
          {tab === 'general' ? (
            <form
              className={styles.form}
              onSubmit={(e) => void handleSaveGeneral(e)}
            >
              <div className={styles.iconRow}>
                <div className={styles.iconPreview}>
                  {icon ? (
                    <img src={icon} alt={name} className={styles.iconImg} />
                  ) : (
                    <span>{(name.trim()[0] ?? 'S').toUpperCase()}</span>
                  )}
                </div>
                <div className={styles.iconControls}>
                  <div className={styles.label}>{t('server.icon')}</div>
                  <p className={styles.hint}>{t('server.iconHint')}</p>
                  <div className={styles.btnRow}>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      hidden
                      onChange={(e) => void handleIconPick(e)}
                    />
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      onClick={() => fileRef.current?.click()}
                    >
                      {t('server.uploadIcon')}
                    </button>
                    {icon ? (
                      <button
                        type="button"
                        className={styles.ghostBtn}
                        onClick={() => setIcon(null)}
                      >
                        {t('server.removeIcon')}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              <label className={styles.field}>
                <span className={styles.label}>{t('server.name')}</span>
                <input
                  type="text"
                  className={styles.input}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={40}
                  required
                />
              </label>

              <label className={styles.field}>
                <span className={styles.label}>{t('server.description')}</span>
                <textarea
                  className={styles.textarea}
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={240}
                />
              </label>

              <label className={styles.field}>
                <span className={styles.label}>
                  {t('server.welcomeMessage')}
                </span>
                <input
                  type="text"
                  className={styles.input}
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  maxLength={280}
                />
              </label>

              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={allowPublicRegistration}
                  onChange={(e) => setAllowPublicRegistration(e.target.checked)}
                />
                <span>{t('server.allowPublicRegistration')}</span>
              </label>

              <div className={styles.footer}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={onClose}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className={styles.primaryBtn}
                  disabled={saving}
                >
                  {saving ? t('common.saving') : t('common.save')}
                </button>
              </div>
            </form>
          ) : (
            <div className={styles.channelsPane}>
              <p className={styles.hint}>{t('server.channels.hint')}</p>

              <form
                className={styles.newChannelCard}
                onSubmit={(e) => void handleCreateChannel(e)}
              >
                <div className={styles.sectionTitle}>
                  {t('server.channels.newTitle')}
                </div>
                <div className={styles.inlineInputs}>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder={t('server.channels.newName')}
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    maxLength={30}
                  />
                  <input
                    type="text"
                    className={styles.input}
                    placeholder={t('server.channels.topic')}
                    value={newChannelTopic}
                    onChange={(e) => setNewChannelTopic(e.target.value)}
                    maxLength={160}
                  />
                </div>
                <div className={styles.tierRow}>
                  {ACCOUNT_TIERS.map((tier) => {
                    const active = newChannelTiers.includes(tier);
                    return (
                      <button
                        key={tier}
                        type="button"
                        disabled={tier === 'master'}
                        className={`${styles.tierChip} ${active ? styles.tierChipActive : ''}`}
                        onClick={() =>
                          setNewChannelTiers((prev) => toggleTierIn(prev, tier))
                        }
                      >
                        {ACCOUNT_TIER_LABELS[tier]}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="submit"
                  className={styles.primaryBtn}
                  disabled={
                    busyChannelId === '__new__' || !newChannelName.trim()
                  }
                >
                  + {t('common.create')}
                </button>
              </form>

              {loadingChannels ? (
                <p className={styles.hint}>{t('common.loading')}</p>
              ) : (
                <div className={styles.channelList}>
                  {channels
                    .filter((c) => !c.archived)
                    .map((ch) => (
                      <div key={ch.id} className={styles.channelCard}>
                        <div className={styles.channelCardHeader}>
                          <strong>#{ch.name}</strong>
                          <button
                            type="button"
                            className={styles.smallSaveBtn}
                            disabled={busyChannelId === ch.id}
                            onClick={() => void handleSaveChannel(ch)}
                          >
                            {busyChannelId === ch.id
                              ? t('common.saving')
                              : t('common.save')}
                          </button>
                        </div>
                        <input
                          type="text"
                          className={styles.input}
                          placeholder={t('server.channels.topic')}
                          value={ch.topic}
                          maxLength={160}
                          onChange={(e) =>
                            setChannels((prev) =>
                              prev.map((c) =>
                                c.id === ch.id
                                  ? { ...c, topic: e.target.value }
                                  : c,
                              ),
                            )
                          }
                        />
                        <div className={styles.tierLabel}>
                          {t('server.channels.writeTiers')}:
                        </div>
                        <div className={styles.tierRow}>
                          {ACCOUNT_TIERS.map((tier) => {
                            const active = ch.writeTiers.includes(tier);
                            return (
                              <button
                                key={tier}
                                type="button"
                                disabled={tier === 'master'}
                                className={`${styles.tierChip} ${active ? styles.tierChipActive : ''}`}
                                onClick={() =>
                                  setChannels((prev) =>
                                    prev.map((c) =>
                                      c.id === ch.id
                                        ? {
                                            ...c,
                                            writeTiers: toggleTierIn(
                                              c.writeTiers,
                                              tier,
                                            ),
                                          }
                                        : c,
                                    ),
                                  )
                                }
                              >
                                {ACCOUNT_TIER_LABELS[tier]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
