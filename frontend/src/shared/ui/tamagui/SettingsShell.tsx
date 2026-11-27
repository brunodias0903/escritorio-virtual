import type { ReactNode } from 'react';
import { Tabs, Text, XStack, YStack, useMedia } from 'tamagui';

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
      width="100%"
      height="100%"
      minHeight={0}
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
          <YStack
            paddingBottom="$2.5"
            borderBottomWidth={1}
            borderBottomColor="$borderSubtle"
          >
            {sidebarHeader}
          </YStack>
        ) : null}

        <Tabs.List
          flexDirection={isMobile ? 'row' : 'column'}
          gap="$1"
          flexGrow={isMobile ? 0 : 1}
          flexShrink={1}
          flexBasis="auto"
          backgroundColor="transparent"
          style={{
            overflowX: isMobile ? 'auto' : 'visible',
            overflowY: isMobile ? 'hidden' : 'auto',
          }}
        >
          {items.map((item) => {
            const active = item.id === activeTab;
            return (
              <Tabs.Tab
                key={item.id}
                value={item.id}
                flexShrink={0}
                width={isMobile ? 'auto' : '100%'}
                paddingHorizontal="$3"
                paddingVertical={isMobile ? '$2' : '$2.5'}
                borderRadius="$lg"
                backgroundColor={active ? '$accentChip' : 'transparent'}
                borderWidth={1}
                borderColor={active ? '$accentBorderSoft' : 'transparent'}
                justifyContent="space-between"
                alignItems="center"
                cursor="pointer"
              >
                <XStack
                  alignItems="center"
                  justifyContent="space-between"
                  width="100%"
                  gap="$2"
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
                </XStack>
              </Tabs.Tab>
            );
          })}
        </Tabs.List>

        {sidebarFooter ? (
          <YStack
            paddingTop={isMobile ? 0 : '$2.5'}
            borderTopWidth={isMobile ? 0 : 1}
            borderTopColor="$borderSubtle"
          >
            {sidebarFooter}
          </YStack>
        ) : null}
      </YStack>

      <YStack
        flex={1}
        minHeight={0}
        minWidth={0}
        backgroundColor="$bgSurfaceElevated"
        padding={isMobile ? '$4' : '$5'}
        gap="$4"
        style={{
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {banner ? <YStack flexShrink={0}>{banner}</YStack> : null}
        {children}
      </YStack>
    </Tabs>
  );
}
