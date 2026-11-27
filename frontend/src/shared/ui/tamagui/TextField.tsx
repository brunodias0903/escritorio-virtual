import { useState, type ReactNode } from 'react';
import { Input, Label, Text, XStack, YStack, type InputProps } from 'tamagui';

type Props = Omit<InputProps, 'onChangeText' | 'size'> & {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  hint?: string;
  error?: string;
  leadingIcon?: ReactNode;
  trailingElement?: ReactNode;
  compact?: boolean;
};

/**
 * Campo de entrada construído com `Input` e `Label` originais do Tamagui.
 */
export function TextField({
  label,
  value,
  onChangeText,
  hint,
  error,
  leadingIcon,
  trailingElement,
  compact = false,
  id,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <YStack gap="$1.5" width="100%">
      {label ? (
        <Label
          htmlFor={id}
          fontFamily="$body"
          fontSize="$3"
          fontWeight="600"
          color="$textSecondary"
          lineHeight="16px"
        >
          {label}
        </Label>
      ) : null}
      <XStack
        alignItems="center"
        gap="$2"
        backgroundColor="$bgInput"
        borderColor={
          error ? '$dangerBorder' : focused ? '$accent' : '$borderSubtle'
        }
        borderWidth={1}
        borderRadius="$md"
        paddingHorizontal="$3"
        minHeight={compact ? 36 : 40}
      >
        {leadingIcon ? (
          <XStack alignItems="center" opacity={0.78} flexShrink={0}>
            {leadingIcon}
          </XStack>
        ) : null}
        <Input
          id={id}
          flex={1}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          backgroundColor="transparent"
          borderWidth={0}
          paddingHorizontal={0}
          paddingVertical={0}
          height={compact ? 34 : 38}
          color="$textPrimary"
          placeholderTextColor="$textPlaceholder"
          fontFamily="$body"
          fontSize={compact ? '$3' : '$4'}
          outlineStyle="none"
          {...rest}
        />
        {trailingElement ? (
          <XStack alignItems="center" flexShrink={0}>
            {trailingElement}
          </XStack>
        ) : null}
      </XStack>
      {error ? (
        <Text fontFamily="$body" fontSize="$2" color="$dangerText" role="alert">
          {error}
        </Text>
      ) : hint ? (
        <Text fontFamily="$body" fontSize="$2" color="$textMuted">
          {hint}
        </Text>
      ) : null}
    </YStack>
  );
}
