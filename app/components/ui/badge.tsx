import type { HTMLAttributes } from 'react';
import styles from './primitives.module.css';
import { cn } from './utils';

type BadgeVariant = 'secondary' | 'destructive' | 'warning' | 'success';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

export function Badge({ className, variant = 'secondary', ...props }: BadgeProps) {
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
