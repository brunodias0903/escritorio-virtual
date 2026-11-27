import { useState, type ReactNode } from 'react';
import { Input, Label, Text, XStack, YStack, type InputProps } from 'tamagui';

type Props = Omit<InputProps, 'onChangeText'> & {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  hint?: string;
  error?: string;
  leadingIcon?: ReactNode;
};

/**
 * Campo de entrada usando `Input` e `Label` originais do Tamagui.
 */
export function TextField({
  label,
  value,
  onChangeText,
  hint,
  error,
  leadingIcon,
  id,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <YStack gap="$1.5" width="100%">
      <Label
        htmlFor={id}
        fontFamily="$body"
        fontSize="$3"
        fontWeight="600"
        color="$textSecondary"
      >
        {label}
      </Label>
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
        minHeight={42}
      >
        {leadingIcon ? (
          <XStack alignItems="center" opacity={0.8}>
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
          color="$textPrimary"
          placeholderTextColor="$textPlaceholder"
          fontFamily="$body"
          fontSize="$4"
          outlineStyle="none"
          {...rest}
        />
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
