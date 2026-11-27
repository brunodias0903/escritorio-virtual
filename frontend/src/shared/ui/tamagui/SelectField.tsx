import { Check, ChevronDown } from 'lucide-react';
import { Label, Select, Text, XStack, YStack } from 'tamagui';

export type SelectOption = {
  value: string;
  label: string;
};

type Props = {
  id?: string;
  label?: string;
  ariaLabel?: string;
  value: string;
  options: readonly SelectOption[];
  placeholder?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  compact?: boolean;
};

const EMPTY_SENTINEL = '__voffice_empty__';
const encode = (val: string) => (val === '' ? EMPTY_SENTINEL : val);
const decode = (val: string) => (val === EMPTY_SENTINEL ? '' : val);

/**
 * Seletor dropdown nativo do Tamagui (`Select`) com ícones Lucide,
 * substituindo `<select>` nativos do navegador em toda a aplicação.
 */
export function SelectField({
  id,
  label,
  ariaLabel,
  value,
  options,
  placeholder,
  onValueChange,
  disabled = false,
  compact = false,
}: Props) {
  const currentOption = options.find((opt) => opt.value === value);

  return (
    <YStack gap="$1.5" width="100%">
      {label ? (
        <Label
          htmlFor={id}
          fontFamily="$body"
          fontSize="$3"
          fontWeight="600"
          color="$textSecondary"
          lineHeight={16}
        >
          {label}
        </Label>
      ) : null}

      <Select
        id={id}
        value={encode(value)}
        onValueChange={(next) => onValueChange(decode(next))}
      >
        <Select.Trigger
          disabled={disabled}
          aria-label={ariaLabel ?? label}
          width="100%"
          minHeight={compact ? 36 : 40}
          paddingHorizontal="$3"
          backgroundColor="$bgInput"
          borderColor="$borderSubtle"
          borderWidth={1}
          borderRadius="$md"
          justifyContent="space-between"
          alignItems="center"
          cursor={disabled ? 'not-allowed' : 'pointer'}
          opacity={disabled ? 0.55 : 1}
        >
          <Select.Value placeholder={placeholder}>
            <Text
              fontFamily="$body"
              fontSize={compact ? '$3' : '$4'}
              color={currentOption ? '$textPrimary' : '$textPlaceholder'}
              numberOfLines={1}
            >
              {currentOption?.label ?? placeholder ?? ''}
            </Text>
          </Select.Value>
          <Select.Icon>
            <ChevronDown
              size={15}
              color="var(--text-muted)"
              aria-hidden={true}
            />
          </Select.Icon>
        </Select.Trigger>

        <Select.Content>
          <Select.Viewport
            zIndex={2500}
            minWidth={200}
            backgroundColor="$bgSurfaceElevated"
            borderColor="$borderBar"
            borderWidth={1}
            borderRadius="$lg"
            padding="$1.5"
            style={{
              boxShadow: '0 16px 40px rgba(2, 4, 16, 0.65)',
            }}
          >
            <Select.Group>
              {options.map((opt) => {
                const selected = opt.value === value;
                return (
                  <Select.Item
                    key={encode(opt.value)}
                    value={encode(opt.value)}
                    paddingHorizontal="$3"
                    paddingVertical="$2"
                    borderRadius="$md"
                    backgroundColor={selected ? '$accentChip' : 'transparent'}
                    cursor="pointer"
                  >
                    <XStack
                      alignItems="center"
                      justifyContent="space-between"
                      width="100%"
                      gap="$2"
                    >
                      <Select.ItemText
                        fontFamily="$body"
                        fontSize="$3"
                        fontWeight={selected ? '600' : '500'}
                        color="$textPrimary"
                      >
                        {opt.label}
                      </Select.ItemText>
                      <Select.ItemIndicator marginLeft="auto">
                        <Check
                          size={14}
                          color="var(--accent-link)"
                          aria-hidden={true}
                        />
                      </Select.ItemIndicator>
                    </XStack>
                  </Select.Item>
                );
              })}
            </Select.Group>
          </Select.Viewport>
        </Select.Content>
      </Select>
    </YStack>
  );
}
