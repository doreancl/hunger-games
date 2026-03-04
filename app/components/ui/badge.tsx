import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import styles from './ui.module.css';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'warning' | 'success';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        styles.badge,
        variant === 'secondary' && styles.badgeSecondary,
        variant === 'destructive' && styles.badgeDestructive,
        variant === 'warning' && styles.badgeWarning,
        variant === 'success' && styles.badgeSuccess,
        className
      )}
      {...props}
    />
  );
}
