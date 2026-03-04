import type { HTMLAttributes, ReactNode } from 'react';
import styles from './ui.module.css';

type AlertProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function Alert({ children, className, ...props }: AlertProps) {
  return (
    <div className={[styles.alert, className].filter(Boolean).join(' ')} role="status" {...props}>
      {children}
    </div>
  );
}

export function AlertDescription({ children, className, ...props }: HTMLAttributes<HTMLParagraphElement> & { children: ReactNode }) {
  return (
    <p className={[styles.alertDescription, className].filter(Boolean).join(' ')} {...props}>
      {children}
    </p>
  );
}
