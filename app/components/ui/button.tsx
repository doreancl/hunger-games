import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import styles from './ui.module.css';

type ButtonVariant = 'default' | 'secondary';
type ButtonSize = 'default' | 'sm';

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
    variant === 'default' ? styles.buttonDefault : styles.buttonSecondary,
    size === 'sm' ? styles.buttonSm : undefined,
    className
  );
}

export function Button({ className, type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={buttonVariants({ className })} {...props} />;
}
