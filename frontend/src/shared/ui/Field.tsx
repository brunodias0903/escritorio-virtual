import { useId, useState, type ReactNode } from 'react';

import styles from './Field.module.css';
import { Icon } from './Icon';

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'password';
  multiline?: boolean;
  autoComplete?: string;
  maxLength?: number;
  placeholder?: string;
  fullWidth?: boolean;
  variant?: 'default' | 'auth';
  leadingIcon?: ReactNode;
  hint?: string;
  hintTitle?: string;
};

/** Campo com rótulo. Campo de senha ganha o botão de olho para mostrar ou esconder. */
export function Field({
  label,
  value,
  onChange,
  type = 'text',
  multiline = false,
  autoComplete,
  maxLength,
  placeholder,
  fullWidth = false,
  variant = 'default',
  leadingIcon,
  hint,
  hintTitle,
}: Props) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (visible ? 'text' : 'password') : type;
  const inputClasses = [
    styles.input,
    variant === 'auth' ? styles.authInput : '',
    leadingIcon && !multiline ? styles.withLeading : '',
    isPassword ? styles.withEye : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={`${styles.container} ${fullWidth ? styles.fullWidth : ''}`}>
      <label
        htmlFor={id}
        className={`${styles.label} ${variant === 'auth' ? styles.authLabel : ''}`}
      >
        {label}
      </label>
      <div className={styles.box}>
        {leadingIcon && !multiline ? (
          <span className={styles.leading} aria-hidden="true">
            {leadingIcon}
          </span>
        ) : null}
        {multiline ? (
          <textarea
            id={id}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            maxLength={maxLength}
            placeholder={placeholder}
            className={`${styles.input} ${styles.multiline}`}
          />
        ) : (
          <input
            id={id}
            type={inputType}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            autoComplete={autoComplete}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={maxLength}
            placeholder={placeholder}
            className={inputClasses}
          />
        )}
        {isPassword ? (
          <button
            type="button"
            aria-label={visible ? 'Esconder a senha' : 'Mostrar a senha'}
            onClick={() => setVisible((prev) => !prev)}
            className={styles.eye}
          >
            <Icon name={visible ? 'eyeOff' : 'eye'} size={18} color="#b8b5d6" />
          </button>
        ) : null}
      </div>
      {hint ? (
        <span className={styles.hint} title={hintTitle}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}
