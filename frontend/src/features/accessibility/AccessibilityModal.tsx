import { Accessibility, Check, Lock, RotateCcw, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Button, Separator, Text, XStack, YStack } from 'tamagui';

import {
  ACCESSIBILITY_NEEDS,
  ACCESSIBILITY_NEED_LABELS,
  COLORBLIND_MODES,
  type AccessibilityNeed,
  type AccessibilityPrefs,
  type ColorblindMode,
} from '@/shared/domain';
import {
  ActionButton,
  ModalFrame,
  SettingSwitchRow,
  SurfaceCard,
} from '@/shared/ui/tamagui';

import {
  recommendedPrefsForNeeds,
  useAccessibilityStore,
} from './accessibilityStore';

const COLORBLIND_LABELS: Record<ColorblindMode, string> = {
  none: 'Desativado',
  protanopia: 'Protanopia (vermelho)',
  deuteranopia: 'Deuteranopia (verde)',
  tritanopia: 'Tritanopia (azul)',
};

type Props = {
  initialNeeds: AccessibilityNeed[];
  onSave: (
    needs: AccessibilityNeed[],
    prefs: AccessibilityPrefs,
  ) => Promise<void>;
  onClose: () => void;
};

/**
 * Painel de Acessibilidade (WCAG / LBI) construído com Tamagui e ícones Lucide.
 */
