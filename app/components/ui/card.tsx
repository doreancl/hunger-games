import type { HTMLAttributes, ReactNode } from 'react';
import styles from './ui.module.css';

type SlotProps = HTMLAttributes<HTMLDivElement> & { children: ReactNode };

export function Card({ children, className, ...props }: SlotProps) {
  return (
    <div className={[styles.card, className].filter(Boolean).join(' ')} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className, ...props }: SlotProps) {
  return (
    <div className={[styles.cardHeader, className].filter(Boolean).join(' ')} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className, ...props }: HTMLAttributes<HTMLHeadingElement> & { children: ReactNode }) {
  return (
    <h2 className={[styles.cardTitle, className].filter(Boolean).join(' ')} {...props}>
      {children}
    </h2>
  );
}

export function CardDescription({ children, className, ...props }: HTMLAttributes<HTMLParagraphElement> & { children: ReactNode }) {
  return (
    <p className={[styles.cardDescription, className].filter(Boolean).join(' ')} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ children, className, ...props }: SlotProps) {
  return (
    <div className={[styles.cardContent, className].filter(Boolean).join(' ')} {...props}>
      {children}
    </div>
  );
}
