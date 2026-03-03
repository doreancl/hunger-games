import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './ui.module.css';

type ButtonVariant = 'default' | 'outline' | 'destructive';
type ButtonSize = 'sm' | 'md';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
};

const variantClassName: Record<ButtonVariant, string> = {
  default: styles.buttonDefault,
  outline: styles.buttonOutline,
  destructive: styles.buttonDestructive
};

const sizeClassName: Record<ButtonSize, string> = {
  sm: styles.buttonSm,
  md: styles.buttonMd
};

export function Button({ children, variant = 'default', size = 'md', className, ...props }: ButtonProps) {
  const classes = [styles.button, variantClassName[variant], sizeClassName[size], className]
    .filter(Boolean)
    .join(' ');

  return (
    <button type="button" className={classes} {...props}>
      {children}
    </button>
  );
}
