import Link, { type LinkProps } from 'next/link';
import type { ReactNode } from 'react';
import styles from './ui.module.css';

type ButtonLinkVariant = 'default' | 'outline' | 'destructive';
type ButtonLinkSize = 'sm' | 'md';

type ButtonLinkProps = LinkProps & {
  children: ReactNode;
  className?: string;
  variant?: ButtonLinkVariant;
  size?: ButtonLinkSize;
};

const variantClassName: Record<ButtonLinkVariant, string> = {
  default: styles.buttonDefault,
  outline: styles.buttonOutline,
  destructive: styles.buttonDestructive
};

const sizeClassName: Record<ButtonLinkSize, string> = {
  sm: styles.buttonSm,
  md: styles.buttonMd
};

export function ButtonLink({ children, className, variant = 'default', size = 'md', ...props }: ButtonLinkProps) {
  const classes = [styles.button, variantClassName[variant], sizeClassName[size], className]
    .filter(Boolean)
    .join(' ');

  return (
    <Link className={classes} {...props}>
      {children}
    </Link>
  );
}
