import { useEffect, useState, type FormEvent } from 'react';

import { workspaceApi } from '@/app/api';
import {
  ACCOUNT_TIER_LABELS,
  FEEDBACK_KINDS,
  FEEDBACK_STATUSES,
  canAttachFeedbackMr,
  canProgressFeedback,
  canResolveFeedback,
  canSeeFeedbackMr,
  effectiveTiersOf,
  errorMessage,
  type FeedbackItem,
  type FeedbackKind,
  type FeedbackStatus,
  type Session,
} from '@/shared/domain';
import { useI18n, type TranslationKey } from '@/shared/i18n';

import styles from './HelpFeedbackModal.module.css';

type Props = {
  session: Session;
  onClose: () => void;
  onNotify: (msg: string) => void;
};

type Tab = 'guide' | 'feedback';

const KIND_KEY: Record<FeedbackKind, TranslationKey> = {
  suggestion: 'feedback.kind.suggestion',
  bug: 'feedback.kind.bug',
  complaint: 'feedback.kind.complaint',
  question: 'feedback.kind.question',
};

const STATUS_KEY: Record<FeedbackStatus, TranslationKey> = {
  open: 'feedback.status.open',
  in_progress: 'feedback.status.in_progress',
  testing: 'feedback.status.testing',
  done: 'feedback.status.done',
  closed: 'feedback.status.closed',
};

const KIND_EMOJI: Record<FeedbackKind, string> = {
  suggestion: '💡',
  bug: '🐛',
  complaint: '📣',
  question: '❓',
};

