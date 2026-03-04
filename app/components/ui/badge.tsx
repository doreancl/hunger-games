import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import styles from './ui.module.css';

type BadgeVariant = 'default' | 'secondary';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(styles.badge, variant === 'secondary' ? styles.badgeSecondary : undefined, className)}
      {...props}
    />
  );
}
