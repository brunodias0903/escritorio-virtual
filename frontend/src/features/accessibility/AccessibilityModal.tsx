import { useState } from 'react';
import { Button, Switch, Text, XStack, YStack } from 'tamagui';

import {
  ACCESSIBILITY_NEEDS,
  ACCESSIBILITY_NEED_LABELS,
  COLORBLIND_MODES,
  type AccessibilityNeed,
  type AccessibilityPrefs,
  type ColorblindMode,
} from '@/shared/domain';
import { ActionButton, ModalFrame, SurfaceCard } from '@/shared/ui/tamagui';

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

function ToggleRow({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
}) {
  return (
    <XStack
      alignItems="center"
      justifyContent="space-between"
      gap="$3"
      padding="$3"
      borderRadius="$lg"
      backgroundColor="$bgSurface"
      borderColor="$borderSubtle"
      borderWidth={1}
    >
      <YStack flex={1} gap="$0.5">
        <Text
          fontFamily="$body"
          fontSize="$4"
          fontWeight="600"
          color="$textPrimary"
        >
          {title}
        </Text>
        <Text fontFamily="$body" fontSize="$2" color="$textMuted">
          {description}
        </Text>
      </YStack>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        backgroundColor={checked ? '$accent' : '$bgControl'}
        borderColor="$borderSubtle"
        borderWidth={1}
        width={44}
        height={24}
        padding={2}
      >
        <Switch.Thumb
          backgroundColor="#ffffff"
          width={18}
          height={18}
          borderRadius="$pill"
        />
      </Switch>
    </XStack>
  );
}

/**
 * Painel de Acessibilidade (WCAG / LBI) construído com Tamagui:
 * permite ativar recursos em tempo real e registrar necessidades privadas (LGPD Art. 11).
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
      maxWidth={600}
      onClose={onClose}
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

          <ToggleRow
            title="Alto contraste e foco reforçado"
            description="Aumenta o contraste de bordas, textos e navegação por teclado."
            checked={prefs.highContrast}
            onCheckedChange={(highContrast) => setPrefs({ highContrast })}
          />
          <ToggleRow
            title="Reduzir animações e movimento"
            description="Desativa transições, pulsações e giro 3D (conforto sensorial)."
            checked={prefs.reducedMotion}
            onCheckedChange={(reducedMotion) => setPrefs({ reducedMotion })}
          />
          <ToggleRow
            title="Texto ampliado"
            description="Aumenta o tamanho base dos textos em toda a interface."
            checked={prefs.largeText}
            onCheckedChange={(largeText) => setPrefs({ largeText })}
          />
          <ToggleRow
            title="Leitura facilitada (dislexia / TDAH)"
            description="Amplia espaçamento entre letras, palavras e linhas."
            checked={prefs.dyslexiaFont}
            onCheckedChange={(dyslexiaFont) => setPrefs({ dyslexiaFont })}
          />
          <ToggleRow
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
                    type="button"
                    aria-pressed={active}
                    paddingHorizontal="$3"
                    paddingVertical="$2"
                    borderRadius="$lg"
                    backgroundColor={active ? '$accent' : '$bgControl'}
                    borderColor={active ? '$accent' : '$borderSubtle'}
                    borderWidth={1}
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

        <SurfaceCard gap="$2.5">
          <Text
            fontFamily="$heading"
            fontSize="$4"
            fontWeight="700"
            color="$textPrimary"
          >
            Necessidades de acessibilidade (opcional e privado)
          </Text>
          <Text fontFamily="$body" fontSize="$2" color="$textMuted">
            🔒 Informação estritamente privada (LGPD Art. 11) — nunca exibida
            publicamente a outros usuários. Serve apenas para sugerir os
            melhores recursos para você.
          </Text>
          <XStack flexWrap="wrap" gap="$2">
            {ACCESSIBILITY_NEEDS.map((need) => {
              const active = needs.includes(need);
              return (
                <Button
                  key={need}
                  type="button"
                  aria-pressed={active}
                  paddingHorizontal="$3"
                  paddingVertical="$2"
                  borderRadius="$pill"
                  backgroundColor={active ? '$accentChip' : '$bgControl'}
                  borderColor={active ? '$accent' : '$borderSubtle'}
                  borderWidth={1}
                  onPress={() => toggleNeed(need)}
                >
                  <Text
                    fontFamily="$body"
                    fontSize="$2"
                    fontWeight="600"
                    color={active ? '#ffffff' : '$textSecondary'}
                  >
                    {active ? '✓ ' : ''}
                    {ACCESSIBILITY_NEED_LABELS[need]}
                  </Text>
                </Button>
              );
            })}
          </XStack>
          {needs.length > 0 ? (
            <ActionButton variant="secondary" onPress={applyRecommended}>
              ✨ Ativar recursos recomendados para minhas seleções
            </ActionButton>
          ) : null}
        </SurfaceCard>

        <XStack
          justifyContent="space-between"
          alignItems="center"
          paddingTop="$2"
          borderTopWidth={1}
          borderTopColor="$borderSubtle"
        >
          <ActionButton
            variant="ghost"
            onPress={() => {
              reset();
              setNeeds([]);
            }}
          >
            Restaurar padrão
          </ActionButton>
          <ActionButton loading={saving} onPress={() => void handleSave()}>
            {saving ? 'Salvando…' : 'Salvar na conta'}
          </ActionButton>
        </XStack>
      </YStack>
    </ModalFrame>
  );
}
