import type { ButtonHTMLAttributes } from 'react';
import styles from './primitives.module.css';
import { cn } from './utils';

type ButtonVariant = 'default' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({ className, variant = 'default', size = 'md', ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        styles.button,
        variant === 'default' && styles.buttonDefault,
        variant === 'outline' && styles.buttonOutline,
        variant === 'ghost' && styles.buttonGhost,
        size === 'sm' ? styles.buttonSm : styles.buttonMd,
        className
      )}
      {...props}
    />
  );
}
