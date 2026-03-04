import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import styles from './ui.module.css';

type ButtonVariant = 'default' | 'secondary' | 'outline' | 'destructive' | 'ghost';
type ButtonSize = 'default' | 'sm' | 'md';

type ButtonVariantOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
};

export function buttonVariants({
  variant = 'default',
  size = 'default',
  className
}: ButtonVariantOptions = {}): string {
  return cn(
    styles.button,
    variant === 'default'
      ? styles.buttonDefault
      : variant === 'secondary'
        ? styles.buttonSecondary
        : variant === 'outline'
          ? styles.buttonOutline
          : variant === 'destructive'
            ? styles.buttonDestructive
            : styles.buttonGhost,
    size === 'sm' ? styles.buttonSm : styles.buttonMd,
    className
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({ className, type = 'button', variant, size, ...props }: ButtonProps) {
  return <button type={type} className={buttonVariants({ variant, size, className })} {...props} />;
}
