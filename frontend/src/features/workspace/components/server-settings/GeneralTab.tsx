import { Globe, Save, Trash2, Upload } from 'lucide-react';
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Separator, Text, XStack, YStack } from 'tamagui';

import { workspaceApi } from '@/app/api';
import { useServerStore } from '@/features/workspace/model/serverStore';
import { errorMessage, type Session } from '@/shared/domain';
import { useI18n } from '@/shared/i18n';
import { compressProfilePhoto } from '@/shared/lib/photo';
import {
  ActionButton,
  SettingSwitchRow,
  SurfaceCard,
  TextAreaField,
  TextField,
} from '@/shared/ui/tamagui';

type Props = {
  session: Session;
  activeServerId: string;
  onClose: () => void;
  onError: (msg: string) => void;
  onNotify: (msg: string) => void;
};

export function GeneralTab({
  session,
  activeServerId,
  onClose,
  onError,
  onNotify,
}: Props) {
  const { t } = useI18n();
  const settings = useServerStore((s) => s.settings);
  const setSettings = useServerStore((s) => s.setSettings);
  const updateServer = useServerStore((s) => s.updateServer);

  const [name, setName] = useState(settings.name);
  const [description, setDescription] = useState(settings.description);
  const [welcomeMessage, setWelcomeMessage] = useState(settings.welcomeMessage);
  const [allowPublicRegistration, setAllowPublicRegistration] = useState(
    settings.allowPublicRegistration,
  );
  const [icon, setIcon] = useState<string | null>(settings.icon);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleIconPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onError('');
    try {
      const dataUrl = await compressProfilePhoto(file);
      setIcon(dataUrl);
    } catch {
      onError('Não foi possível processar esta imagem.');
    }
    e.target.value = '';
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    onError('');
    const res = await workspaceApi.updateServerSettings(
      session.token,
      {
        name: name.trim() || 'Setter',
        description: description.trim(),
        icon,
        welcomeMessage: welcomeMessage.trim(),
        allowPublicRegistration,
      },
      activeServerId,
    );
    setSaving(false);
    if (!res.ok) {
      onError(errorMessage(res.error));
      return;
    }
    setSettings(res.data);
    updateServer(activeServerId, {
      name: res.data.name,
      description: res.data.description,
    });
    onNotify(t('server.saved'));
  };

  return (
    <form onSubmit={(e) => void handleSave(e)}>
      <YStack gap="$4">
        <YStack gap="$1">
          <Text
            fontFamily="$heading"
            fontSize="$6"
            fontWeight="700"
            color="$textPrimary"
          >
            {t('server.tab.general')}
          </Text>
          <Text fontFamily="$body" fontSize="$3" color="$textMuted">
            Personalize a identidade visual, mensagem de boas-vindas e política
            de cadastro do servidor.
          </Text>
        </YStack>

        <SurfaceCard padding="$4" gap="$3">
          <XStack alignItems="center" gap="$4" flexWrap="wrap">
            <YStack
              width={64}
              height={64}
              borderRadius="$2xl"
              overflow="hidden"
              alignItems="center"
              justifyContent="center"
              borderWidth={1}
              borderColor="$accentBorderSoft"
              flexShrink={0}
              style={{
                background: 'var(--server-gradient)',
              }}
            >
              {icon ? (
                <img
                  src={icon}
                  alt={name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <Text
                  fontFamily="$heading"
                  fontSize="$8"
                  fontWeight="800"
                  color="#ffffff"
                >
                  {(name.trim()[0] ?? 'S').toUpperCase()}
                </Text>
              )}
            </YStack>

            <YStack flex={1} gap="$2" minWidth={200}>
              <YStack gap="$0.5">
                <Text
                  fontFamily="$heading"
                  fontSize="$4"
                  fontWeight="700"
                  color="$textPrimary"
                >
                  {t('server.icon')}
                </Text>
                <Text fontFamily="$body" fontSize="$2" color="$textMuted">
                  {t('server.iconHint')}
                </Text>
              </YStack>

              <XStack gap="$2" flexWrap="wrap">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  hidden
                  onChange={(e) => void handleIconPick(e)}
                />
                <ActionButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon={<Upload size={13} aria-hidden={true} />}
                  onPress={() => fileRef.current?.click()}
                >
                  {t('server.uploadIcon')}
                </ActionButton>
                {icon ? (
                  <ActionButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon={<Trash2 size={13} aria-hidden={true} />}
                    onPress={() => setIcon(null)}
                  >
                    {t('server.removeIcon')}
                  </ActionButton>
                ) : null}
              </XStack>
            </YStack>
          </XStack>
        </SurfaceCard>

        <YStack gap="$3">
          <TextField
            id="server-general-name"
            label={t('server.name')}
            value={name}
            onChangeText={setName}
            maxLength={40}
            required
          />

          <TextAreaField
            id="server-general-description"
            label={t('server.description')}
            value={description}
            onChangeText={setDescription}
            maxLength={240}
            numberOfLines={3}
            placeholder="Descreva o propósito deste espaço de trabalho"
          />

          <TextField
            id="server-general-welcome"
            label={t('server.welcomeMessage')}
            value={welcomeMessage}
            onChangeText={setWelcomeMessage}
            maxLength={280}
            placeholder="Mensagem exibida para novos membros"
          />
        </YStack>

        <SettingSwitchRow
          icon={
            <Globe size={16} color="var(--accent-link)" aria-hidden={true} />
          }
          title={t('server.allowPublicRegistration')}
          description="Quando desativado, apenas pessoas convidadas por e-mail ou código podem criar conta."
          checked={allowPublicRegistration}
          onCheckedChange={setAllowPublicRegistration}
        />

        <Separator borderColor="$borderSubtle" />

        <XStack justifyContent="flex-end" gap="$2.5">
          <ActionButton type="button" variant="secondary" onPress={onClose}>
            {t('common.cancel')}
          </ActionButton>
          <ActionButton
            type="submit"
            loading={saving}
            icon={<Save size={15} aria-hidden={true} />}
          >
            {saving ? t('common.saving') : t('common.save')}
          </ActionButton>
        </XStack>
      </YStack>
    </form>
  );
}