export function AccessibilityModal({ initialNeeds, onSave, onClose }: Props) {
  const prefs = useAccessibilityStore((s) => s.prefs);
  const setPrefs = useAccessibilityStore((s) => s.setPrefs);
  const reset = useAccessibilityStore((s) => s.reset);
  const [needs, setNeeds] = useState<AccessibilityNeed[]>(initialNeeds);
  const [saving, setSaving] = useState(false);

  const toggleNeed = (need: AccessibilityNeed) => {
    setNeeds((prev) =>
      prev.includes(need) ? prev.filter((n) => n !== need) : [...prev, need],
    );
  };

  const applyRecommended = () => {
    const rec = recommendedPrefsForNeeds(needs, prefs);
    setPrefs(rec);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(needs, useAccessibilityStore.getState().prefs);
    setSaving(false);
    onClose();
  };

  return (
    <ModalFrame
      title="Acessibilidade"
      subtitle="Ajuste a interface em tempo real para o seu conforto visual, auditivo, motor e cognitivo."
      icon={
        <Accessibility
          size={18}
          color="var(--accent-link)"
          aria-hidden={true}
        />
      }
      maxWidth={620}
      zIndex={1350}
      onClose={onClose}
      footer={
        <XStack
          justifyContent="space-between"
          alignItems="center"
          width="100%"
          gap="$3"
        >
          <ActionButton
            variant="ghost"
            size="sm"
            icon={<RotateCcw size={14} aria-hidden={true} />}
            onPress={() => {
              reset();
              setNeeds([]);
            }}
          >
            Restaurar padrão
          </ActionButton>
          <ActionButton
            size="sm"
            loading={saving}
            onPress={() => void handleSave()}
          >
            {saving ? 'Salvando…' : 'Salvar na conta'}
          </ActionButton>
        </XStack>
      }
    >
      <YStack gap="$4">
        <YStack gap="$2">
          <Text
            fontFamily="$heading"
            fontSize="$4"
            fontWeight="700"
            color="$textPrimary"
          >
            Recursos ativos na tela
          </Text>

          <SettingSwitchRow
            title="Alto contraste e foco reforçado"
            description="Aumenta o contraste de bordas, textos e navegação por teclado."
            checked={prefs.highContrast}
            onCheckedChange={(highContrast) => setPrefs({ highContrast })}
          />
          <SettingSwitchRow
            title="Reduzir animações e movimento"
            description="Desativa transições, pulsações e giro 3D (conforto sensorial)."
            checked={prefs.reducedMotion}
            onCheckedChange={(reducedMotion) => setPrefs({ reducedMotion })}
          />
          <SettingSwitchRow
            title="Texto ampliado"
            description="Aumenta o tamanho base dos textos em toda a interface."
            checked={prefs.largeText}
            onCheckedChange={(largeText) => setPrefs({ largeText })}
          />
          <SettingSwitchRow
            title="Leitura facilitada (dislexia / TDAH)"
            description="Amplia espaçamento entre letras, palavras e linhas."
            checked={prefs.dyslexiaFont}
            onCheckedChange={(dyslexiaFont) => setPrefs({ dyslexiaFont })}
          />
          <SettingSwitchRow
            title="Alertas visuais para mensagens e menções"
            description="Exibe avisos visuais destacados além de notificações sonoras."
            checked={prefs.visualAlerts}
            onCheckedChange={(visualAlerts) => setPrefs({ visualAlerts })}
          />

          <YStack gap="$2" marginTop="$1">
            <Text
              fontFamily="$body"
              fontSize="$3"
              fontWeight="600"
              color="$textSecondary"
            >
              Filtro para daltonismo
            </Text>
            <XStack flexWrap="wrap" gap="$2">
              {COLORBLIND_MODES.map((mode) => {
                const active = prefs.colorblindMode === mode;
                return (
                  <Button
                    key={mode}
                    aria-pressed={active}
                    paddingHorizontal="$3"
                    paddingVertical="$2"
                    borderRadius="$lg"
                    backgroundColor={active ? '$accent' : '$bgControl'}
                    borderColor={active ? '$accent' : '$borderSubtle'}
                    borderWidth={1}
                    cursor="pointer"
                    onPress={() => setPrefs({ colorblindMode: mode })}
                  >
                    <Text
                      fontFamily="$body"
                      fontSize="$2"
                      fontWeight="600"
                      color={active ? '#ffffff' : '$textSecondary'}
                    >
                      {COLORBLIND_LABELS[mode]}
                    </Text>
                  </Button>
                );
              })}
            </XStack>
          </YStack>
        </YStack>

        <Separator borderColor="$borderSubtle" />

        <SurfaceCard gap="$2.5">
          <Text
            fontFamily="$heading"
            fontSize="$4"
            fontWeight="700"
            color="$textPrimary"
          >
            Necessidades de acessibilidade (opcional e privado)
          </Text>
          <XStack alignItems="flex-start" gap="$2">
            <Lock
              size={14}
              color="var(--text-muted)"
              aria-hidden={true}
              style={{ marginTop: 2, flexShrink: 0 }}
            />
            <Text fontFamily="$body" fontSize="$2" color="$textMuted" flex={1}>
              Informação estritamente privada (LGPD Art. 11) — nunca exibida
              publicamente a outros usuários. Serve apenas para sugerir os
              melhores recursos para você.
            </Text>
          </XStack>
          <XStack flexWrap="wrap" gap="$2">
            {ACCESSIBILITY_NEEDS.map((need) => {
              const active = needs.includes(need);
              return (
                <Button
                  key={need}
                  aria-pressed={active}
                  paddingHorizontal="$3"
                  paddingVertical="$2"
                  borderRadius="$pill"
                  backgroundColor={active ? '$accentChip' : '$bgControl'}
                  borderColor={active ? '$accent' : '$borderSubtle'}
                  borderWidth={1}
                  cursor="pointer"
                  onPress={() => toggleNeed(need)}
                >
                  <XStack alignItems="center" gap="$1.5">
                    {active ? (
                      <Check size={12} color="#ffffff" aria-hidden={true} />
                    ) : null}
                    <Text
                      fontFamily="$body"
                      fontSize="$2"
                      fontWeight="600"
                      color={active ? '#ffffff' : '$textSecondary'}
                    >
                      {ACCESSIBILITY_NEED_LABELS[need]}
                    </Text>
                  </XStack>
                </Button>
              );
            })}
          </XStack>
          {needs.length > 0 ? (
            <ActionButton
              variant="secondary"
              size="sm"
              icon={<Sparkles size={14} aria-hidden={true} />}
              onPress={applyRecommended}
            >
              Ativar recursos recomendados para minhas seleções
            </ActionButton>
          ) : null}
        </SurfaceCard>
      </YStack>
    </ModalFrame>
  );
}
