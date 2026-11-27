import type { ReactNode } from 'react';
import {
  Button,
  ScrollView,
  Separator,
  Tabs,
  Text,
  XStack,
  YStack,
  useMedia,
} from 'tamagui';

export type SettingsNavItem<T extends string = string> = {
  id: T;
  label: string;
  icon: ReactNode;
  badge?: string | number;
};

type Props<T extends string> = {
  activeTab: T;
  onTabChange: (tab: T) => void;
  items: readonly SettingsNavItem<T>[];
  sidebarHeader?: ReactNode;
  sidebarFooter?: ReactNode;
  banner?: ReactNode;
  children: ReactNode;
  minHeight?: number;
};

/**
 * Layout responsivo de configurações com navegação lateral usando `Tabs` do Tamagui.
 * No desktop exibe coluna esquerda dedicada; no mobile adapta para barra horizontal rolável.
 */
export function SettingsShell<T extends string>({
  activeTab,
  onTabChange,
  items,
  sidebarHeader,
  sidebarFooter,
  banner,
  children,
  minHeight = 460,
}: Props<T>) {
  const media = useMedia();
  const isMobile = Boolean((media as Record<string, boolean>).mobile);

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => onTabChange(value as T)}
      orientation={isMobile ? 'horizontal' : 'vertical'}
      flexDirection={isMobile ? 'column' : 'row'}
      flex={1}
      minHeight={isMobile ? 360 : minHeight}
      overflow="hidden"
    >
      <YStack
        width={isMobile ? '100%' : 228}
        flexShrink={0}
        backgroundColor="$bgSurface"
        borderRightWidth={isMobile ? 0 : 1}
        borderBottomWidth={isMobile ? 1 : 0}
        borderColor="$borderSubtle"
        padding={isMobile ? '$2.5' : '$3'}
        gap="$2.5"
      >
        {sidebarHeader && !isMobile ? (
          <>
            {sidebarHeader}
            <Separator borderColor="$borderSubtle" />
          </>
        ) : null}

        <Tabs.List
          flexDirection={isMobile ? 'row' : 'column'}
          gap="$1"
          flex={isMobile ? 0 : 1}
          backgroundColor="transparent"
          overflow={isMobile ? 'scroll' : 'visible'}
        >
          {items.map((item) => {
            const active = item.id === activeTab;
            return (
              <Tabs.Tab key={item.id} value={item.id} asChild flexShrink={0}>
                <Button
                  display="flex"
                  flexDirection="row"
                  alignItems="center"
                  justifyContent="space-between"
                  gap="$2.5"
                  paddingHorizontal="$3"
                  paddingVertical={isMobile ? '$2' : '$2.5'}
                  borderRadius="$lg"
                  backgroundColor={active ? '$accentChip' : 'transparent'}
                  borderWidth={1}
                  borderColor={active ? '$accentBorderSoft' : 'transparent'}
                  cursor="pointer"
                  width={isMobile ? 'auto' : '100%'}
                >
                  <XStack alignItems="center" gap="$2.5" minWidth={0}>
                    <XStack
                      alignItems="center"
                      opacity={active ? 1 : 0.78}
                      flexShrink={0}
                    >
                      {item.icon}
                    </XStack>
                    <Text
                      fontFamily="$body"
                      fontSize="$3"
                      fontWeight={active ? '700' : '500'}
                      color={active ? '$textPrimary' : '$textSecondary'}
                      whiteSpace="nowrap"
                    >
                      {item.label}
                    </Text>
                  </XStack>
                  {item.badge !== undefined && item.badge !== '' ? (
                    <YStack
                      paddingHorizontal="$1.5"
                      paddingVertical={2}
                      borderRadius="$pill"
                      backgroundColor={active ? '$accent' : '$bgControl'}
                      minWidth={20}
                      alignItems="center"
                    >
                      <Text
                        fontFamily="$body"
                        fontSize="$1"
                        fontWeight="700"
                        color={active ? '#ffffff' : '$textMuted'}
                      >
                        {item.badge}
                      </Text>
                    </YStack>
                  ) : null}
                </Button>
              </Tabs.Tab>
            );
          })}
        </Tabs.List>

        {sidebarFooter ? (
          <>
            {!isMobile ? <Separator borderColor="$borderSubtle" /> : null}
            <YStack>{sidebarFooter}</YStack>
          </>
        ) : null}
      </YStack>

      <ScrollView
        flex={1}
        minHeight={0}
        backgroundColor="$bgSurfaceElevated"
        contentContainerStyle={{
          padding: isMobile ? 16 : 24,
          gap: 16,
        }}
      >
        {banner ? <YStack>{banner}</YStack> : null}
        {children}
      </ScrollView>
    </Tabs>
  );
}
