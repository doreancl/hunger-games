import type { LabelHTMLAttributes, ReactNode } from 'react';
import styles from './ui.module.css';

type LabelProps = LabelHTMLAttributes<HTMLLabelElement> & {
  children: ReactNode;
};

export function Label({ children, className, ...props }: LabelProps) {
  return (
    <label className={[styles.label, className].filter(Boolean).join(' ')} {...props}>
      {children}
    </label>
  );
}
