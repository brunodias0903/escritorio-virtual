import styles from './Button.module.css';

type Props = {
  title: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'link' | 'gradient';
  disabled?: boolean;
  type?: 'button' | 'submit';
  fullWidth?: boolean;
};

export function Button({
  title,
  onClick,
  variant = 'primary',
  disabled = false,
  type = 'button',
  fullWidth = false,
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${styles.base} ${styles[variant]} ${fullWidth ? styles.fullWidth : ''}`}
    >
      {title}
    </button>
  );
}