export function HelpFeedbackModal({ session, onClose, onNotify }: Props) {
  const { t } = useI18n();
  const tiers = effectiveTiersOf(
    session.user.tier ?? 'tester',
    session.user.secondaryTiers,
  );
  const showMr = canSeeFeedbackMr(tiers);
  const canEditMr = canAttachFeedbackMr(tiers);
  const canResolve = canResolveFeedback(tiers);
  const canProgress = canProgressFeedback(tiers);

  const [tab, setTab] = useState<Tab>('feedback');
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FeedbackStatus | 'all'>('all');
  const [creating, setCreating] = useState(false);

  const [kind, setKind] = useState<FeedbackKind>('suggestion');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [mrDrafts, setMrDrafts] = useState<Record<string, string>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>(
    {},
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void workspaceApi.listFeedback(session.token).then((res) => {
      if (!alive) return;
      setLoading(false);
      if (res.ok) {
        setItems(res.data.items);
      } else {
        setError(errorMessage(res.error));
      }
    });
    return () => {
      alive = false;
    };
  }, [session.token]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setSubmitting(true);
    setError('');
    const res = await workspaceApi.createFeedback(session.token, {
      kind,
      title: title.trim(),
      description: description.trim(),
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(errorMessage(res.error));
      return;
    }
    setItems((prev) => [res.data.item, ...prev]);
    setExpandedId(res.data.item.id);
    setTitle('');
    setDescription('');
    setCreating(false);
    onNotify('Solicitação enviada!');
  };

  const handleUpdate = async (
    id: string,
    patch: { status?: FeedbackStatus; mrUrl?: string | null },
  ) => {
    setBusyId(id);
    setError('');
    const res = await workspaceApi.updateFeedback(session.token, id, patch);
    setBusyId(null);
    if (!res.ok) {
      setError(errorMessage(res.error));
      return;
    }
    setItems((prev) => prev.map((it) => (it.id === id ? res.data.item : it)));
  };

  const handleComment = async (id: string, e: FormEvent) => {
    e.preventDefault();
    const body = (commentDrafts[id] ?? '').trim();
    if (!body) return;
    setBusyId(id);
    setError('');
    const res = await workspaceApi.addFeedbackComment(session.token, id, {
      body,
    });
    setBusyId(null);
    if (!res.ok) {
      setError(errorMessage(res.error));
      return;
    }
    setItems((prev) =>
      prev.map((it) =>
        it.id === id
          ? { ...it, comments: [...it.comments, res.data.comment] }
          : it,
      ),
    );
    setCommentDrafts((prev) => ({ ...prev, [id]: '' }));
  };

  const filtered =
    filter === 'all' ? items : items.filter((it) => it.status === filter);

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={t('help.modal.title')}
      data-scroll-lock="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>{t('help.modal.title')}</h2>
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
            className={`${styles.tabBtn} ${tab === 'feedback' ? styles.tabActive : ''}`}
            onClick={() => setTab('feedback')}
          >
            💬 {t('help.tab.feedback')} ({items.length})
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${tab === 'guide' ? styles.tabActive : ''}`}
            onClick={() => setTab('guide')}
          >
            ❓ {t('help.tab.guide')}
          </button>
        </div>

        {error ? <div className={styles.error}>{error}</div> : null}

        <div className={styles.body}>
          {tab === 'guide' ? (
            <div className={styles.guideGrid}>
              <div className={styles.guideCard}>
                <div className={styles.guideTitle}>
                  🧭 {t('help.guide.moveTitle')}
                </div>
                <p className={styles.guideDesc}>{t('help.guide.moveDesc')}</p>
              </div>
              <div className={styles.guideCard}>
                <div className={styles.guideTitle}>
                  🪑 {t('help.guide.desksTitle')}
                </div>
                <p className={styles.guideDesc}>{t('help.guide.desksDesc')}</p>
              </div>
              <div className={styles.guideCard}>
                <div className={styles.guideTitle}>
                  🎙️ {t('help.guide.callsTitle')}
                </div>
                <p className={styles.guideDesc}>{t('help.guide.callsDesc')}</p>
              </div>
              <div className={styles.guideCard}>
                <div className={styles.guideTitle}>
                  📱 {t('help.guide.pwaTitle')}
                </div>
                <p className={styles.guideDesc}>{t('help.guide.pwaDesc')}</p>
              </div>
            </div>
          ) : (
            <div className={styles.feedbackPane}>
              <div className={styles.toolbar}>
                <div className={styles.filters}>
                  <button
                    type="button"
                    className={`${styles.filterChip} ${filter === 'all' ? styles.filterActive : ''}`}
                    onClick={() => setFilter('all')}
                  >
                    {t('feedback.status.all')}
                  </button>
                  {FEEDBACK_STATUSES.map((st) => (
                    <button
                      key={st}
                      type="button"
                      className={`${styles.filterChip} ${filter === st ? styles.filterActive : ''}`}
                      onClick={() => setFilter(st)}
                    >
                      {t(STATUS_KEY[st])}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={() => setCreating((v) => !v)}
                >
                  {creating ? t('common.cancel') : `+ ${t('feedback.new')}`}
                </button>
              </div>

              {creating ? (
                <form
                  className={styles.createForm}
                  onSubmit={(e) => void handleCreate(e)}
                >
                  <div className={styles.kindRow}>
                    {FEEDBACK_KINDS.map((k) => (
                      <button
                        key={k}
                        type="button"
                        className={`${styles.kindChip} ${kind === k ? styles.kindActive : ''}`}
                        onClick={() => setKind(k)}
                      >
                        {KIND_EMOJI[k]} {t(KIND_KEY[k])}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder={t('feedback.form.titlePlaceholder')}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={120}
                    required
                  />
                  <textarea
                    className={styles.textarea}
                    rows={3}
                    placeholder={t('feedback.form.descriptionPlaceholder')}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={2000}
                    required
                  />
                  <div className={styles.formActions}>
                    <button
                      type="submit"
                      className={styles.primaryBtn}
                      disabled={submitting}
                    >
                      {submitting ? t('common.sending') : t('common.send')}
                    </button>
                  </div>
                </form>
              ) : null}

              {loading ? (
                <p className={styles.empty}>{t('common.loading')}</p>
              ) : filtered.length === 0 ? (
                <p className={styles.empty}>{t('feedback.empty')}</p>
              ) : (
                <div className={styles.list}>
                  {filtered.map((item) => {
                    const isOpen = expandedId === item.id;
                    const mrDraft = mrDrafts[item.id] ?? item.mrUrl ?? '';
                    const commentDraft = commentDrafts[item.id] ?? '';
                    const busy = busyId === item.id;

                    return (
                      <article key={item.id} className={styles.card}>
                        <button
                          type="button"
                          className={styles.cardHeader}
                          onClick={() => setExpandedId(isOpen ? null : item.id)}
                        >
                          <div className={styles.cardMeta}>
                            <span className={styles.kindBadge}>
                              {KIND_EMOJI[item.kind]} {t(KIND_KEY[item.kind])}
                            </span>
                            <span
                              className={`${styles.statusBadge} ${styles[`status_${item.status}`]}`}
                            >
                              {t(STATUS_KEY[item.status])}
                            </span>
                            {showMr && item.mrUrl ? (
                              <span className={styles.mrPill}>MR</span>
                            ) : null}
                          </div>
                          <div className={styles.cardTitle}>{item.title}</div>
                          <div className={styles.cardSub}>
                            <span>{item.authorName}</span>
                            <span>•</span>
                            <span>
                              {t('feedback.comments.count', {
                                count: item.comments.length,
                              })}
                            </span>
                          </div>
                        </button>

                        {isOpen ? (
                          <div className={styles.cardBody}>
                            <p className={styles.desc}>{item.description}</p>

                            {/* Seção de MR (visível apenas para master, admin, developer e tester) */}
                            {showMr ? (
                              <div className={styles.mrBox}>
                                <div className={styles.mrLabel}>
                                  🔗 {t('feedback.mr.label')}
                                </div>
                                {item.mrUrl ? (
                                  <a
                                    href={item.mrUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.mrLink}
                                  >
                                    {t('feedback.mr.view')}: {item.mrUrl}
                                  </a>
                                ) : null}
                                {canEditMr ? (
                                  <div className={styles.mrForm}>
                                    <input
                                      type="url"
                                      className={styles.input}
                                      placeholder={t('feedback.mr.placeholder')}
                                      value={mrDraft}
                                      onChange={(e) =>
                                        setMrDrafts((prev) => ({
                                          ...prev,
                                          [item.id]: e.target.value,
                                        }))
                                      }
                                    />
                                    <div className={styles.actionRow}>
                                      <button
                                        type="button"
                                        className={styles.secondaryBtn}
                                        disabled={busy || !mrDraft.trim()}
                                        onClick={() =>
                                          void handleUpdate(item.id, {
                                            mrUrl: mrDraft.trim(),
                                            status: 'in_progress',
                                          })
                                        }
                                      >
                                        {t('feedback.mr.saveProgress')}
                                      </button>
                                      <button
                                        type="button"
                                        className={styles.secondaryBtn}
                                        disabled={busy || !mrDraft.trim()}
                                        onClick={() =>
                                          void handleUpdate(item.id, {
                                            mrUrl: mrDraft.trim(),
                                            status: 'testing',
                                          })
                                        }
                                      >
                                        {t('feedback.mr.saveTesting')}
                                      </button>
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            ) : null}

                            {/* Ações de status por tier */}
                            {canProgress || canResolve ? (
                              <div className={styles.actionRow}>
                                {canProgress &&
                                item.status !== 'in_progress' ? (
                                  <button
                                    type="button"
                                    className={styles.secondaryBtn}
                                    disabled={busy}
                                    onClick={() =>
                                      void handleUpdate(item.id, {
                                        status: 'in_progress',
                                      })
                                    }
                                  >
                                    🛠️ {t('feedback.action.inProgress')}
                                  </button>
                                ) : null}
                                {canProgress && item.status !== 'testing' ? (
                                  <button
                                    type="button"
                                    className={styles.secondaryBtn}
                                    disabled={busy}
                                    onClick={() =>
                                      void handleUpdate(item.id, {
                                        status: 'testing',
                                      })
                                    }
                                  >
                                    🧪 {t('feedback.action.testing')}
                                  </button>
                                ) : null}
                                {canResolve && item.status !== 'done' ? (
                                  <button
                                    type="button"
                                    className={styles.doneBtn}
                                    disabled={busy}
                                    onClick={() =>
                                      void handleUpdate(item.id, {
                                        status: 'done',
                                      })
                                    }
                                  >
                                    ✅ {t('feedback.action.markDone')}
                                  </button>
                                ) : null}
                                {canResolve && item.status !== 'closed' ? (
                                  <button
                                    type="button"
                                    className={styles.closeThreadBtn}
                                    disabled={busy}
                                    onClick={() =>
                                      void handleUpdate(item.id, {
                                        status: 'closed',
                                      })
                                    }
                                  >
                                    🔒 {t('feedback.action.close')}
                                  </button>
                                ) : null}
                                {canResolve &&
                                (item.status === 'done' ||
                                  item.status === 'closed') ? (
                                  <button
                                    type="button"
                                    className={styles.secondaryBtn}
                                    disabled={busy}
                                    onClick={() =>
                                      void handleUpdate(item.id, {
                                        status: 'open',
                                      })
                                    }
                                  >
                                    ↺ {t('feedback.action.reopen')}
                                  </button>
                                ) : null}
                              </div>
                            ) : null}

                            {/* Comentários da thread */}
                            <div className={styles.comments}>
                              {item.comments.map((c) => (
                                <div key={c.id} className={styles.comment}>
                                  <div className={styles.commentHead}>
                                    <strong>{c.authorName}</strong>
                                    <span className={styles.commentTier}>
                                      {ACCOUNT_TIER_LABELS[c.authorTier]}
                                    </span>
                                  </div>
                                  <p className={styles.commentBody}>{c.body}</p>
                                </div>
                              ))}
                              <form
                                className={styles.commentForm}
                                onSubmit={(e) => void handleComment(item.id, e)}
                              >
                                <input
                                  type="text"
                                  className={styles.input}
                                  placeholder={t(
                                    'feedback.comments.placeholder',
                                  )}
                                  value={commentDraft}
                                  maxLength={1000}
                                  onChange={(e) =>
                                    setCommentDrafts((prev) => ({
                                      ...prev,
                                      [item.id]: e.target.value,
                                    }))
                                  }
                                />
                                <button
                                  type="submit"
                                  className={styles.primaryBtn}
                                  disabled={busy || !commentDraft.trim()}
                                >
                                  {t('common.send')}
                                </button>
                              </form>
                            </div>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
