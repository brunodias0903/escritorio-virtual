import {
  AlertCircle,
  Armchair,
  BookOpen,
  Bug,
  Check,
  CheckCircle2,
  ChevronDown,
  Compass,
  Copy,
  FlaskConical,
  GitBranch,
  HelpCircle,
  Lightbulb,
  Link2,
  Lock,
  Megaphone,
  MessageSquare,
  Mic,
  Plus,
  RotateCcw,
  Send,
  Smartphone,
  Wrench,
} from 'lucide-react';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  Accordion,
  Button,
  Separator,
  Spinner,
  Tabs,
  Text,
  XStack,
  YStack,
} from 'tamagui';

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
  suggestedFeedbackBranch,
  type FeedbackItem,
  type FeedbackKind,
  type FeedbackStatus,
  type Session,
} from '@/shared/domain';
import { useI18n, type TranslationKey } from '@/shared/i18n';
import {
  ActionButton,
  EmptyState,
  ModalFrame,
  StatusBadge,
  SurfaceCard,
  TextAreaField,
  TextField,
  type StatusBadgeTone,
} from '@/shared/ui/tamagui';

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

const STATUS_TONE: Record<FeedbackStatus, StatusBadgeTone> = {
  open: 'accent',
  in_progress: 'warning',
  testing: 'accent',
  done: 'success',
  closed: 'neutral',
};

const renderKindIcon = (kind: FeedbackKind, size = 13): ReactNode => {
  switch (kind) {
    case 'suggestion':
      return <Lightbulb size={size} aria-hidden={true} />;
    case 'bug':
      return <Bug size={size} aria-hidden={true} />;
    case 'complaint':
      return <Megaphone size={size} aria-hidden={true} />;
    case 'question':
      return <HelpCircle size={size} aria-hidden={true} />;
  }
};

