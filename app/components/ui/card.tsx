import type { HTMLAttributes } from 'react';
import styles from './primitives.module.css';
import { cn } from './utils';

export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn(styles.card, className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(styles.cardContent, className)} {...props} />;
}
