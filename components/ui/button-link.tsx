import Link, { type LinkProps } from 'next/link';
import type { ReactNode } from 'react';
import { buttonVariants } from '@/components/ui/button';

type ButtonLinkProps = LinkProps & {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';
  size?: 'default' | 'md' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg';
};

export function ButtonLink({
  children,
  className,
  variant = 'default',
  size = 'md',
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={buttonVariants({ variant, size, className })} {...props}>
      {children}
    </Link>
  );
}