/**
 * Central de Ajuda e Feedback em Tamagui (`Dialog`, `Tabs`, `Accordion`, `Card`) com ícones Lucide.
 */
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

  const [mrDrafts, setMrDrafts] = useState<Record<string, string>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>(
    {},
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyText = (key: string, value: string, message: string) => {
    void navigator.clipboard?.writeText(value);
    setCopiedKey(key);
    onNotify(message);
    window.setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 1800);
  };

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

  const guideItems = [
    {
      icon: <Compass size={18} color="var(--accent-link)" aria-hidden={true} />,
      title: t('help.guide.moveTitle'),
      desc: t('help.guide.moveDesc'),
    },
    {
      icon: (
        <Armchair size={18} color="var(--accent-link)" aria-hidden={true} />
      ),
      title: t('help.guide.desksTitle'),
      desc: t('help.guide.desksDesc'),
    },
    {
      icon: <Mic size={18} color="var(--accent-link)" aria-hidden={true} />,
      title: t('help.guide.callsTitle'),
      desc: t('help.guide.callsDesc'),
    },
    {
      icon: (
        <Smartphone size={18} color="var(--accent-link)" aria-hidden={true} />
      ),
      title: t('help.guide.pwaTitle'),
      desc: t('help.guide.pwaDesc'),
    },
  ];

  return (
    <ModalFrame
      title={t('help.modal.title')}
      subtitle="Tire dúvidas rápidas sobre o escritório ou acompanhe sugestões e melhorias."
      icon={
        <HelpCircle size={18} color="var(--accent-link)" aria-hidden={true} />
      }
      maxWidth={780}
      onClose={onClose}
    >
      <Tabs
        value={tab}
        onValueChange={(val) => setTab(val as Tab)}
        orientation="horizontal"
        flexDirection="column"
        gap="$4"
      >
        <Tabs.List
          backgroundColor="$bgSurface"
          padding="$1"
          borderRadius="$lg"
          borderWidth={1}
          borderColor="$borderSubtle"
          gap="$1"
        >
          <Tabs.Tab value="feedback" asChild flex={1}>
            <Button
              flex={1}
              paddingVertical="$2"
              borderRadius="$md"
              backgroundColor={
                tab === 'feedback' ? '$accentChip' : 'transparent'
              }
              borderWidth={1}
              borderColor={
                tab === 'feedback' ? '$accentBorderSoft' : 'transparent'
              }
              cursor="pointer"
            >
              <XStack alignItems="center" justifyContent="center" gap="$1.5">
                <MessageSquare size={14} aria-hidden={true} />
                <Text
                  fontFamily="$body"
                  fontSize="$3"
                  fontWeight={tab === 'feedback' ? '700' : '500'}
                  color={tab === 'feedback' ? '$textPrimary' : '$textSecondary'}
                >
                  {t('help.tab.feedback')} ({items.length})
                </Text>
              </XStack>
            </Button>
          </Tabs.Tab>

          <Tabs.Tab value="guide" asChild flex={1}>
            <Button
              flex={1}
              paddingVertical="$2"
              borderRadius="$md"
              backgroundColor={tab === 'guide' ? '$accentChip' : 'transparent'}
              borderWidth={1}
              borderColor={
                tab === 'guide' ? '$accentBorderSoft' : 'transparent'
              }
              cursor="pointer"
            >
              <XStack alignItems="center" justifyContent="center" gap="$1.5">
                <BookOpen size={14} aria-hidden={true} />
                <Text
                  fontFamily="$body"
                  fontSize="$3"
                  fontWeight={tab === 'guide' ? '700' : '500'}
                  color={tab === 'guide' ? '$textPrimary' : '$textSecondary'}
                >
                  {t('help.tab.guide')}
                </Text>
              </XStack>
            </Button>
          </Tabs.Tab>
        </Tabs.List>

        {error ? (
          <SurfaceCard
            variant="danger"
            padding="$3"
            flexDirection="row"
            alignItems="center"
            gap="$2"
          >
            <AlertCircle
              size={15}
              color="var(--danger-text)"
              aria-hidden={true}
            />
            <Text fontFamily="$body" fontSize="$3" color="$dangerText" flex={1}>
              {error}
            </Text>
          </SurfaceCard>
        ) : null}

        {tab === 'guide' ? (
          <XStack flexWrap="wrap" gap="$3">
            {guideItems.map((card) => (
              <SurfaceCard
                key={card.title}
                flexBasis="47%"
                flexGrow={1}
                minWidth={260}
                padding="$4"
                gap="$2.5"
              >
                <XStack alignItems="center" gap="$2.5">
                  <YStack
                    width={36}
                    height={36}
                    borderRadius="$md"
                    backgroundColor="$bgControl"
                    borderWidth={1}
                    borderColor="$borderSubtle"
                    alignItems="center"
                    justifyContent="center"
                    flexShrink={0}
                  >
                    {card.icon}
                  </YStack>
                  <Text
                    fontFamily="$heading"
                    fontSize="$4"
                    fontWeight="700"
                    color="$textPrimary"
                    flex={1}
                  >
                    {card.title}
                  </Text>
                </XStack>
                <Text
                  fontFamily="$body"
                  fontSize="$3"
                  color="$textSecondary"
                  lineHeight={19}
                >
                  {card.desc}
                </Text>
              </SurfaceCard>
            ))}
          </XStack>
        ) : (
          <YStack gap="$3.5">
            <XStack
              alignItems="center"
              justifyContent="space-between"
              gap="$2"
              flexWrap="wrap"
            >
              <XStack gap="$1.5" flexWrap="wrap">
                <Button
                  paddingHorizontal="$3"
                  paddingVertical="$1.5"
                  minHeight={30}
                  borderRadius="$pill"
                  backgroundColor={
                    filter === 'all' ? '$accentChip' : '$bgSurface'
                  }
                  borderColor={
                    filter === 'all' ? '$accentBorderSoft' : '$borderSubtle'
                  }
                  borderWidth={1}
                  cursor="pointer"
                  onPress={() => setFilter('all')}
                >
                  <Text
                    fontFamily="$body"
                    fontSize="$2"
                    fontWeight={filter === 'all' ? '700' : '500'}
                    color={filter === 'all' ? '$textPrimary' : '$textSecondary'}
                  >
                    {t('feedback.status.all')}
                  </Text>
                </Button>
                {FEEDBACK_STATUSES.map((st) => {
                  const active = filter === st;
                  return (
                    <Button
                      key={st}
                      paddingHorizontal="$3"
                      paddingVertical="$1.5"
                      minHeight={30}
                      borderRadius="$pill"
                      backgroundColor={active ? '$accentChip' : '$bgSurface'}
                      borderColor={
                        active ? '$accentBorderSoft' : '$borderSubtle'
                      }
                      borderWidth={1}
                      cursor="pointer"
                      onPress={() => setFilter(st)}
                    >
                      <Text
                        fontFamily="$body"
                        fontSize="$2"
                        fontWeight={active ? '700' : '500'}
                        color={active ? '$textPrimary' : '$textSecondary'}
                      >
                        {t(STATUS_KEY[st])}
                      </Text>
                    </Button>
                  );
                })}
              </XStack>

              <ActionButton
                size="sm"
                variant={creating ? 'secondary' : 'primary'}
                icon={
                  creating ? undefined : <Plus size={14} aria-hidden={true} />
                }
                onPress={() => setCreating((v) => !v)}
              >
                {creating ? t('common.cancel') : t('feedback.new')}
              </ActionButton>
            </XStack>

            {creating ? (
              <SurfaceCard variant="elevated" padding="$4" gap="$3">
                <form
                  onSubmit={(e) => void handleCreate(e)}
                  style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                >
                  <XStack gap="$1.5" flexWrap="wrap">
                    {FEEDBACK_KINDS.map((k) => {
                      const active = kind === k;
                      return (
                        <Button
                          key={k}
                          paddingHorizontal="$3"
                          paddingVertical="$1.5"
                          minHeight={32}
                          borderRadius="$pill"
                          backgroundColor={
                            active ? '$accentChip' : '$bgControl'
                          }
                          borderColor={
                            active ? '$accentBorderSoft' : '$borderSubtle'
                          }
                          borderWidth={1}
                          cursor="pointer"
                          onPress={() => setKind(k)}
                        >
                          <XStack alignItems="center" gap="$1.5">
                            {renderKindIcon(k)}
                            <Text
                              fontFamily="$body"
                              fontSize="$2"
                              fontWeight={active ? '700' : '500'}
                              color={active ? '$textPrimary' : '$textSecondary'}
                            >
                              {t(KIND_KEY[k])}
                            </Text>
                          </XStack>
                        </Button>
                      );
                    })}
                  </XStack>

                  <TextField
                    id="feedback-title"
                    compact
                    value={title}
                    onChangeText={setTitle}
                    placeholder={t('feedback.form.titlePlaceholder')}
                    maxLength={120}
                    required
                  />
                  <TextAreaField
                    id="feedback-desc"
                    value={description}
                    onChangeText={setDescription}
                    placeholder={t('feedback.form.descriptionPlaceholder')}
                    maxLength={2000}
                    numberOfLines={3}
                    required
                  />
                  <XStack justifyContent="flex-end">
                    <ActionButton
                      type="submit"
                      size="sm"
                      loading={submitting}
                      icon={<Send size={13} aria-hidden={true} />}
                    >
                      {submitting ? t('common.sending') : t('common.send')}
                    </ActionButton>
                  </XStack>
                </form>
              </SurfaceCard>
            ) : null}

            {loading ? (
              <XStack
                alignItems="center"
                justifyContent="center"
                padding="$6"
                gap="$2"
              >
                <Spinner size="small" color="$accent" />
                <Text fontFamily="$body" fontSize="$3" color="$textMuted">
                  {t('common.loading')}
                </Text>
              </XStack>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={
                  <MessageSquare
                    size={20}
                    color="var(--text-muted)"
                    aria-hidden={true}
                  />
                }
                title={t('feedback.empty')}
                description="Use o botão acima para enviar uma sugestão, relatar um bug ou tirar uma dúvida."
              />
            ) : (
              <Accordion type="single" collapsible gap="$2.5">
                {filtered.map((item) => {
                  const mrDraft = mrDrafts[item.id] ?? item.mrUrl ?? '';
                  const commentDraft = commentDrafts[item.id] ?? '';
                  const busy = busyId === item.id;
                  const ticketTag =
                    item.ticketKey ?? `EV-${item.id.slice(0, 6).toUpperCase()}`;
                  const branchName = suggestedFeedbackBranch(item);

                  return (
                    <Accordion.Item
                      key={item.id}
                      value={item.id}
                      borderRadius="$xl"
                      borderWidth={1}
                      borderColor="$borderSubtle"
                      backgroundColor="$bgSurface"
                      overflow="hidden"
                    >
                      <Accordion.Trigger
                        backgroundColor="transparent"
                        borderWidth={0}
                        padding="$3.5"
                      >
                        {({ open }: { open: boolean }) => (
                          <XStack
                            alignItems="flex-start"
                            justifyContent="space-between"
                            gap="$3"
                            width="100%"
                          >
                            <YStack flex={1} gap="$1.5" alignItems="flex-start">
                              <XStack
                                gap="$1.5"
                                flexWrap="wrap"
                                alignItems="center"
                              >
                                <StatusBadge tone="neutral">
                                  {ticketTag}
                                </StatusBadge>
                                <StatusBadge
                                  tone="neutral"
                                  icon={renderKindIcon(item.kind, 11)}
                                >
                                  {t(KIND_KEY[item.kind])}
                                </StatusBadge>
                                <StatusBadge tone={STATUS_TONE[item.status]}>
                                  {t(STATUS_KEY[item.status])}
                                </StatusBadge>
                                {showMr && item.mrUrl ? (
                                  <StatusBadge
                                    tone="accent"
                                    icon={
                                      <GitBranch size={11} aria-hidden={true} />
                                    }
                                  >
                                    MR
                                  </StatusBadge>
                                ) : null}
                              </XStack>
                              <Text
                                fontFamily="$heading"
                                fontSize="$4"
                                fontWeight="700"
                                color="$textPrimary"
                                textAlign="left"
                              >
                                {item.title}
                              </Text>
                              <Text
                                fontFamily="$body"
                                fontSize="$2"
                                color="$textMuted"
                              >
                                {item.authorName} ·{' '}
                                {t('feedback.comments.count', {
                                  count: item.comments.length,
                                })}
                              </Text>
                            </YStack>
                            <ChevronDown
                              size={16}
                              color="var(--text-muted)"
                              aria-hidden={true}
                              style={{
                                transform: open
                                  ? 'rotate(180deg)'
                                  : 'rotate(0deg)',
                                transition: 'transform 160ms ease',
                                flexShrink: 0,
                                marginTop: 4,
                              }}
                            />
                          </XStack>
                        )}
                      </Accordion.Trigger>

                      <Accordion.Content
                        backgroundColor="$bgSurface"
                        paddingHorizontal="$4"
                        paddingTop={0}
                        paddingBottom="$4"
                      >
                        <YStack gap="$3">
                          <Separator borderColor="$borderSubtle" />

                          <Text
                            fontFamily="$body"
                            fontSize="$3"
                            color="$textBody"
                            lineHeight={20}
                          >
                            {item.description}
                          </Text>

                          {showMr ? (
                            <SurfaceCard
                              variant="elevated"
                              padding="$3"
                              gap="$2.5"
                            >
                              <XStack
                                alignItems="center"
                                gap="$2"
                                flexWrap="wrap"
                              >
                                <GitBranch
                                  size={14}
                                  color="var(--accent-link)"
                                  aria-hidden={true}
                                />
                                <Text
                                  fontFamily="$body"
                                  fontSize="$2"
                                  fontWeight="600"
                                  color="$textSecondary"
                                >
                                  Branch sugerida:
                                </Text>
                                <Text
                                  fontFamily="$mono"
                                  fontSize="$2"
                                  color="$textPrimary"
                                  backgroundColor="$bgControl"
                                  paddingHorizontal="$2"
                                  paddingVertical="$0.5"
                                  borderRadius="$sm"
                                >
                                  {branchName}
                                </Text>
                                <ActionButton
                                  variant="secondary"
                                  size="sm"
                                  icon={
                                    copiedKey === `branch:${item.id}` ? (
                                      <Check size={12} aria-hidden={true} />
                                    ) : (
                                      <Copy size={12} aria-hidden={true} />
                                    )
                                  }
                                  onPress={() =>
                                    copyText(
                                      `branch:${item.id}`,
                                      branchName,
                                      `Branch ${branchName} copiada!`,
                                    )
                                  }
                                >
                                  {copiedKey === `branch:${item.id}`
                                    ? 'Copiado'
                                    : 'Copiar'}
                                </ActionButton>
                              </XStack>

                              <XStack alignItems="center" gap="$1.5">
                                <Link2
                                  size={14}
                                  color="var(--text-muted)"
                                  aria-hidden={true}
                                />
                                <Text
                                  fontFamily="$body"
                                  fontSize="$2"
                                  fontWeight="600"
                                  color="$textSecondary"
                                >
                                  {t('feedback.mr.label')}
                                </Text>
                              </XStack>

                              {item.mrUrl ? (
                                <a
                                  href={item.mrUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    color: 'var(--accent-link)',
                                    fontSize: 12.5,
                                    wordBreak: 'break-all',
                                  }}
                                >
                                  {t('feedback.mr.view')}: {item.mrUrl}
                                </a>
                              ) : null}

                              {canEditMr ? (
                                <YStack gap="$2">
                                  <TextField
                                    id={`mr-url-${item.id}`}
                                    compact
                                    value={mrDraft}
                                    placeholder={t('feedback.mr.placeholder')}
                                    onChangeText={(val) =>
                                      setMrDrafts((prev) => ({
                                        ...prev,
                                        [item.id]: val,
                                      }))
                                    }
                                  />
                                  <XStack gap="$2" flexWrap="wrap">
                                    <ActionButton
                                      variant="secondary"
                                      size="sm"
                                      disabled={busy || !mrDraft.trim()}
                                      onPress={() =>
                                        void handleUpdate(item.id, {
                                          mrUrl: mrDraft.trim(),
                                          status: 'in_progress',
                                        })
                                      }
                                    >
                                      {t('feedback.mr.saveProgress')}
                                    </ActionButton>
                                    <ActionButton
                                      variant="secondary"
                                      size="sm"
                                      disabled={busy || !mrDraft.trim()}
                                      onPress={() =>
                                        void handleUpdate(item.id, {
                                          mrUrl: mrDraft.trim(),
                                          status: 'testing',
                                        })
                                      }
                                    >
                                      {t('feedback.mr.saveTesting')}
                                    </ActionButton>
                                  </XStack>
                                </YStack>
                              ) : null}
                            </SurfaceCard>
                          ) : null}

                          {canProgress || canResolve ? (
                            <XStack gap="$2" flexWrap="wrap">
                              {canProgress && item.status !== 'in_progress' ? (
                                <ActionButton
                                  variant="secondary"
                                  size="sm"
                                  disabled={busy}
                                  icon={<Wrench size={13} aria-hidden={true} />}
                                  onPress={() =>
                                    void handleUpdate(item.id, {
                                      status: 'in_progress',
                                    })
                                  }
                                >
                                  {t('feedback.action.inProgress')}
                                </ActionButton>
                              ) : null}
                              {canProgress && item.status !== 'testing' ? (
                                <ActionButton
                                  variant="secondary"
                                  size="sm"
                                  disabled={busy}
                                  icon={
                                    <FlaskConical
                                      size={13}
                                      aria-hidden={true}
                                    />
                                  }
                                  onPress={() =>
                                    void handleUpdate(item.id, {
                                      status: 'testing',
                                    })
                                  }
                                >
                                  {t('feedback.action.testing')}
                                </ActionButton>
                              ) : null}
                              {canResolve && item.status !== 'done' ? (
                                <ActionButton
                                  size="sm"
                                  disabled={busy}
                                  icon={
                                    <CheckCircle2
                                      size={13}
                                      aria-hidden={true}
                                    />
                                  }
                                  onPress={() =>
                                    void handleUpdate(item.id, {
                                      status: 'done',
                                    })
                                  }
                                >
                                  {t('feedback.action.markDone')}
                                </ActionButton>
                              ) : null}
                              {canResolve && item.status !== 'closed' ? (
                                <ActionButton
                                  variant="danger"
                                  size="sm"
                                  disabled={busy}
                                  icon={<Lock size={13} aria-hidden={true} />}
                                  onPress={() =>
                                    void handleUpdate(item.id, {
                                      status: 'closed',
                                    })
                                  }
                                >
                                  {t('feedback.action.close')}
                                </ActionButton>
                              ) : null}
                              {canResolve &&
                              (item.status === 'done' ||
                                item.status === 'closed') ? (
                                <ActionButton
                                  variant="secondary"
                                  size="sm"
                                  disabled={busy}
                                  icon={
                                    <RotateCcw size={13} aria-hidden={true} />
                                  }
                                  onPress={() =>
                                    void handleUpdate(item.id, {
                                      status: 'open',
                                    })
                                  }
                                >
                                  {t('feedback.action.reopen')}
                                </ActionButton>
                              ) : null}
                            </XStack>
                          ) : null}

                          <Separator borderColor="$borderSubtle" />

                          <YStack gap="$2">
                            {item.comments.map((c) => (
                              <SurfaceCard
                                key={c.id}
                                variant="elevated"
                                padding="$2.5"
                                gap="$1"
                              >
                                <XStack alignItems="center" gap="$2">
                                  <Text
                                    fontFamily="$body"
                                    fontSize="$2"
                                    fontWeight="700"
                                    color="$textPrimary"
                                  >
                                    {c.authorName}
                                  </Text>
                                  <StatusBadge tone="neutral">
                                    {ACCOUNT_TIER_LABELS[c.authorTier]}
                                  </StatusBadge>
                                </XStack>
                                <Text
                                  fontFamily="$body"
                                  fontSize="$3"
                                  color="$textSecondary"
                                >
                                  {c.body}
                                </Text>
                              </SurfaceCard>
                            ))}

                            <form
                              onSubmit={(e) => void handleComment(item.id, e)}
                            >
                              <XStack gap="$2" alignItems="center">
                                <YStack flex={1}>
                                  <TextField
                                    id={`comment-${item.id}`}
                                    compact
                                    value={commentDraft}
                                    maxLength={1000}
                                    placeholder={t(
                                      'feedback.comments.placeholder',
                                    )}
                                    onChangeText={(val) =>
                                      setCommentDrafts((prev) => ({
                                        ...prev,
                                        [item.id]: val,
                                      }))
                                    }
                                  />
                                </YStack>
                                <ActionButton
                                  type="submit"
                                  size="sm"
                                  disabled={busy || !commentDraft.trim()}
                                  icon={<Send size={13} aria-hidden={true} />}
                                >
                                  {t('common.send')}
                                </ActionButton>
                              </XStack>
                            </form>
                          </YStack>
                        </YStack>
                      </Accordion.Content>
                    </Accordion.Item>
                  );
                })}
              </Accordion>
            )}
          </YStack>
        )}
      </Tabs>
    </ModalFrame>
  );
}
