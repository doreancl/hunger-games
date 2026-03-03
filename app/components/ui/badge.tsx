import type { HTMLAttributes, ReactNode } from 'react';
import styles from './ui.module.css';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
};

export function Badge({ children, className, ...props }: BadgeProps) {
  return (
    <span className={[styles.badge, styles.badgeSecondary, className].filter(Boolean).join(' ')} {...props}>
      {children}
    </span>
  );
}
