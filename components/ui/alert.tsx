import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type AlertProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function Alert({ children, className, ...props }: AlertProps) {
  return (
    <div
      className={cn('rounded-md border bg-card px-4 py-3 text-sm text-card-foreground', className)}
      role="status"
      {...props}
    >
      {children}
    </div>
  );
}

export function AlertDescription({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement> & { children: ReactNode }) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)} {...props}>
      {children}
    </p>
  );
}
