import { useState } from 'react';
import { Label, Text, TextArea, YStack, type TextAreaProps } from 'tamagui';

type Props = Omit<TextAreaProps, 'onChangeText'> & {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  hint?: string;
  error?: string;
};

/**
 * Campo multilinha construído com `TextArea` e `Label` do Tamagui.
 */
export function TextAreaField({
  label,
  value,
  onChangeText,
  hint,
  error,
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
      <TextArea
        id={id}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        backgroundColor="$bgInput"
        borderColor={
          error ? '$dangerBorder' : focused ? '$accent' : '$borderSubtle'
        }
        borderWidth={1}
        borderRadius="$md"
        paddingHorizontal="$3"
        paddingVertical="$2.5"
        minHeight={76}
        color="$textPrimary"
        placeholderTextColor="$textPlaceholder"
        fontFamily="$body"
        fontSize="$4"
        outlineStyle="none"
        {...rest}
      />
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
