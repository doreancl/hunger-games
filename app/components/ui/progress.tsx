import type { HTMLAttributes } from 'react';
import styles from './primitives.module.css';
import { cn } from './utils';

type ProgressProps = HTMLAttributes<HTMLDivElement> & {
  value: number;
};

export function Progress({ value, className, ...props }: ProgressProps) {
  const boundedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={cn(styles.progress, className)} {...props}>
      <div
        className={styles.progressIndicator}
        style={{ transform: `scaleX(${boundedValue / 100})` }}
        aria-hidden="true"
      />
    </div>
  );
}
